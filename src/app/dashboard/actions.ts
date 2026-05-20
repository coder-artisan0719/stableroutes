"use server";

import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import {
  passwordUpdateSchema,
  profileSchema,
  profileApprovedUpdateSchema,
  profilePendingUpdateSchema,
  transactionCreateSchema,
} from "@/lib/validators";
import { sendAdminNewProfileEmail } from "@/lib/email";

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

  revalidatePath("/dashboard/profiles");
  revalidatePath("/dashboard");
  return { ok: true as const };
}

export async function updateProfile(id: string, input: unknown) {
  const userId = await requireUserId();
  const existing = await prisma.customerProfile.findUnique({ where: { id } });
  if (!existing || existing.userId !== userId) {
    return { ok: false as const, error: "Profile not found" };
  }

  // Approved profiles: only senderName + withdrawalAddress are editable.
  // Pending / rejected profiles: full edit allowed. Editing a rejected
  // profile resubmits it — status returns to PENDING and the reason clears.
  if (existing.status === "APPROVED") {
    const parsed = profileApprovedUpdateSchema.safeParse(input);
    if (!parsed.success) {
      return {
        ok: false as const,
        error: parsed.error.issues[0]?.message ?? "Invalid input",
      };
    }
    await prisma.customerProfile.update({
      where: { id },
      data: parsed.data,
    });
  } else {
    const parsed = profilePendingUpdateSchema.safeParse(input);
    if (!parsed.success) {
      return {
        ok: false as const,
        error: parsed.error.issues[0]?.message ?? "Invalid input",
      };
    }
    await prisma.customerProfile.update({
      where: { id },
      data: {
        ...parsed.data,
        ...(existing.status === "REJECTED"
          ? { status: "PENDING" as const, notes: null }
          : {}),
      },
    });
  }

  revalidatePath("/dashboard/profiles");
  return { ok: true as const };
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
  return { ok: true as const };
}
