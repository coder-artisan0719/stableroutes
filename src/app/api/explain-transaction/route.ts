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
import { formatDateTime, formatUSD } from "@/lib/utils";

/**
 * Plain-English transaction explainer. Auth is enforced so a customer can
 * only ever explain transactions on their own profiles — the model receives
 * a small object of pre-formatted fields, never the raw row, so admin notes
 * don't leak even by accident.
 */

export const runtime = "nodejs";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "CUSTOMER") {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const userId = session.user.id;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const id = (body as { id?: unknown })?.id;
  if (typeof id !== "string" || id.length === 0) {
    return NextResponse.json({ error: "Transaction id required" }, { status: 400 });
  }

  const tx = await prisma.transaction.findUnique({
    where: { id },
    include: {
      profile: { select: { firstName: true, lastName: true } },
    },
  });
  if (!tx || tx.userId !== userId) {
    return NextResponse.json({ error: "Transaction not found" }, { status: 404 });
  }

  const baseFields = {
    amount: formatUSD(tx.amountCents),
    type: tx.type,
    status: tx.status,
    sender: tx.senderName,
    profile: `${tx.profile.firstName} ${tx.profile.lastName}`,
    createdAt: formatDateTime(tx.createdAt),
    completedAt: tx.completedAt ? formatDateTime(tx.completedAt) : null,
    scheduledFor: tx.scheduledFor ? formatDateTime(tx.scheduledFor) : null,
    refundedAt: tx.refundedAt ? formatDateTime(tx.refundedAt) : null,
    description: tx.description ?? null,
    commissionPct: tx.commissionPct,
    txHash: tx.txHash ?? null,
  };

  const fallback = templatedExplanation(baseFields);

  if (!isOpenAIConfigured || isInCooldown()) {
    return NextResponse.json({ explanation: fallback, aiUsed: false });
  }

  try {
    const completion = await openai.chat.completions.create({
      model: MODELS.scoring,
      temperature: 0.4,
      max_tokens: 350,
      messages: [
        {
          role: "system",
          content: `You explain a single transaction to a customer on a USD-to-USDC
settlement product. Be friendly and concrete. 3 short paragraphs MAX (or 1 if
that's enough).
- Paragraph 1: what this transfer IS in plain language.
- Paragraph 2: what's happening right now and what to expect next (settlement
  timing, fees, what they'll see in their wallet).
- Paragraph 3 (only when relevant): what they should DO — wait, take action,
  contact support.
Use second person. No emojis. Don't recite all fields back — pick the ones
that matter for THIS status. Never invent details not provided. Settlement
target: USDC on Base. ACH takes 1-3 business days to clear; Wire same-day.
Once cleared, conversion is ~60 seconds.`,
        },
        {
          role: "user",
          content: `Explain this transaction:
${JSON.stringify(baseFields, null, 2)}`,
        },
      ],
    });
    const answer = completion.choices[0]?.message?.content?.trim();
    return NextResponse.json({
      explanation: answer && answer.length > 0 ? answer : fallback,
      aiUsed: Boolean(answer && answer.length > 0),
    });
  } catch (err) {
    console.error("[explain-transaction] failed:", err);
    recordOpenAIError(err);
    const { kind } = classifyOpenAIError(err);
    return NextResponse.json({
      explanation: fallback,
      aiUsed: false,
      degraded: kind,
    });
  }
}

function templatedExplanation(t: {
  amount: string;
  type: string;
  status: string;
  sender: string;
  profile: string;
  createdAt: string;
  completedAt: string | null;
  scheduledFor: string | null;
  refundedAt: string | null;
  description: string | null;
  commissionPct: number;
  txHash: string | null;
}) {
  if (t.status === "COMPLETED") {
    return `${t.amount} from ${t.sender} arrived on ${t.profile} and was settled to USDC on Base${
      t.completedAt ? ` on ${t.completedAt}` : ""
    }.${t.commissionPct > 0 ? ` A ${t.commissionPct}% fee was applied.` : ""}${
      t.txHash ? " You can view the on-chain transfer on BaseScan." : ""
    }`;
  }
  if (t.status === "PENDING") {
    return `${t.amount} from ${t.sender} is being processed for ${t.profile}. ${
      t.type === "ACH"
        ? "ACH deposits usually clear within 1–3 business days."
        : "Wire transfers usually clear the same business day."
    } Once it clears, conversion to USDC on Base takes ~60 seconds.`;
  }
  if (t.status === "SCHEDULED") {
    return `${t.amount} from ${t.sender} is scheduled${
      t.scheduledFor ? ` for ${t.scheduledFor}` : ""
    } on ${t.profile}. We'll switch it to Pending automatically when it goes live.`;
  }
  if (t.status === "REFUNDED") {
    return `This ${t.amount} transfer was refunded${
      t.refundedAt ? ` on ${t.refundedAt}` : ""
    }. The funds were returned to the sender (${t.sender}).`;
  }
  return `This ${t.amount} transfer (${t.type}) from ${t.sender} on ${t.profile} is currently ${t.status.toLowerCase()}.`;
}
