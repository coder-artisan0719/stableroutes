"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth-guards";
import { prisma } from "@/lib/prisma";
import {
  REVENUE_COOKIE,
  REVENUE_COOKIE_PATH,
  REVENUE_UNLOCK_MAX_AGE,
  isRevenuePasscodeSet,
  isRevenueUnlocked,
  passcodeMatches,
  revenueUnlockToken,
} from "@/lib/revenue-gate";

type Result = { ok: boolean; error?: string };

/** Verify the passcode and, on success, set the unlock cookie. */
export async function unlockRevenue(passcode: string): Promise<Result> {
  await requireAdmin();
  if (!isRevenuePasscodeSet()) {
    return {
      ok: false,
      error: "Revenue passcode is not configured on the server.",
    };
  }
  if (!passcodeMatches(passcode.trim())) {
    return { ok: false, error: "Incorrect passcode." };
  }
  const token = revenueUnlockToken();
  if (!token) {
    return { ok: false, error: "Revenue passcode is not configured." };
  }
  cookies().set(REVENUE_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: REVENUE_COOKIE_PATH,
    maxAge: REVENUE_UNLOCK_MAX_AGE,
  });
  revalidatePath(REVENUE_COOKIE_PATH);
  return { ok: true };
}

/** Clear the unlock cookie so the page is locked again. */
export async function lockRevenue(): Promise<void> {
  await requireAdmin();
  cookies().delete({ name: REVENUE_COOKIE, path: REVENUE_COOKIE_PATH });
  revalidatePath(REVENUE_COOKIE_PATH);
}

/**
 * Set a single transaction's expense rate. Only allowed while the revenue
 * view is unlocked, since the expense rate is sensitive cost data. Each
 * transaction's rate is independent — saving one never affects the others.
 */
export async function updateTransactionExpensePct(
  transactionId: string,
  pct: number,
): Promise<Result> {
  await requireAdmin();
  if (!isRevenueUnlocked()) {
    return { ok: false, error: "Revenue view is locked." };
  }
  if (!Number.isFinite(pct) || pct < 0 || pct > 100) {
    return { ok: false, error: "Enter a rate between 0 and 100." };
  }
  const rounded = Math.round(pct * 100) / 100;
  await prisma.transactionExpenseRate.upsert({
    where: { transactionId },
    create: { transactionId, expensePct: rounded },
    update: { expensePct: rounded },
  });
  revalidatePath(REVENUE_COOKIE_PATH);
  return { ok: true };
}
