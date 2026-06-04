"use server";

import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import {
  passwordUpdateSchema,
  profileSchema,
  transactionCreateSchema,
} from "@/lib/validators";
import {
  sendAdminNewProfileEmail,
  sendAdminWithdrawalChangeEmail,
} from "@/lib/email";
import { createAdminNotification } from "@/lib/notifications";
import { scoreAddressChangeAnomaly } from "@/lib/ai-scoring";
import {
  buildOtpAuthUrl,
  buildQrDataUrl,
  generateTwoFactorSecret,
  verifyTotp,
} from "@/lib/totp";

async function requireUserId() {
  const session = await auth();
  if (!session?.user?.id) throw new Error("Unauthorized");
  return session.user.id;
}

// ---------- Profiles ----------

export async function createProfile(input: unknown) {
  const userId = await requireUserId();
  const parsed = profileSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  // Guard against a stale session whose user row no longer exists — otherwise
  // the create below fails with a raw foreign-key error.
  const customer = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true, name: true },
  });
  if (!customer) {
    return {
      ok: false as const,
      error: "Your session is no longer valid. Please sign out and sign in again.",
    };
  }

  const profile = await prisma.customerProfile.create({
    data: {
      userId,
      ...parsed.data,
    },
  });

  // Notify admins that a new profile is waiting for review.
  void sendAdminNewProfileEmail({ profile, customer });
  void createAdminNotification({
    title: "New profile submitted",
    message: `${customer.name ?? customer.email} submitted "${profile.firstName} ${profile.lastName}" for review.`,
    url: "/admin/profiles",
  });

  revalidatePath("/dashboard/profiles");
  revalidatePath("/dashboard");
  revalidatePath("/admin/profiles");
  revalidatePath("/admin");
  return { ok: true as const };
}

/**
 * The only profile edit a customer can make: requesting a new USDC withdrawal
 * address. The request is **staged** on `pendingWithdrawalAddress` and only
 * promoted to the live `withdrawalAddress` once an admin approves it. Until
 * then, settlements continue routing to the previously-approved address.
 * The customer can cancel a pending request by passing the existing live
 * address (handled by the "already current" check below).
 */
export async function updateWithdrawalAddress(
  profileId: string,
  address: unknown,
) {
  const userId = await requireUserId();

  const next = typeof address === "string" ? address.trim() : "";
  if (!/^0x[a-fA-F0-9]{40}$/.test(next)) {
    return {
      ok: false as const,
      error:
        "Enter a valid Base address — 0x followed by 40 hexadecimal characters.",
    };
  }

  const existing = await prisma.customerProfile.findUnique({
    where: { id: profileId },
    include: { user: { select: { email: true, name: true } } },
  });
  if (!existing || existing.userId !== userId) {
    return { ok: false as const, error: "Profile not found" };
  }
  if (next === existing.withdrawalAddress) {
    return {
      ok: false as const,
      error: "That is already the withdrawal address on this profile.",
    };
  }
  if (next === existing.pendingWithdrawalAddress) {
    return {
      ok: false as const,
      error: "That address is already awaiting admin approval on this profile.",
    };
  }

  // PENDING profiles (never approved yet) can edit the address in place —
  // there is no approved value to protect. APPROVED / REJECTED profiles must
  // route through admin review via the pending column.
  if (existing.status === "PENDING") {
    await prisma.customerProfile.update({
      where: { id: profileId },
      data: {
        withdrawalAddress: next,
        pendingWithdrawalAddress: null,
        pendingWithdrawalRequestedAt: null,
      },
    });
  } else {
    await prisma.customerProfile.update({
      where: { id: profileId },
      data: {
        pendingWithdrawalAddress: next,
        pendingWithdrawalRequestedAt: new Date(),
        // Clear any prior anomaly score so the admin doesn't see stale signals
        // while the next score is being generated in the background.
        pendingAddressRiskScore: null,
        pendingAddressRiskReasons: [],
      },
    });

    // Score the change anomaly in the background — like risk scoring on
    // transactions, this is advisory and never blocks the customer action.
    void (async () => {
      try {
        const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        const [completedAgg, recentLogins, customer] = await Promise.all([
          prisma.transaction.aggregate({
            where: {
              userId: existing.userId,
              status: "COMPLETED",
              completedAt: { gte: since },
            },
            _sum: { amountCents: true },
            _count: true,
          }),
          prisma.loginEvent.findMany({
            where: { userId: existing.userId, createdAt: { gte: since } },
            select: { country: true },
            distinct: ["country"],
            take: 8,
          }),
          prisma.user.findUnique({
            where: { id: existing.userId },
            select: { createdAt: true, blocked: true },
          }),
        ]);
        const accountAgeDays = customer
          ? Math.max(
              0,
              Math.floor(
                (Date.now() - customer.createdAt.getTime()) /
                  (24 * 60 * 60 * 1000),
              ),
            )
          : 0;

        const verdict = await scoreAddressChangeAnomaly({
          customerEmail: existing.user.email,
          profileName: `${existing.firstName} ${existing.lastName}`,
          currentAddress: existing.withdrawalAddress,
          newAddress: next,
          accountAgeDays,
          recentLoginCountries: recentLogins
            .map((l) => l.country)
            .filter((c): c is string => Boolean(c)),
          recentCompletedCount: completedAgg._count ?? 0,
          recentCompletedTotalCents: completedAgg._sum.amountCents ?? 0,
          // We don't track historical address-change count yet; this is a
          // forward-looking signal so we report 0 until that data is captured.
          previouslyChangedCount: 0,
          customerBlocked: customer?.blocked ?? false,
        });
        if (!verdict) return;

        await prisma.customerProfile.update({
          where: { id: profileId },
          data: {
            pendingAddressRiskScore: verdict.score,
            pendingAddressRiskReasons: verdict.reasons,
          },
        });
        revalidatePath("/admin/profiles");
        revalidatePath("/admin");
      } catch (err) {
        console.error("[anomaly] address scoring failed:", err);
      }
    })();
  }

  void sendAdminWithdrawalChangeEmail({
    profileName: `${existing.firstName} ${existing.lastName}`,
    customer: { email: existing.user.email, name: existing.user.name },
    previousAddress: existing.withdrawalAddress,
    newAddress: next,
  });
  void createAdminNotification({
    title: "Withdrawal address change requested",
    message: `${existing.firstName} ${existing.lastName} requested a USDC withdrawal-address change — review pending.`,
    url: "/admin/profiles",
  });

  revalidatePath("/dashboard/profiles");
  revalidatePath("/dashboard");
  revalidatePath("/admin/profiles");
  revalidatePath("/admin");
  return {
    ok: true as const,
    pending: existing.status !== "PENDING",
  };
}

