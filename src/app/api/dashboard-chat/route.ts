import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import {
  MODELS,
  classifyOpenAIError,
  cooldownReason,
  isInCooldown,
  isOpenAIConfigured,
  openai,
  recordOpenAIError,
} from "@/lib/openai";
import { FALLBACK_ANSWER, findBestAnswer } from "@/lib/chatbot-knowledge";
import { formatDateTime, formatUSD } from "@/lib/utils";
import type { ChatCompletionMessageParam } from "openai/resources/chat/completions";

const KEYWORD_MIN_SCORE = 0.6;

/**
 * Looks up the customer message against the shipped TOPICS knowledge base
 * (used by the marketing chatbot). Returned only when AI is unavailable so
 * common product questions still work offline.
 */
function keywordFallback(message: string): string | null {
  const { topic, score } = findBestAnswer(message);
  if (topic && score >= KEYWORD_MIN_SCORE) return topic.answer;
  return null;
}

/**
 * AI-powered dashboard assistant. Scoped to the signed-in customer:
 *  • Auth is enforced at the route level, so tool implementations always
 *    use the verified `userId` rather than anything from the model.
 *  • Tools wrap narrow Prisma queries — the model can ask for the
 *    customer's own profiles, transactions, or tasks, but cannot reach
 *    other customers' data.
 * Without OPENAI_API_KEY the route returns a graceful fallback so the
 * UI can still render in dev environments.
 */

export const runtime = "nodejs";

const MAX_TOOL_ITERATIONS = 4;

const SYSTEM_PROMPT = `You are "Routey", the StableRoute in-dashboard assistant.
You help the signed-in customer understand THEIR account: profiles, transactions,
withdrawal addresses, fees, settlement timing, and pending follow-up tasks.

Rules:
- Use the provided tools to look up the customer's real data before answering
  anything specific about their account ("my latest transaction", "how much
  have I received this month", etc.). Never invent transaction IDs or numbers.
- Money values returned by tools are already formatted in USD.
- If a question is generic ("how fast is settlement?") answer from product
  knowledge without calling tools.
- If the customer asks to change their withdrawal address, explain that they
  can request the change from the Profiles page and that an admin must
  approve it before it goes live.
- Keep replies under 120 words. Be friendly, concrete, and never speculate.`;

const TOOLS = [
  {
    type: "function" as const,
    function: {
      name: "list_profiles",
      description:
        "List the signed-in customer's own profiles, including bank assignment and withdrawal address.",
      parameters: { type: "object", properties: {}, additionalProperties: false },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "list_recent_transactions",
      description:
        "List the customer's most recent transactions (up to 10), newest first.",
      parameters: {
        type: "object",
        properties: {
          status: {
            type: "string",
            enum: ["ANY", "SCHEDULED", "PENDING", "COMPLETED", "REFUNDED", "CANCELLED"],
            description: "Filter to one status. Use 'ANY' for no filter.",
          },
        },
        additionalProperties: false,
      },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "transaction_summary",
      description:
        "Returns the customer's total completed inbound USD, count of pending transfers, and account age.",
      parameters: { type: "object", properties: {}, additionalProperties: false },
    },
  },
  {
    type: "function" as const,
    function: {
      name: "pending_address_change",
      description:
        "If any of the customer's profiles has a pending withdrawal-address change awaiting admin approval, returns its details.",
      parameters: { type: "object", properties: {}, additionalProperties: false },
    },
  },
];

