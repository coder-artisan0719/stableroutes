import { NextResponse } from "next/server";
import type { Prisma } from "@prisma/client";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import {
  MODELS,
  isInCooldown,
  isOpenAIConfigured,
  openai,
  parseJsonObject,
  recordOpenAIError,
} from "@/lib/openai";
import { formatDateTime, formatUSD } from "@/lib/utils";

/**
 * AI-powered cross-table search for admins. The natural-language query is
 * first parsed by OpenAI into a constrained intent object:
 *   { entities: ["transaction" | "customer" | "profile" | "task"],
 *     keywords: string[], status: string|null, minAmountCents: number|null,
 *     maxAmountCents: number|null, daysBack: number|null }
 * Then we run focused Prisma queries — keyword OR-matched across the
 * relevant text columns. The model never produces raw SQL; the server
 * controls every query, which avoids prompt-injection turning into a
 * data-exfiltration vector. Top-N results from each table are returned.
 */

export const runtime = "nodejs";

const PER_ENTITY_LIMIT = 12;

type Intent = {
  entities: ("transaction" | "customer" | "profile" | "task")[];
  keywords: string[];
  status: string | null;
  /** Transaction transfer type — extracted from words like "wire" / "ACH". */
  txType: "ACH" | "WIRE" | null;
  minAmountCents: number | null;
  maxAmountCents: number | null;
  daysBack: number | null;
};

const DEFAULT_INTENT: Intent = {
  entities: ["transaction", "customer", "profile", "task"],
  keywords: [],
  status: null,
  txType: null,
  minAmountCents: null,
  maxAmountCents: null,
  daysBack: null,
};

async function parseIntent(query: string): Promise<Intent> {
  const completion = await openai.chat.completions.create({
    model: MODELS.search,
    temperature: 0.1,
    messages: [
      {
        role: "system",
        content: `Convert an admin's natural-language search into a strict JSON intent.

Allowed entities: "transaction", "customer", "profile", "task".
Allowed statuses (for transactions): SCHEDULED, PENDING, COMPLETED, REFUNDED, CANCELLED.
Allowed statuses (for profiles): PENDING, APPROVED, REJECTED.
Allowed statuses (for tasks): OPEN, SNOOZED, RESOLVED.
Allowed transaction types: ACH, WIRE.

Money amounts must be in CENTS (multiply dollars by 100).
"last 30 days" -> daysBack: 30. "this month" -> daysBack: 30. "this week" -> daysBack: 7.

CRITICAL: keywords are for free-text contains-match only. If a word maps to a
structured field, put it there and OMIT it from keywords. Specifically:
- "wire" / "wires" / "wired" -> txType: "WIRE"  (don't put in keywords)
- "ach" -> txType: "ACH"  (don't put in keywords)
- "completed" / "settled" / "paid" -> status: "COMPLETED"  (don't put in keywords)
- "pending" / "scheduled" / "refunded" / "cancelled" -> matching status
- "blocked" -> status: null but include customer entity
- numeric amounts -> minAmountCents / maxAmountCents
- "transfer" / "transaction" / "payment" are generic; do not put them in keywords either.
Use keywords ONLY for actual proper nouns / unstructured names (sender names,
emails, telegram handles, bank names, free-text descriptions).

Respond ONLY with JSON of the shape:
{
  "entities": [...],
  "keywords": [...],         // 0-4 entries; can be empty
  "status": "<STATUS> or null",
  "txType": "ACH" | "WIRE" | null,
  "minAmountCents": <int or null>,
  "maxAmountCents": <int or null>,
  "daysBack": <int or null>
}
No prose outside the JSON. No markdown fences.`,
      },
      { role: "user", content: query },
    ],
    response_format: { type: "json_object" },
  });
  const raw = completion.choices[0]?.message?.content ?? null;
  const parsed = parseJsonObject<Partial<Intent>>(raw);
  if (!parsed) return DEFAULT_INTENT;
  const intent: Intent = { ...DEFAULT_INTENT };
  if (Array.isArray(parsed.entities)) {
    intent.entities = parsed.entities.filter(
      (e): e is Intent["entities"][number] =>
        e === "transaction" ||
        e === "customer" ||
        e === "profile" ||
        e === "task",
    );
    if (intent.entities.length === 0) intent.entities = DEFAULT_INTENT.entities;
  }
  if (Array.isArray(parsed.keywords)) {
    intent.keywords = parsed.keywords
      .filter((k): k is string => typeof k === "string")
      .map((k) => k.trim())
      .filter((k) => k.length > 0)
      .slice(0, 6);
  }
  if (typeof parsed.status === "string") intent.status = parsed.status;
  if (parsed.txType === "ACH" || parsed.txType === "WIRE") {
    intent.txType = parsed.txType;
  }
  if (typeof parsed.minAmountCents === "number")
    intent.minAmountCents = Math.max(0, Math.round(parsed.minAmountCents));
  if (typeof parsed.maxAmountCents === "number")
    intent.maxAmountCents = Math.max(0, Math.round(parsed.maxAmountCents));
  if (typeof parsed.daysBack === "number" && parsed.daysBack > 0)
    intent.daysBack = Math.round(parsed.daysBack);
  return intent;
}

