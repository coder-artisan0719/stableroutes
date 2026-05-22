import crypto from "crypto";
import { cookies } from "next/headers";

// Server-only: this module reads request cookies and the server environment.
// It must never be imported from a client component.

export const REVENUE_COOKIE = "revenue_unlock";
export const REVENUE_COOKIE_PATH = "/admin/revenue";
/** How long an unlocked session lasts before the passcode must be re-entered. */
export const REVENUE_UNLOCK_MAX_AGE = 60 * 60; // 1 hour

function gateSecret(): string {
  return process.env.AUTH_SECRET ?? "stableroute-revenue-gate";
}

export function isRevenuePasscodeSet(): boolean {
  return Boolean(process.env.REVENUE_PASSCODE);
}

/**
 * The HMAC token a valid unlock cookie must carry. Derived from the passcode
 * and the server secret, so the cookie cannot be forged without knowing the
 * passcode — and cannot be brute-forced offline without the server secret.
 * Returns null when no passcode is configured.
 */
export function revenueUnlockToken(): string | null {
  const passcode = process.env.REVENUE_PASSCODE;
  if (!passcode) return null;
  return crypto
    .createHmac("sha256", gateSecret())
    .update(passcode)
    .digest("hex");
}

/** Constant-time string comparison that tolerates length mismatches. */
function safeEqual(a: string, b: string): boolean {
  const ab = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ab.length !== bb.length) return false;
  return crypto.timingSafeEqual(ab, bb);
}

export function passcodeMatches(submitted: string): boolean {
  const passcode = process.env.REVENUE_PASSCODE;
  if (!passcode) return false;
  return safeEqual(submitted, passcode);
}

/** Whether the current request carries a valid revenue unlock cookie. */
export function isRevenueUnlocked(): boolean {
  const token = revenueUnlockToken();
  if (!token) return false;
  const cookie = cookies().get(REVENUE_COOKIE)?.value;
  if (!cookie) return false;
  return safeEqual(cookie, token);
}
