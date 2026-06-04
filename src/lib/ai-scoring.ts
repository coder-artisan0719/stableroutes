import { MODELS, openai, parseJsonObject, safeOpenAI } from "@/lib/openai";
import { formatUSD } from "@/lib/utils";

/**
 * AI-driven risk + anomaly scoring. Both helpers return a uniform
 * { score, reasons } shape so storing the result is consistent across
 * Transaction and CustomerProfile. Each model call is wrapped in
 * `safeOpenAI` so OpenAI failures degrade silently — risk-scoring is an
 * advisory signal, never a hard prerequisite for the customer action.
 */

export type RiskVerdict = {
  score: number; // 0–100, higher = more suspicious
  reasons: string[]; // 1–4 short bullet reasons
};

const RISK_SCHEMA_INSTRUCTION = `
Respond ONLY with strict JSON of the shape:
{ "score": <integer 0-100>, "reasons": ["<short bullet>", ...] }
- score: 0 = no concern, 100 = block immediately. Pick honestly.
- reasons: 1–4 concise bullets (max 90 characters each) explaining the score.
No prose outside the JSON. No markdown fences.`;

function clampScore(n: unknown): number | null {
  if (typeof n !== "number" || !Number.isFinite(n)) return null;
  return Math.max(0, Math.min(100, Math.round(n)));
}

function clampReasons(r: unknown): string[] {
  if (!Array.isArray(r)) return [];
  return r
    .filter((x): x is string => typeof x === "string")
    .map((x) => x.trim())
    .filter((x) => x.length > 0)
    .slice(0, 4);
}

/**
 * Scores a freshly created transaction for risk. Returns null on any OpenAI
 * failure (timeout, parse error, missing key) so the caller can skip
 * persisting the score without affecting the transaction.
 */
export async function scoreTransactionRisk(input: {
  amountCents: number;
  type: "ACH" | "WIRE";
  senderName: string;
  description: string | null;
  customerEmail: string;
  profileName: string;
  customerStats: {
    completedCount: number;
    totalCompletedCents: number;
    refundedCount: number;
    pendingCount: number;
    accountAgeDays: number;
    customerBlocked: boolean;
  };
}): Promise<RiskVerdict | null> {
  const result = await safeOpenAI(
    async () => {
      const completion = await openai.chat.completions.create({
        model: MODELS.scoring,
        temperature: 0.2,
        messages: [
          {
            role: "system",
            content: `You are a risk-scoring assistant for a USD-to-USDC settlement platform.
Score the likelihood that an incoming transaction is fraudulent, mis-attributed, or otherwise needs admin review.
Focus on these signals: amount vs customer history, sender name plausibility, account age,
prior refunds, currently-blocked accounts, transfer type vs amount, unusual description text.
${RISK_SCHEMA_INSTRUCTION}`,
          },
          {
            role: "user",
            content: `Score this incoming transaction:

Amount: ${formatUSD(input.amountCents)}
Type: ${input.type}
Sender name: ${input.senderName}
Description: ${input.description ?? "(none)"}
Customer email: ${input.customerEmail}
Profile: ${input.profileName}

Customer history:
- Account age: ${input.customerStats.accountAgeDays} days
- Account currently blocked: ${input.customerStats.customerBlocked ? "YES" : "no"}
- Completed transfers: ${input.customerStats.completedCount} totalling ${formatUSD(input.customerStats.totalCompletedCents)}
- Refunded transfers: ${input.customerStats.refundedCount}
- Currently pending transfers: ${input.customerStats.pendingCount}`,
          },
        ],
        response_format: { type: "json_object" },
      });
      return completion.choices[0]?.message?.content ?? null;
    },
    { label: "scoreTransactionRisk", timeoutMs: 6_000 },
  );

  const parsed = parseJsonObject<{ score?: unknown; reasons?: unknown }>(result);
  if (!parsed) return null;
  const score = clampScore(parsed.score);
  if (score === null) return null;
  return { score, reasons: clampReasons(parsed.reasons) };
}

/**
 * Scores a customer's withdrawal-address change request for anomalies. The
 * model is given both addresses, customer context, and any recent activity
 * so it can flag obvious red flags (drained-then-changed pattern, brand-new
 * account changing within hours of signup, etc.).
 */
export async function scoreAddressChangeAnomaly(input: {
  customerEmail: string;
  profileName: string;
  currentAddress: string;
  newAddress: string;
  accountAgeDays: number;
  recentLoginCountries: string[];
  recentCompletedCount: number;
  recentCompletedTotalCents: number;
  previouslyChangedCount: number;
  customerBlocked: boolean;
}): Promise<RiskVerdict | null> {
  const result = await safeOpenAI(
    async () => {
      const completion = await openai.chat.completions.create({
        model: MODELS.scoring,
        temperature: 0.2,
        messages: [
          {
            role: "system",
            content: `You evaluate withdrawal-address change requests on a stablecoin settlement platform.
Score the likelihood the change is fraudulent or unauthorised (e.g. account takeover, social engineering).
Pay attention to: brand-new accounts changing addresses, recent sign-ins from new countries,
multiple recent address changes, address that looks like a contract / known burn pattern.
${RISK_SCHEMA_INSTRUCTION}`,
          },
          {
            role: "user",
            content: `Evaluate this withdrawal-address change request:

Customer: ${input.customerEmail}
Profile: ${input.profileName}
Current live address: ${input.currentAddress}
Requested new address: ${input.newAddress}

Context:
- Account age: ${input.accountAgeDays} days
- Account currently blocked: ${input.customerBlocked ? "YES" : "no"}
- Recent sign-in countries: ${input.recentLoginCountries.length ? input.recentLoginCountries.join(", ") : "(none recorded)"}
- Completed transfers in the last 30 days: ${input.recentCompletedCount} totalling ${formatUSD(input.recentCompletedTotalCents)}
- Previous address-change requests on this profile: ${input.previouslyChangedCount}`,
          },
        ],
        response_format: { type: "json_object" },
      });
      return completion.choices[0]?.message?.content ?? null;
    },
    { label: "scoreAddressChangeAnomaly", timeoutMs: 6_000 },
  );

  const parsed = parseJsonObject<{ score?: unknown; reasons?: unknown }>(result);
  if (!parsed) return null;
  const score = clampScore(parsed.score);
  if (score === null) return null;
  return { score, reasons: clampReasons(parsed.reasons) };
}

/** Bucket score 0–100 into a UI-friendly severity label and color hint. */
export function riskBucket(score: number | null) {
  if (score == null)
    return {
      label: "Not scored",
      tone: "muted" as const,
      severity: "none" as const,
    };
  if (score >= 75)
    return { label: "High risk", tone: "destructive" as const, severity: "high" as const };
  if (score >= 45)
    return { label: "Elevated", tone: "warning" as const, severity: "medium" as const };
  if (score >= 20)
    return { label: "Low risk", tone: "default" as const, severity: "low" as const };
  return { label: "Clean", tone: "success" as const, severity: "clean" as const };
}
