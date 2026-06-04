import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import {
  MODELS,
  classifyOpenAIError,
  isInCooldown,
  isOpenAIConfigured,
  openai,
  recordOpenAIError,
} from "@/lib/openai";
import { formatUSD } from "@/lib/utils";

/**
 * One-paragraph account summary shown at the top of the customer dashboard.
 *
 * COST CONTROL:
 * - The model is NOT called automatically on page load. The default
 *   response is a free templated summary computed from aggregates.
 * - Set `?force=1` to opt in to an AI summary (the customer-facing
 *   "Generate AI insight" button does this).
 * - Generated AI summaries are cached in-process per user for 6 hours so
 *   subsequent clicks reuse the same answer at zero cost.
 *
 * PRIVACY:
 * - The model receives compact aggregates (counts + sums) — never raw rows
 *   or descriptions — so no transaction text leaves the database.
 */

export const runtime = "nodejs";

const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours
const cache = new Map<string, { summary: string; expiresAt: number }>();

function readCache(userId: string): string | null {
  const hit = cache.get(userId);
  if (!hit) return null;
  if (hit.expiresAt < Date.now()) {
    cache.delete(userId);
    return null;
  }
  return hit.summary;
}

function writeCache(userId: string, summary: string) {
  cache.set(userId, { summary, expiresAt: Date.now() + CACHE_TTL_MS });
}

export async function GET(request: Request) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "CUSTOMER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.id;
  const force = new URL(request.url).searchParams.get("force") === "1";

  // Last 30 days vs prior 30 days, so we can quantify "up from / down from".
  const now = Date.now();
  const day = 24 * 60 * 60 * 1000;
  const last30Start = new Date(now - 30 * day);
  const prev30Start = new Date(now - 60 * day);

  const [
    currCompleted,
    prevCompleted,
    currPending,
    profileCount,
    pendingProfileChange,
  ] = await Promise.all([
    prisma.transaction.aggregate({
      where: {
        userId,
        status: "COMPLETED",
        completedAt: { gte: last30Start },
      },
      _sum: { amountCents: true },
      _count: true,
    }),
    prisma.transaction.aggregate({
      where: {
        userId,
        status: "COMPLETED",
        completedAt: { gte: prev30Start, lt: last30Start },
      },
      _sum: { amountCents: true },
      _count: true,
    }),
    prisma.transaction.count({
      where: { userId, status: "PENDING" },
    }),
    prisma.customerProfile.count({ where: { userId } }),
    prisma.customerProfile.count({
      where: { userId, pendingWithdrawalAddress: { not: null } },
    }),
  ]);

  const aggregates = {
    completedLast30Total: currCompleted._sum.amountCents ?? 0,
    completedLast30Count: currCompleted._count,
    completedPrev30Total: prevCompleted._sum.amountCents ?? 0,
    completedPrev30Count: prevCompleted._count,
    pendingCount: currPending,
    profileCount,
    pendingProfileChange,
  };

  // Templated fallback used by default — costs nothing.
  const templated = templatedSummary(aggregates);

  // Default path: no force flag → return cached AI text if we have one,
  // otherwise return the templated free version. Never calls OpenAI.
  if (!force) {
    const cached = readCache(userId);
    return NextResponse.json({
      summary: cached ?? templated,
      aiUsed: Boolean(cached),
      cached: Boolean(cached),
      aggregates,
    });
  }

  // Force path → user clicked "Generate AI insight". Still honor the cache
  // so a second click within 6h returns the same text without a new call.
  const cached = readCache(userId);
  if (cached) {
    return NextResponse.json({
      summary: cached,
      aiUsed: true,
      cached: true,
      aggregates,
    });
  }

  if (!isOpenAIConfigured || isInCooldown()) {
    return NextResponse.json({
      summary: templated,
      aiUsed: false,
      aggregates,
    });
  }

  try {
    const completion = await openai.chat.completions.create({
      model: MODELS.scoring,
      temperature: 0.4,
      max_tokens: 200,
      messages: [
        {
          role: "system",
          content: `You write the daily account-summary card for a USD-to-USDC
settlement product. Keep it under 50 words and 2 sentences. Write in second
person. Be concrete: include numbers, money, and direction (up/down). Don't
hype. Don't use emoji. Don't repeat numbers verbatim from input — round to
readable values where useful. Never invent details.`,
        },
        {
          role: "user",
          content: `Summarise this customer's last 30 days of activity:

Last 30 days completed: ${aggregates.completedLast30Count} transfers, ${formatUSD(
            aggregates.completedLast30Total,
          )}
Prior 30 days completed: ${aggregates.completedPrev30Count} transfers, ${formatUSD(
            aggregates.completedPrev30Total,
          )}
Currently pending: ${aggregates.pendingCount}
Profiles set up: ${aggregates.profileCount}
Withdrawal-address change awaiting admin: ${aggregates.pendingProfileChange > 0 ? "yes" : "no"}`,
        },
      ],
    });
    const answer = completion.choices[0]?.message?.content?.trim();
    if (answer && answer.length > 0) writeCache(userId, answer);
    return NextResponse.json({
      summary: answer && answer.length > 0 ? answer : templated,
      aiUsed: Boolean(answer && answer.length > 0),
      cached: false,
      aggregates,
    });
  } catch (err) {
    console.error("[dashboard-insights] failed:", err);
    recordOpenAIError(err);
    const { kind } = classifyOpenAIError(err);
    return NextResponse.json({
      summary: templated,
      aiUsed: false,
      degraded: kind,
      aggregates,
    });
  }
}

function templatedSummary(a: {
  completedLast30Total: number;
  completedLast30Count: number;
  completedPrev30Total: number;
  completedPrev30Count: number;
  pendingCount: number;
  profileCount: number;
  pendingProfileChange: number;
}) {
  const parts: string[] = [];
  if (a.completedLast30Count > 0) {
    parts.push(
      `Last 30 days: ${a.completedLast30Count} settled transfer${
        a.completedLast30Count === 1 ? "" : "s"
      } totalling ${formatUSD(a.completedLast30Total)}.`,
    );
  } else {
    parts.push("No transfers settled in the last 30 days.");
  }
  if (a.pendingCount > 0) {
    parts.push(
      `${a.pendingCount} transfer${
        a.pendingCount === 1 ? " is" : "s are"
      } currently pending.`,
    );
  }
  if (a.pendingProfileChange > 0) {
    parts.push("A withdrawal-address change is awaiting admin approval.");
  }
  return parts.join(" ");
}
