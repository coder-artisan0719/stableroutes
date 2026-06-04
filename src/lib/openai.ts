import OpenAI from "openai";

/**
 * Shared OpenAI client + safe-call wrappers. All AI features in the app go
 * through here so a single env switch (OPENAI_API_KEY) turns them on/off
 * without each call-site needing to remember to guard. Without a key, every
 * helper degrades to a benign no-op so the rest of the app keeps working.
 *
 * Models are pinned by purpose: cheap, fast inference for scoring and chat,
 * a larger model for the structured smart-search intent extraction. The
 * IDs here can be swapped centrally without touching call-sites.
 */

const apiKey = process.env.OPENAI_API_KEY?.trim();

export const isOpenAIConfigured = Boolean(apiKey);

export const openai = apiKey
  ? new OpenAI({ apiKey })
  : (null as unknown as OpenAI);

export const MODELS = {
  /** Fast + cheap; used for inline risk scoring and anomaly detection. */
  scoring: "gpt-4o-mini",
  /** Customer-facing chatbot — needs reliable tool-calling. */
  chat: "gpt-4o-mini",
  /** Smart-search intent parsing; small but reliable. */
  search: "gpt-4o-mini",
} as const;

/**
 * When OpenAI returns quota / rate-limit errors we stop hitting the API for
 * a short cooldown. This prevents every transaction-create, address-change,
 * search query and chatbot turn from independently spending 1–4s waiting
 * for the same 429 — and from racking up a per-request charge once the
 * account is reactivated mid-cooldown. The state is in-process memory so
 * each dev/server instance recovers independently after a restart.
 */
const COOLDOWN_MS = 10 * 60 * 1000; // 10 minutes
let cooldownUntil = 0;
let lastCooldownReason: string | null = null;

export function isInCooldown(): boolean {
  return Date.now() < cooldownUntil;
}

export function cooldownReason(): string | null {
  return isInCooldown() ? lastCooldownReason : null;
}

function tripCooldown(reason: string) {
  cooldownUntil = Date.now() + COOLDOWN_MS;
  lastCooldownReason = reason;
  console.warn(
    `[openai] cooldown engaged (${Math.round(COOLDOWN_MS / 60_000)}m): ${reason}`,
  );
}

type ErrShape = {
  status?: number;
  code?: string;
  type?: string;
  message?: string;
};

/**
 * Inspects a thrown OpenAI error and trips the cooldown for quota /
 * rate-limit failures. Other errors (network blips, malformed responses)
 * don't trip the cooldown so they get retried on the next call.
 */
function maybeTripCooldown(err: unknown) {
  const e = err as ErrShape;
  if (e?.status === 429 || e?.code === "insufficient_quota") {
    tripCooldown(
      e.code === "insufficient_quota"
        ? "OpenAI account quota exhausted"
        : "OpenAI rate limited",
    );
  } else if (e?.code === "invalid_api_key" || e?.status === 401) {
    // Don't burn cycles retrying a bad key — cool down for the full window.
    tripCooldown("OpenAI API key rejected");
  }
}

/**
 * Wraps an OpenAI call with a timeout + try/catch. AI is treated as a
 * best-effort signal: if it errors or hangs, we log and return null so the
 * surrounding business action (create transaction, request address change)
 * still completes successfully. Honors the cooldown set by previous quota
 * failures so we don't keep hammering a dead key.
 */
export async function safeOpenAI<T>(
  fn: () => Promise<T>,
  opts: { timeoutMs?: number; label?: string } = {},
): Promise<T | null> {
  if (!isOpenAIConfigured) return null;
  if (isInCooldown()) return null;
  const timeoutMs = opts.timeoutMs ?? 8_000;
  try {
    const timeout = new Promise<never>((_, reject) =>
      setTimeout(
        () => reject(new Error(`OpenAI ${opts.label ?? "call"} timed out`)),
        timeoutMs,
      ),
    );
    return await Promise.race([fn(), timeout]);
  } catch (err) {
    maybeTripCooldown(err);
    console.error(
      `[openai] ${opts.label ?? "call"} failed:`,
      err instanceof Error ? err.message : err,
    );
    return null;
  }
}

/**
 * For the routes that DON'T use safeOpenAI (chatbot + smart-search talk to
 * OpenAI directly because they need streaming/tool-call semantics), call
 * this from their `catch` block so they share the same cooldown bookkeeping.
 */
export function recordOpenAIError(err: unknown) {
  maybeTripCooldown(err);
}

export function classifyOpenAIError(err: unknown): {
  kind: "quota" | "ratelimit" | "auth" | "other";
  retryAfterSeconds: number | null;
} {
  const e = err as ErrShape & { headers?: { get?: (k: string) => string | null } };
  if (e?.code === "insufficient_quota") return { kind: "quota", retryAfterSeconds: null };
  if (e?.status === 429) {
    return { kind: "ratelimit", retryAfterSeconds: 60 };
  }
  if (e?.code === "invalid_api_key" || e?.status === 401)
    return { kind: "auth", retryAfterSeconds: null };
  return { kind: "other", retryAfterSeconds: null };
}

/**
 * Parses a JSON object out of a chat-completion response, tolerating model
 * responses that include surrounding prose or markdown fences.
 */
export function parseJsonObject<T = unknown>(raw: string | null): T | null {
  if (!raw) return null;
  const cleaned = raw
    .replace(/^```(?:json)?\s*/i, "")
    .replace(/```\s*$/i, "")
    .trim();
  // Find the first { ... matching } so we tolerate prose before/after.
  const start = cleaned.indexOf("{");
  const end = cleaned.lastIndexOf("}");
  if (start === -1 || end === -1 || end < start) return null;
  try {
    return JSON.parse(cleaned.slice(start, end + 1)) as T;
  } catch {
    return null;
  }
}