/**
 * Cancels a customer's own pending withdrawal-address change request before
 * an admin has acted on it. The live `withdrawalAddress` is untouched.
 */
export async function cancelWithdrawalAddressChange(profileId: string) {
  const userId = await requireUserId();

  const existing = await prisma.customerProfile.findUnique({
    where: { id: profileId },
    select: {
      userId: true,
      pendingWithdrawalAddress: true,
    },
  });
  if (!existing || existing.userId !== userId) {
    return { ok: false as const, error: "Profile not found" };
  }
  if (!existing.pendingWithdrawalAddress) {
    return {
      ok: false as const,
      error: "There is no pending address change on this profile.",
    };
  }

  await prisma.customerProfile.update({
    where: { id: profileId },
    data: {
      pendingWithdrawalAddress: null,
      pendingWithdrawalRequestedAt: null,
    },
  });

  revalidatePath("/dashboard/profiles");
  revalidatePath("/admin/profiles");
  revalidatePath("/admin");
  return { ok: true as const };
}

/** Returns the transaction history for one of the customer's own profiles. */
export async function getProfileTransactions(profileId: string) {
  const userId = await requireUserId();
  const profile = await prisma.customerProfile.findUnique({
    where: { id: profileId },
    select: { userId: true },
  });
  if (!profile || profile.userId !== userId) {
    return { ok: false as const, error: "Profile not found" };
  }
  const transactions = await prisma.transaction.findMany({
    where: { profileId },
    orderBy: { createdAt: "desc" },
    take: 50,
    select: {
      id: true,
      createdAt: true,
      senderName: true,
      type: true,
      amountCents: true,
      status: true,
    },
  });
  return { ok: true as const, transactions };
}

export async function deleteProfile(id: string) {
  const userId = await requireUserId();
  const existing = await prisma.customerProfile.findUnique({ where: { id } });
  if (!existing || existing.userId !== userId) {
    return { ok: false as const, error: "Profile not found" };
  }
  await prisma.customerProfile.delete({ where: { id } });
  revalidatePath("/dashboard/profiles");
  return { ok: true as const };
}

// ---------- Transactions (demo deposit) ----------

