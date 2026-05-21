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
 * The only profile edit a customer can make: changing the USDC withdrawal
 * address. The change is applied, the profile is moved back to PENDING, and
 * admins are notified (by email — reliable — and the in-app bell). An admin
 * must re-approve before the profile is active again.
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

  await prisma.customerProfile.update({
    where: { id: profileId },
    data: {
      withdrawalAddress: next,
      status: "PENDING",
      approvedAt: null,
      approvedById: null,
      ...(existing.status === "REJECTED" ? { notes: null } : {}),
    },
  });

  void sendAdminWithdrawalChangeEmail({
    profileName: `${existing.firstName} ${existing.lastName}`,
    customer: { email: existing.user.email, name: existing.user.name },
    previousAddress: existing.withdrawalAddress,
    newAddress: next,
  });
  void createAdminNotification({
    title: "Withdrawal address changed",
    message: `${existing.firstName} ${existing.lastName} updated their USDC withdrawal address — the profile is back in the review queue.`,
    url: "/admin/profiles",
  });

  revalidatePath("/dashboard/profiles");
  revalidatePath("/dashboard");
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