async function runTool(
  name: string,
  args: Record<string, unknown>,
  userId: string,
): Promise<unknown> {
  if (name === "list_profiles") {
    const profiles = await prisma.customerProfile.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      select: {
        firstName: true,
        lastName: true,
        senderName: true,
        accountCurrency: true,
        status: true,
        withdrawalAddress: true,
        bankName: true,
        accountNumber: true,
        transferMethod: true,
        pendingWithdrawalAddress: true,
      },
    });
    return profiles.map((p) => ({
      name: `${p.firstName} ${p.lastName}`,
      sender: p.senderName,
      currency: p.accountCurrency,
      status: p.status,
      withdrawalAddress: p.withdrawalAddress,
      bank: p.bankName ?? null,
      accountLast4: p.accountNumber
        ? p.accountNumber.replace(/\D/g, "").slice(-4)
        : null,
      transferMethod: p.transferMethod,
      hasPendingAddressChange: Boolean(p.pendingWithdrawalAddress),
    }));
  }

  if (name === "list_recent_transactions") {
    const raw = (args.status as string | undefined) ?? "ANY";
    const where =
      raw && raw !== "ANY"
        ? { userId, status: raw as "SCHEDULED" | "PENDING" | "COMPLETED" | "REFUNDED" | "CANCELLED" }
        : { userId };
    const rows = await prisma.transaction.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: 10,
      select: {
        reference: true,
        amountCents: true,
        type: true,
        status: true,
        senderName: true,
        createdAt: true,
        completedAt: true,
      },
    });
    return rows.map((t) => ({
      reference: t.reference,
      amount: formatUSD(t.amountCents),
      type: t.type,
      status: t.status,
      sender: t.senderName,
      createdAt: formatDateTime(t.createdAt),
      completedAt: t.completedAt ? formatDateTime(t.completedAt) : null,
    }));
  }

  if (name === "transaction_summary") {
    const [completed, pending, customer] = await Promise.all([
      prisma.transaction.aggregate({
        where: { userId, status: "COMPLETED" },
        _sum: { amountCents: true },
        _count: true,
      }),
      prisma.transaction.count({ where: { userId, status: "PENDING" } }),
      prisma.user.findUnique({
        where: { id: userId },
        select: { createdAt: true },
      }),
    ]);
    const accountAgeDays = customer
      ? Math.floor(
          (Date.now() - customer.createdAt.getTime()) / (24 * 60 * 60 * 1000),
        )
      : 0;
    return {
      completedTotal: formatUSD(completed._sum.amountCents ?? 0),
      completedCount: completed._count,
      pendingCount: pending,
      accountAgeDays,
    };
  }

  if (name === "pending_address_change") {
    const p = await prisma.customerProfile.findFirst({
      where: { userId, pendingWithdrawalAddress: { not: null } },
      select: {
        firstName: true,
        lastName: true,
        withdrawalAddress: true,
        pendingWithdrawalAddress: true,
        pendingWithdrawalRequestedAt: true,
      },
    });
    if (!p) return { hasPending: false };
    return {
      hasPending: true,
      profile: `${p.firstName} ${p.lastName}`,
      liveAddress: p.withdrawalAddress,
      requestedAddress: p.pendingWithdrawalAddress,
      submittedAt: p.pendingWithdrawalRequestedAt
        ? formatDateTime(p.pendingWithdrawalRequestedAt)
        : null,
    };
  }

  return { error: `Unknown tool: ${name}` };
}

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
  const message = (body as { message?: unknown })?.message;
  const history = (body as { history?: unknown })?.history;
  if (typeof message !== "string" || message.trim().length === 0) {
    return NextResponse.json({ error: "Message required" }, { status: 400 });
  }
  if (message.length > 1_000) {
    return NextResponse.json({ error: "Message too long" }, { status: 400 });
  }

  if (!isOpenAIConfigured) {
    return NextResponse.json({
      answer:
        keywordFallback(message) ??
        "The assistant isn't fully configured on this environment yet. You can still navigate to Profiles, Transactions, and Settings from the sidebar.",
      degraded: "no-key",
    });
  }

  // Skip the upstream call entirely while we're in the post-quota cooldown.
  // Returns 200 with a friendly note + keyword fallback so the UI doesn't
  // show a network error and common questions still get answered.
  if (isInCooldown()) {
    const fb = keywordFallback(message);
    return NextResponse.json({
      answer:
        fb ??
        `The AI assistant is temporarily paused (${
          cooldownReason() ?? "rate limited"
        }). I can still answer common product questions or you can use the sidebar.`,
      degraded: cooldownReason() ?? "cooldown",
    });
  }

  const messages: ChatCompletionMessageParam[] = [
    { role: "system", content: SYSTEM_PROMPT },
  ];
  if (Array.isArray(history)) {
    for (const h of history.slice(-12)) {
      const role = (h as { role?: unknown })?.role;
      const text = (h as { content?: unknown })?.content;
      if (
        (role === "user" || role === "assistant") &&
        typeof text === "string"
      ) {
        messages.push({ role, content: text });
      }
    }
  }
  messages.push({ role: "user", content: message });

  try {
    for (let i = 0; i < MAX_TOOL_ITERATIONS; i++) {
      const completion = await openai.chat.completions.create({
        model: MODELS.chat,
        temperature: 0.4,
        messages,
        tools: TOOLS,
      });
      const choice = completion.choices[0]?.message;
      if (!choice) break;
      messages.push(choice);

      const toolCalls = choice.tool_calls ?? [];
      if (toolCalls.length === 0) {
        return NextResponse.json({
          answer: choice.content ?? "",
        });
      }

      for (const call of toolCalls) {
        // Discriminate function calls from any future custom tool variants.
        if (call.type !== "function") continue;
        let args: Record<string, unknown> = {};
        try {
          args = JSON.parse(call.function.arguments || "{}");
        } catch {
          args = {};
        }
        const out = await runTool(call.function.name, args, userId);
        messages.push({
          role: "tool",
          tool_call_id: call.id,
          content: JSON.stringify(out),
        });
      }
    }
    return NextResponse.json({
      answer:
        "I couldn't finish answering that — please try rephrasing or open the page directly.",
    });
  } catch (err) {
    console.error("[dashboard-chat] failed:", err);
    recordOpenAIError(err);
    const { kind } = classifyOpenAIError(err);
    // Try the offline knowledge base before the generic apology so the
    // customer still gets a useful answer when AI is down.
    const fb = keywordFallback(message);
    if (fb) {
      return NextResponse.json({
        answer: fb,
        degraded: kind,
      });
    }
    const friendly =
      kind === "quota"
        ? "The AI assistant is currently unavailable — the platform's OpenAI quota is exhausted. Please contact support, or use the sidebar to navigate."
        : kind === "ratelimit"
          ? "The assistant is rate limited right now. Please try again in a minute."
          : kind === "auth"
            ? "The assistant isn't configured correctly on this environment. Please contact support."
            : FALLBACK_ANSWER;
    // Return 200 so the chat panel renders the message instead of a generic
    // network-error toast. The server has already logged the underlying cause.
    return NextResponse.json({ answer: friendly, degraded: kind });
  }
}