export async function createTransaction(input: unknown) {
  const userId = await requireUserId();
  const parsed = transactionCreateSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const profile = await prisma.customerProfile.findUnique({
    where: { id: parsed.data.profileId },
  });
  if (!profile || profile.userId !== userId) {
    return { ok: false as const, error: "Profile not found" };
  }
  if (profile.status !== "APPROVED") {
    return {
      ok: false as const,
      error: "Profile must be approved before logging a transfer",
    };
  }
  await prisma.transaction.create({
    data: {
      userId,
      profileId: profile.id,
      amountCents: parsed.data.amountCents,
      type: parsed.data.type,
      senderName: parsed.data.senderName,
      description: parsed.data.description,
    },
  });
  revalidatePath("/dashboard/transactions");
  revalidatePath("/dashboard");
  return { ok: true as const };
}

// ---------- Settings ----------

export async function updatePassword(input: unknown) {
  const userId = await requireUserId();
  const parsed = passwordUpdateSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }
  const user = await prisma.user.findUnique({ where: { id: userId } });
  if (!user) return { ok: false as const, error: "User not found" };
  if (!user.passwordHash) {
    return {
      ok: false as const,
      error:
        "This account uses Google sign-in and doesn't have a password to change. Set one via password reset.",
    };
  }
  const valid = await bcrypt.compare(parsed.data.current, user.passwordHash);
  if (!valid) return { ok: false as const, error: "Current password is incorrect" };
  const passwordHash = await bcrypt.hash(parsed.data.next, 12);
  await prisma.user.update({ where: { id: userId }, data: { passwordHash } });
  return { ok: true as const };
}

export async function updateAccountName(name: string) {
  const userId = await requireUserId();
  const cleaned = name.trim().slice(0, 80);
  if (cleaned.length < 2) return { ok: false as const, error: "Name is too short" };
  await prisma.user.update({ where: { id: userId }, data: { name: cleaned } });
  revalidatePath("/dashboard/settings");
  revalidatePath("/admin/settings");
  return { ok: true as const };
}

// ---------- Notifications ----------

/** Marks every unread in-app notification for the current customer as read. */
export async function markAllNotificationsRead() {
  const userId = await requireUserId();
  await prisma.notification.updateMany({
    where: { userId, channel: "IN_APP", readAt: null },
    data: { readAt: new Date() },
  });
  return { ok: true as const };
}

// ---------- Two-factor authentication ----------

/**
 * Begins TOTP enrollment: generates a secret and returns the QR code to scan.
 * `twoFactor` stays false until the customer confirms a code from their app.
 */
export async function startTwoFactorSetup() {
  const userId = await requireUserId();
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { email: true, passwordHash: true, twoFactor: true },
  });
  if (!user) return { ok: false as const, error: "User not found" };
  if (!user.passwordHash) {
    return {
      ok: false as const,
      error:
        "This account signs in with Google — two-factor is managed by your Google account.",
    };
  }
  if (user.twoFactor) {
    return {
      ok: false as const,
      error: "Two-factor authentication is already enabled.",
    };
  }

  const secret = generateTwoFactorSecret();
  await prisma.user.update({
    where: { id: userId },
    data: { twoFactorSecret: secret },
  });
  const qr = await buildQrDataUrl(buildOtpAuthUrl(user.email, secret));
  return { ok: true as const, secret, qr };
}

/** Confirms enrollment by checking a code against the pending secret. */
export async function confirmTwoFactorSetup(code: unknown) {
  const userId = await requireUserId();
  const token = typeof code === "string" ? code : "";
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { twoFactorSecret: true },
  });
  if (!user?.twoFactorSecret) {
    return {
      ok: false as const,
      error: "Start the setup again — no pending secret was found.",
    };
  }
  if (!(await verifyTotp(token, user.twoFactorSecret))) {
    return {
      ok: false as const,
      error: "That code is incorrect or expired. Try again.",
    };
  }
  await prisma.user.update({
    where: { id: userId },
    data: { twoFactor: true },
  });
  revalidatePath("/dashboard/settings");
  revalidatePath("/admin/settings");
  return { ok: true as const };
}

/** Turns 2FA off. Requires the account password to authorise the change. */
export async function disableTwoFactor(password: unknown) {
  const userId = await requireUserId();
  const pw = typeof password === "string" ? password : "";
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { passwordHash: true, twoFactor: true },
  });
  if (!user) return { ok: false as const, error: "User not found" };
  if (!user.passwordHash) {
    return {
      ok: false as const,
      error: "This account has no password, so two-factor can't be managed here.",
    };
  }
  if (!(await bcrypt.compare(pw, user.passwordHash))) {
    return { ok: false as const, error: "Password is incorrect" };
  }
  await prisma.user.update({
    where: { id: userId },
    data: { twoFactor: false, twoFactorSecret: null },
  });
  revalidatePath("/dashboard/settings");
  revalidatePath("/admin/settings");
  return { ok: true as const };
}