function keywordsToOR<F extends string>(
  keywords: string[],
  fields: F[],
): Array<Partial<Record<F, { contains: string; mode: "insensitive" }>>> {
  return keywords.flatMap((k) =>
    fields.map(
      (f) =>
        ({ [f]: { contains: k, mode: "insensitive" } }) as Partial<
          Record<F, { contains: string; mode: "insensitive" }>
        >,
    ),
  );
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const query = (body as { query?: unknown })?.query;
  if (typeof query !== "string" || query.trim().length === 0) {
    return NextResponse.json({ error: "Query required" }, { status: 400 });
  }
  if (query.length > 500) {
    return NextResponse.json({ error: "Query too long" }, { status: 400 });
  }

  // Track whether the intent came from AI so the UI can surface a fallback
  // notice when we silently degraded to plain keyword matching.
  let intent: Intent = DEFAULT_INTENT;
  let aiUsed = false;
  let fallbackReason: string | null = null;
  if (isOpenAIConfigured && !isInCooldown()) {
    try {
      intent = await parseIntent(query);
      aiUsed = true;
    } catch (err) {
      console.error("[smart-search] intent parsing failed:", err);
      recordOpenAIError(err);
      intent = { ...DEFAULT_INTENT, keywords: [query.trim()] };
      fallbackReason = "ai-error";
    }
  } else if (isOpenAIConfigured && isInCooldown()) {
    intent = { ...DEFAULT_INTENT, keywords: [query.trim()] };
    fallbackReason = "quota";
  } else {
    intent = { ...DEFAULT_INTENT, keywords: [query.trim()] };
    fallbackReason = "no-key";
  }

  const since = intent.daysBack
    ? new Date(Date.now() - intent.daysBack * 24 * 60 * 60 * 1000)
    : null;

  // Run scoped queries for each requested entity.
  const wants = (e: Intent["entities"][number]) => intent.entities.includes(e);

  const [transactions, profiles, customers, tasks] = await Promise.all([
    wants("transaction")
      ? prisma.transaction.findMany({
          where: {
            ...(since ? { createdAt: { gte: since } } : {}),
            ...(intent.minAmountCents != null
              ? { amountCents: { gte: intent.minAmountCents } }
              : {}),
            ...(intent.maxAmountCents != null
              ? {
                  amountCents: {
                    ...(intent.minAmountCents != null
                      ? { gte: intent.minAmountCents }
                      : {}),
                    lte: intent.maxAmountCents,
                  },
                }
              : {}),
            ...(intent.status &&
            ["SCHEDULED", "PENDING", "COMPLETED", "REFUNDED", "CANCELLED"].includes(
              intent.status,
            )
              ? {
                  status:
                    intent.status as
                      | "SCHEDULED"
                      | "PENDING"
                      | "COMPLETED"
                      | "REFUNDED"
                      | "CANCELLED",
                }
              : {}),
            ...(intent.txType ? { type: intent.txType } : {}),
            ...(intent.keywords.length > 0
              ? {
                  OR: keywordsToOR(intent.keywords, [
                    "senderName",
                    "description",
                    "adminNote",
                    "reference",
                  ]) as Prisma.TransactionWhereInput[],
                }
              : {}),
          },
          orderBy: { createdAt: "desc" },
          take: PER_ENTITY_LIMIT,
          include: {
            user: { select: { email: true } },
            profile: { select: { firstName: true, lastName: true } },
          },
        })
      : Promise.resolve([] as never[]),
    wants("profile")
      ? prisma.customerProfile.findMany({
          where: {
            ...(intent.status &&
            ["PENDING", "APPROVED", "REJECTED"].includes(intent.status)
              ? {
                  status: intent.status as "PENDING" | "APPROVED" | "REJECTED",
                }
              : {}),
            ...(intent.keywords.length > 0
              ? {
                  OR: keywordsToOR(intent.keywords, [
                    "firstName",
                    "lastName",
                    "senderName",
                    "bankName",
                    "withdrawalAddress",
                  ]) as Prisma.CustomerProfileWhereInput[],
                }
              : {}),
          },
          orderBy: { createdAt: "desc" },
          take: PER_ENTITY_LIMIT,
          include: { user: { select: { email: true } } },
        })
      : Promise.resolve([] as never[]),
    wants("customer")
      ? prisma.user.findMany({
          where: {
            role: "CUSTOMER",
            ...(intent.keywords.length > 0
              ? {
                  OR: keywordsToOR(intent.keywords, [
                    "email",
                    "name",
                    "telegramId",
                  ]) as Prisma.UserWhereInput[],
                }
              : {}),
          },
          orderBy: { createdAt: "desc" },
          take: PER_ENTITY_LIMIT,
          select: {
            id: true,
            email: true,
            name: true,
            telegramId: true,
            blocked: true,
            createdAt: true,
          },
        })
      : Promise.resolve([] as never[]),
    wants("task")
      ? prisma.adminTask.findMany({
          where: {
            ...(intent.status &&
            ["OPEN", "SNOOZED", "RESOLVED"].includes(intent.status)
              ? {
                  status:
                    intent.status as "OPEN" | "SNOOZED" | "RESOLVED",
                }
              : {}),
            ...(intent.keywords.length > 0
              ? {
                  OR: keywordsToOR(intent.keywords, [
                    "title",
                    "reason",
                    "notes",
                    "customerEmail",
                    "profileName",
                  ]) as Prisma.AdminTaskWhereInput[],
                }
              : {}),
          },
          orderBy: { createdAt: "desc" },
          take: PER_ENTITY_LIMIT,
        })
      : Promise.resolve([] as never[]),
  ]);

  return NextResponse.json({
    intent,
    aiUsed,
    fallbackReason,
    results: {
      transactions: transactions.map((t) => ({
        id: t.id,
        href: "/admin/transactions",
        title: `${formatUSD(t.amountCents)} · ${t.senderName}`,
        subtitle: `${t.user.email} · ${t.profile.firstName} ${t.profile.lastName}`,
        status: t.status,
        date: formatDateTime(t.createdAt),
        risk: t.riskScore,
      })),
      profiles: profiles.map((p) => ({
        id: p.id,
        href: "/admin/profiles",
        title: `${p.firstName} ${p.lastName}`,
        subtitle: `${p.user.email} · ${p.accountCurrency} account`,
        status: p.status,
        date: formatDateTime(p.createdAt),
        pendingChange: Boolean(p.pendingWithdrawalAddress),
      })),
      customers: customers.map((c) => ({
        id: c.id,
        href: "/admin/customers",
        title: c.email,
        subtitle: c.name ?? "—",
        telegram: c.telegramId,
        blocked: c.blocked,
        date: formatDateTime(c.createdAt),
      })),
      tasks: tasks.map((t) => ({
        id: t.id,
        href: "/admin/tasks",
        title: t.title,
        subtitle: t.customerEmail ?? "—",
        status: t.status,
        priority: t.priority,
        date: formatDateTime(t.createdAt),
      })),
    },
  });
}
