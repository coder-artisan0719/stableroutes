import { randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";

// Unambiguous alphabet — no I/O/0/1 — for short, readable referral codes.
const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

/** A random, human-readable referral code (e.g. "K7M2QP9X"). */
export function generateReferralCode(length = 8): string {
  const bytes = randomBytes(length);
  let code = "";
  for (let i = 0; i < length; i++) {
    code += CODE_ALPHABET[bytes[i] % CODE_ALPHABET.length];
  }
  return code;
}

/**
 * Referral reward tier from the number of *qualified* referrals — referred
 * customers who have made at least one transaction. The percentage is a
 * discount applied to the referrer's commission fee:
 *   1–10 → 0.5pp   ·   11–20 → 1pp   ·   21–50 → 2pp   ·   51+ → 2.5pp
 */
export function referralTier(qualifiedReferrals: number): {
  discountPct: number;
  label: string;
} {
  if (qualifiedReferrals >= 51) {
    return { discountPct: 2.5, label: "51+ referrals" };
  }
  if (qualifiedReferrals >= 21) {
    return { discountPct: 2, label: "21–50 referrals" };
  }
  if (qualifiedReferrals >= 11) {
    return { discountPct: 1, label: "11–20 referrals" };
  }
  if (qualifiedReferrals >= 1) {
    return { discountPct: 0.5, label: "1–10 referrals" };
  }
  return { discountPct: 0, label: "No referrals yet" };
}

/** Number of referred customers who have made at least one transaction. */
export function countQualifiedReferrals(userId: string): Promise<number> {
  return prisma.user.count({
    where: { referredById: userId, transactions: { some: {} } },
  });
}

/** The commission-fee discount (percentage points) a user has earned. */
export async function referralDiscountForUser(userId: string): Promise<number> {
  const qualified = await countQualifiedReferrals(userId);
  return referralTier(qualified).discountPct;
}

/** A base commission rate with a referral discount applied, floored at 0%. */
export function effectiveCommissionPct(
  baseCommissionPct: number,
  discountPct: number,
): number {
  return Math.max(0, baseCommissionPct - discountPct);
}

/** Returns the user's referral code, generating and storing one if missing. */
export async function ensureReferralCode(userId: string): Promise<string> {
  const existing = await prisma.user.findUnique({
    where: { id: userId },
    select: { referralCode: true },
  });
  if (existing?.referralCode) return existing.referralCode;

  for (let attempt = 0; attempt < 6; attempt++) {
    try {
      const updated = await prisma.user.update({
        where: { id: userId },
        data: { referralCode: generateReferralCode() },
        select: { referralCode: true },
      });
      return updated.referralCode as string;
    } catch {
      // Unique-constraint collision (rare) — retry with a fresh code.
    }
  }
  throw new Error("Could not generate a unique referral code");
}
