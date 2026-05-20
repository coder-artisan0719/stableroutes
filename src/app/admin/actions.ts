"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import {
  adminTransactionCreateSchema,
  profileApprovalSchema,
  transactionStatusSchema,
} from "@/lib/validators";
import {
  sendProfileStatusEmail,
  sendTransactionStatusEmail,
} from "@/lib/email";

async function requireAdminId() {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "ADMIN") {
    throw new Error("Unauthorized");
  }
  return session.user.id;
}

export async function setProfileStatus(input: unknown) {
  const adminId = await requireAdminId();
  const parsed = profileApprovalSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const data =
    parsed.data.status === "APPROVED"
      ? {
          status: "APPROVED" as const,
          notes: parsed.data.notes,
          approvedAt: new Date(),
          approvedById: adminId,
          bankName: parsed.data.bank.bankName,
          bankAddress: parsed.data.bank.bankAddress,
          accountNumber: parsed.data.bank.accountNumber,
          routingNumber: parsed.data.bank.routingNumber,
          transferMethod: parsed.data.bank.transferMethod,
        }
      : {
          status: "PENDING" as const,
          notes: parsed.data.notes,
          approvedAt: null,
          approvedById: null,
        };

  const updated = await prisma.customerProfile.update({
    where: { id: parsed.data.id },
    data,
    include: { user: true },
  });

  void sendProfileStatusEmail({
    user: {
      id: updated.user.id,
      email: updated.user.email,
      name: updated.user.name,
    },
    profile: updated,
  });

  revalidatePath("/admin/profiles");
  revalidatePath("/admin");
  return { ok: true as const };
}

export async function adminDeleteProfile(id: string) {
  await requireAdminId();
  const profile = await prisma.customerProfile.findUnique({
    where: { id },
    select: { id: true },
  });
  if (!profile) return { ok: false as const, error: "Profile not found" };

  // Cascade delete removes associated transactions (per schema).
  await prisma.customerProfile.delete({ where: { id } });

  revalidatePath("/admin/profiles");
  revalidatePath("/admin");
  // Bust caches the customer might pull from too.
  revalidatePath("/dashboard/profiles");
  revalidatePath("/dashboard");
  return { ok: true as const };
}

export async function adminCreateTransaction(input: unknown) {
  await requireAdminId();
  const parsed = adminTransactionCreateSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false as const,
      error: parsed.error.issues[0]?.message ?? "Invalid input",
    };
  }

  const profile = await prisma.customerProfile.findUnique({
    where: { id: parsed.data.profileId },
    include: { user: true },
  });
  if (!profile) {
    return { ok: false as const, error: "Profile not found" };
  }
  if (profile.status !== "APPROVED") {
    return {
      ok: false as const,
      error: "Profile must be approved before logging a payment",
    };
  }

  const now = new Date();
  const isScheduled =
    parsed.data.scheduledFor instanceof Date &&
    parsed.data.scheduledFor.getTime() > now.getTime();

  const tx = await prisma.transaction.create({
    data: {
      userId: profile.userId,
      profileId: profile.id,
      amountCents: parsed.data.amountCents,
      type: parsed.data.type,
      senderName: parsed.data.senderName,
      description: parsed.data.description,
      adminNote: parsed.data.adminNote,
      status: isScheduled ? "SCHEDULED" : "PENDING",
      scheduledFor: isScheduled ? parsed.data.scheduledFor : null,
    },
  });

  void sendTransactionStatusEmail({
    user: {
      id: profile.user.id,
      email: profile.user.email,
      name: profile.user.name,
    },
    transaction: tx,
  });

  revalidatePath("/admin/transactions");
  revalidatePath("/admin");
  revalidatePath("/dashboard/transactions");
  revalidatePath("/dashboard");
  return { ok: true as const };
}

export async function setTransactionStatus(input: unknown) {
  await requireAdminId();
  const parsed = transactionStatusSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false as const, error: parsed.error.issues[0]?.message ?? "Invalid input" };
  }

  const now = new Date();
  const updated = await prisma.transaction.update({
    where: { id: parsed.data.id },
    data: {
      status: parsed.data.status,
      adminNote: parsed.data.adminNote,
      refundReason:
        parsed.data.status === "REFUNDED" ? parsed.data.refundReason : null,
      txHash: parsed.data.status === "COMPLETED" ? parsed.data.txHash : null,
      // Clear scheduledFor once the transaction leaves the SCHEDULED state.
      scheduledFor: parsed.data.status === "SCHEDULED" ? undefined : null,
      completedAt: parsed.data.status === "COMPLETED" ? now : null,
      refundedAt: parsed.data.status === "REFUNDED" ? now : null,
    },
    include: { user: true },
  });

  void sendTransactionStatusEmail({
    user: {
      id: updated.user.id,
      email: updated.user.email,
      name: updated.user.name,
    },
    transaction: updated,
  });

  revalidatePath("/admin/transactions");
  revalidatePath("/admin");
  return { ok: true as const };
}
