"use server";

import { revalidatePath } from "next/cache";
import bcrypt from "bcryptjs";
import type { Prisma } from "@prisma/client";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import {
  adminScheduledTransactionUpdateSchema,
  adminTaskCreateSchema,
  adminTaskResolveSchema,
  adminTaskSnoozeSchema,
  adminTaskUpdateSchema,
  adminTransactionCreateSchema,
  adminUpdateCredentialsSchema,
  announcementSchema,
  bankDetailsSchemaFor,
  blockCustomerSchema,
  profileApprovalSchema,
  transactionStatusSchema,
} from "@/lib/validators";
import {
  sendAccountStatusEmail,
  sendCustomerAnnouncement,
  sendCredentialsUpdatedEmail,
  sendProfileStatusEmail,
  sendTransactionStatusEmail,
} from "@/lib/email";
import { createCustomerNotification } from "@/lib/notifications";
import {
  effectiveCommissionPct,
  referralDiscountForUser,
} from "@/lib/referral";
import {
  riskBucket,
  scoreTransactionRisk,
} from "@/lib/ai-scoring";
import { formatUSD } from "@/lib/utils";

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

  let data;
  if (parsed.data.status === "APPROVED") {
    // Look up the profile's stated currency so we can pick the right bank
    // schema — USD validates routing/account, others validate IBAN + SWIFT.
    const profile = await prisma.customerProfile.findUnique({
      where: { id: parsed.data.id },
      select: { accountCurrency: true },
    });
    if (!profile) {
      return { ok: false as const, error: "Profile not found" };
    }
    const bankParsed = bankDetailsSchemaFor(profile.accountCurrency).safeParse(
      parsed.data.bank,
    );
    if (!bankParsed.success) {
      return {
        ok: false as const,
        error:
          bankParsed.error.issues[0]?.message ?? "Invalid bank details",
      };
    }
    data = {
      status: "APPROVED" as const,
      notes: parsed.data.notes,
      approvedAt: new Date(),
      approvedById: adminId,
      commissionPct: parsed.data.commissionPct,
      bankName: bankParsed.data.bankName,
      bankAddress: bankParsed.data.bankAddress,
      accountNumber: bankParsed.data.accountNumber,
      routingNumber: bankParsed.data.routingNumber,
      transferMethod: bankParsed.data.transferMethod,
    };
  } else {
    data = {
      status: parsed.data.status,
      notes: parsed.data.notes,
      approvedAt: null,
      approvedById: null,
    };
  }

  const updated = await prisma.customerProfile.update({
    where: { id: parsed.data.id },
    data,
    include: { user: { select: { id: true, email: true, name: true } } },
  });

  void sendProfileStatusEmail({
    user: {
      id: updated.user.id,
      email: updated.user.email,
      name: updated.user.name,
    },
    profile: updated,
  });

  const profileName = `${updated.firstName} ${updated.lastName}`;
  void createCustomerNotification({
    userId: updated.user.id,
    title:
      updated.status === "APPROVED"
        ? "Profile approved"
        : updated.status === "REJECTED"
          ? "Profile needs changes"
          : "Profile under review",
    message:
      updated.status === "APPROVED"
        ? `${profileName} is approved and ready to receive transfers.`
        : updated.status === "REJECTED"
          ? `${profileName} wasn't approved. Open it to make changes and resubmit.`
          : `${profileName} is back under review.`,
    url: "/dashboard/profiles",
  });

  revalidatePath("/admin/profiles");
  revalidatePath("/admin");
  return { ok: true as const };
}

/**
 * Promotes a customer's staged `pendingWithdrawalAddress` into the live
 * `withdrawalAddress`, clears the pending columns, and emails the customer
 * that their requested change is now active. No-op (returns an error) if
 * there is no pending change on the profile.
 */
export async function approveWithdrawalAddressChange(profileId: string) {
  await requireAdminId();

  const existing = await prisma.customerProfile.findUnique({
    where: { id: profileId },
    include: { user: { select: { id: true, email: true, name: true } } },
  });
  if (!existing) {
    return { ok: false as const, error: "Profile not found" };
  }
  if (!existing.pendingWithdrawalAddress) {
    return {
      ok: false as const,
      error: "There is no pending address change on this profile.",
    };
  }

  const updated = await prisma.customerProfile.update({
    where: { id: profileId },
    data: {
      withdrawalAddress: existing.pendingWithdrawalAddress,
      pendingWithdrawalAddress: null,
      pendingWithdrawalRequestedAt: null,
      pendingAddressRiskScore: null,
      pendingAddressRiskReasons: [],
    },
  });

  void createCustomerNotification({
    userId: existing.user.id,
    title: "Withdrawal address updated",
    message: `Your USDC withdrawal address for ${existing.firstName} ${existing.lastName} has been approved and is now active.`,
    url: "/dashboard/profiles",
  });

  revalidatePath("/admin/profiles");
  revalidatePath("/admin");
  revalidatePath("/dashboard/profiles");
  revalidatePath("/dashboard");
  return { ok: true as const, profileId: updated.id };
}

/**
 * Rejects a customer's pending withdrawal-address change. The live address
 * is preserved and the pending columns are cleared so the customer can try
 * again. An optional admin reason is surfaced to the customer.
 */
export async function rejectWithdrawalAddressChange(
  profileId: string,
  reason?: string,
) {
  await requireAdminId();

  const existing = await prisma.customerProfile.findUnique({
    where: { id: profileId },
    include: { user: { select: { id: true, email: true, name: true } } },
  });
  if (!existing) {
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
      pendingAddressRiskScore: null,
      pendingAddressRiskReasons: [],
    },
  });

  const trimmedReason = reason?.trim();
  void createCustomerNotification({
    userId: existing.user.id,
    title: "Withdrawal address change rejected",
    message: trimmedReason
      ? `Your requested address change for ${existing.firstName} ${existing.lastName} wasn't approved: ${trimmedReason}`
      : `Your requested address change for ${existing.firstName} ${existing.lastName} wasn't approved. Existing settlements will continue to the previous address.`,
    url: "/dashboard/profiles",
  });

  revalidatePath("/admin/profiles");
  revalidatePath("/admin");
  revalidatePath("/dashboard/profiles");
  revalidatePath("/dashboard");
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
    include: { user: { select: { id: true, email: true, name: true } } },
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

  // Snapshot the effective commission: the profile's base rate minus any
  // referral discount the customer has earned (capped so it can't go below 0%).
  const referralDiscount = await referralDiscountForUser(profile.userId);
  const commissionPct = effectiveCommissionPct(
    profile.commissionPct,
    referralDiscount,
  );

  const tx = await prisma.transaction.create({
    data: {
      userId: profile.userId,
      profileId: profile.id,
      amountCents: parsed.data.amountCents,
      commissionPct,
      type: parsed.data.type,
      senderName: parsed.data.senderName,
      description: parsed.data.description,
      adminNote: parsed.data.adminNote,
      status: isScheduled ? "SCHEDULED" : "PENDING",
      scheduledFor: isScheduled ? parsed.data.scheduledFor : null,
    },
  });

  // AI risk-score in the background. The transaction is already saved, so a
  // slow or failed scoring call never blocks the admin action. Once the
  // score lands we write it back and auto-create a HIGH-priority follow-up
  // task above the elevated bucket so the admin doesn't have to spot it
  // manually on the transactions page.
  void (async () => {
    try {
      const sinceMs = Date.now() - 30 * 24 * 60 * 60 * 1000;
      const [
        completedCount,
        completedSum,
        refundedCount,
        pendingCount,
        customer,
      ] = await Promise.all([
        prisma.transaction.count({
          where: { userId: profile.userId, status: "COMPLETED" },
        }),
        prisma.transaction.aggregate({
          where: { userId: profile.userId, status: "COMPLETED" },
          _sum: { amountCents: true },
        }),
        prisma.transaction.count({
          where: { userId: profile.userId, status: "REFUNDED" },
        }),
        prisma.transaction.count({
          where: { userId: profile.userId, status: "PENDING" },
        }),
        prisma.user.findUnique({
          where: { id: profile.userId },
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
      void sinceMs; // referenced in case future signals want a 30-day window

      const verdict = await scoreTransactionRisk({
        amountCents: tx.amountCents,
        type: tx.type,
        senderName: tx.senderName,
        description: tx.description,
        customerEmail: profile.user.email,
        profileName: `${profile.firstName} ${profile.lastName}`,
        customerStats: {
          completedCount,
          totalCompletedCents: completedSum._sum.amountCents ?? 0,
          refundedCount,
          pendingCount,
          accountAgeDays,
          customerBlocked: customer?.blocked ?? false,
        },
      });
      if (!verdict) return;

      await prisma.transaction.update({
        where: { id: tx.id },
        data: {
          riskScore: verdict.score,
          riskReasons: verdict.reasons,
          riskAnalyzedAt: new Date(),
        },
      });

      // Auto-task above the "elevated" threshold so the admin queue picks it
      // up immediately — gives the admin a place to act before the customer
      // ever notices the transfer was flagged.
      const bucket = riskBucket(verdict.score);
      if (bucket.severity === "high" || bucket.severity === "medium") {
        await prisma.adminTask.create({
          data: {
            title: `Review flagged transfer (${bucket.label}, ${verdict.score}/100)`,
            category: "COMPLIANCE_REVIEW",
            priority: bucket.severity === "high" ? "URGENT" : "HIGH",
            status: "OPEN",
            customerId: profile.userId,
            profileId: profile.id,
            transactionId: tx.id,
            customerEmail: profile.user.email,
            profileName: `${profile.firstName} ${profile.lastName}`,
            amountCents: tx.amountCents,
            paidAt: tx.createdAt,
            dueAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
            reason: verdict.reasons.join(" · "),
            autoGenerated: true,
          },
        });
      }

      revalidatePath("/admin/transactions");
      revalidatePath("/admin/tasks");
      revalidatePath("/admin");
    } catch (err) {
      console.error("[risk] background scoring failed:", err);
    }
  })();

  void sendTransactionStatusEmail({
    user: {
      id: profile.user.id,
      email: profile.user.email,
      name: profile.user.name,
    },
    transaction: tx,
  });

  void createCustomerNotification({
    userId: profile.userId,
    title: isScheduled ? "Payment scheduled" : "New payment pending",
    message: `A ${tx.type} transfer of ${formatUSD(tx.amountCents)} from ${
      tx.senderName
    } ${isScheduled ? "has been scheduled." : "is now pending."}`,
    url: "/dashboard/transactions",
  });

  revalidatePath("/admin/transactions");
  revalidatePath("/admin");
  revalidatePath("/dashboard/transactions");
  revalidatePath("/dashboard");
  return { ok: true as const };
}

export async function setCustomerBlocked(input: unknown) {
  await requireAdminId();
  const parsed = blockCustomerSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false as const,
      error: parsed.error.issues[0]?.message ?? "Invalid input",
    };
  }

  const target = await prisma.user.findUnique({
    where: { id: parsed.data.id },
    select: { id: true, email: true, name: true, role: true },
  });
  if (!target) return { ok: false as const, error: "Customer not found" };
  if (target.role === "ADMIN") {
    return { ok: false as const, error: "Admin accounts can't be blocked" };
  }

  const updated = await prisma.user.update({
    where: { id: target.id },
    data: {
      blocked: parsed.data.blocked,
      blockedReason: parsed.data.blocked
        ? (parsed.data.reason ?? null)
        : null,
      blockedAt: parsed.data.blocked ? new Date() : null,
    },
  });

  void sendAccountStatusEmail({
    user: { id: updated.id, email: updated.email, name: updated.name },
    blocked: parsed.data.blocked,
    reason: parsed.data.reason,
  });

  revalidatePath("/admin/customers");
  revalidatePath("/admin");
  return { ok: true as const };
}

export async function sendAnnouncement(input: unknown) {
  await requireAdminId();
  const parsed = announcementSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false as const,
      error: parsed.error.issues[0]?.message ?? "Invalid input",
    };
  }

  const sent = await sendCustomerAnnouncement({
    type: parsed.data.type,
    subject: parsed.data.subject,
    message: parsed.data.message,
    scheduledLabel: parsed.data.scheduledLabel ?? null,
    recipientIds: parsed.data.recipientIds,
  });

  // Record it in the announcement history (best-effort — never fail the send).
  try {
    await prisma.announcement.create({
      data: {
        type: parsed.data.type,
        subject: parsed.data.subject,
        message: parsed.data.message,
        scheduledLabel: parsed.data.scheduledLabel ?? null,
        recipientCount: sent,
      },
    });
  } catch (err) {
    console.error("[announcement] failed to record history:", err);
  }

  revalidatePath("/admin/announcements");
  return { ok: true as const, sent };
}

/** Removes the selected announcements from the history (admin bulk-delete). */
export async function adminDeleteAnnouncements(ids: unknown) {
  await requireAdminId();
  if (
    !Array.isArray(ids) ||
    ids.length === 0 ||
    ids.some((id) => typeof id !== "string")
  ) {
    return { ok: false as const, error: "No announcements selected" };
  }

  const { count } = await prisma.announcement.deleteMany({
    where: { id: { in: ids as string[] } },
  });

  revalidatePath("/admin/announcements");
  return { ok: true as const, deleted: count };
}

export async function adminUpdateCustomerCredentials(input: unknown) {
  await requireAdminId();
  const parsed = adminUpdateCredentialsSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false as const,
      error: parsed.error.issues[0]?.message ?? "Invalid input",
    };
  }

  const target = await prisma.user.findUnique({
    where: { id: parsed.data.id },
    select: { id: true, email: true, name: true, role: true },
  });
  if (!target) return { ok: false as const, error: "Customer not found" };
  if (target.role === "ADMIN") {
    return { ok: false as const, error: "Admin accounts can't be edited here" };
  }

  // Emails are stored lower-cased (see signup) — normalise before comparing.
  const newEmail = parsed.data.email.trim().toLowerCase();
  const emailChanged = newEmail !== target.email;

  if (emailChanged) {
    const dup = await prisma.user.findUnique({
      where: { email: newEmail },
      select: { id: true },
    });
    if (dup && dup.id !== target.id) {
      return {
        ok: false as const,
        error: "That email is already used by another account",
      };
    }
  }

  const newPassword = parsed.data.password?.length ? parsed.data.password : null;
  const passwordChanged = newPassword !== null;

  // Look up the current telegramId only when the form sent a value, so we
  // can decide whether it actually changed.
  let telegramChanged = false;
  let nextTelegramId: string | null | undefined;
  if (parsed.data.telegramId !== undefined) {
    const current = await prisma.user.findUnique({
      where: { id: target.id },
      select: { telegramId: true },
    });
    const trimmed = parsed.data.telegramId.trim();
    nextTelegramId = trimmed.length === 0 ? null : trimmed;
    telegramChanged = (current?.telegramId ?? null) !== nextTelegramId;
  }

  if (!emailChanged && !passwordChanged && !telegramChanged) {
    return { ok: false as const, error: "Nothing to update" };
  }

  await prisma.user.update({
    where: { id: target.id },
    data: {
      ...(emailChanged ? { email: newEmail } : {}),
      ...(passwordChanged
        ? { passwordHash: await bcrypt.hash(newPassword, 12) }
        : {}),
      ...(telegramChanged ? { telegramId: nextTelegramId ?? null } : {}),
    },
  });

  // The credentials-change email is only relevant when the actual sign-in
  // credentials changed — a Telegram-handle edit doesn't warrant emailing.
  if (emailChanged || passwordChanged) {
    void sendCredentialsUpdatedEmail({
      user: { id: target.id, name: target.name },
      to: newEmail,
      emailChanged,
      passwordChanged,
      newEmail,
    });
  }

  revalidatePath("/admin/customers");
  return { ok: true as const };
}

/**
 * Recovery path for a customer locked out of their authenticator: an admin
 * turns 2FA off so they can sign in with just their password again.
 */
export async function adminResetTwoFactor(id: string) {
  await requireAdminId();
  const target = await prisma.user.findUnique({
    where: { id },
    select: { id: true, role: true, twoFactor: true },
  });
  if (!target) return { ok: false as const, error: "Customer not found" };
  if (target.role === "ADMIN") {
    return { ok: false as const, error: "Admin accounts can't be edited here" };
  }
  if (!target.twoFactor) {
    return {
      ok: false as const,
      error: "Two-factor authentication isn't enabled for this customer",
    };
  }

  await prisma.user.update({
    where: { id },
    data: { twoFactor: false, twoFactorSecret: null },
  });

  revalidatePath("/admin/customers");
  return { ok: true as const };
}

export async function adminDeleteCustomer(id: string) {
  await requireAdminId();
  const target = await prisma.user.findUnique({
    where: { id },
    select: { id: true, role: true },
  });
  if (!target) return { ok: false as const, error: "Customer not found" };
  if (target.role === "ADMIN") {
    return { ok: false as const, error: "Admin accounts can't be deleted here" };
  }

  // Cascade (per schema onDelete: Cascade) removes the customer's profiles,
  // transactions, notifications, sessions and accounts.
  await prisma.user.delete({ where: { id } });

  revalidatePath("/admin/customers");
  revalidatePath("/admin");
  revalidatePath("/admin/profiles");
  revalidatePath("/admin/transactions");
  return { ok: true as const };
}

/**
 * Edits a SCHEDULED transaction in place. The admin can change the sender
 * name (must remain non-empty) and the scheduled-for time (must remain in
 * the future). Once a transaction has flipped to PENDING/COMPLETED/etc.
 * it's no longer editable here — use `setTransactionStatus` for that.
 */
export async function adminUpdateScheduledTransaction(input: unknown) {
  await requireAdminId();
  const parsed = adminScheduledTransactionUpdateSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false as const,
      error: parsed.error.issues[0]?.message ?? "Invalid input",
    };
  }

  const existing = await prisma.transaction.findUnique({
    where: { id: parsed.data.id },
    select: { status: true, scheduledFor: true },
  });
  if (!existing) {
    return { ok: false as const, error: "Transaction not found" };
  }
  if (existing.status !== "SCHEDULED") {
    return {
      ok: false as const,
      error: "Only scheduled transactions can be edited here.",
    };
  }

  // If a new scheduledFor is provided, require it to be in the future so we
  // don't silently push the row out of SCHEDULED state.
  let nextScheduledFor = existing.scheduledFor;
  if (parsed.data.scheduledFor instanceof Date) {
    if (parsed.data.scheduledFor.getTime() <= Date.now()) {
      return {
        ok: false as const,
        error: "Scheduled date must be in the future.",
      };
    }
    nextScheduledFor = parsed.data.scheduledFor;
  }

  await prisma.transaction.update({
    where: { id: parsed.data.id },
    data: {
      senderName: parsed.data.senderName,
      scheduledFor: nextScheduledFor,
    },
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

  const current = await prisma.transaction.findUnique({
    where: { id: parsed.data.id },
    select: { status: true },
  });
  if (!current) {
    return { ok: false as const, error: "Transaction not found" };
  }
  if (current.status === "COMPLETED") {
    return {
      ok: false as const,
      error: "Completed payments are final and can't be changed.",
    };
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
    include: { user: { select: { id: true, email: true, name: true } } },
  });

  void sendTransactionStatusEmail({
    user: {
      id: updated.user.id,
      email: updated.user.email,
      name: updated.user.name,
    },
    transaction: updated,
  });

  const statusTitle: Record<typeof updated.status, string> = {
    COMPLETED: "Transfer completed",
    REFUNDED: "Transfer refunded",
    SCHEDULED: "Transfer scheduled",
    PENDING: "Transfer pending",
    CANCELLED: "Transfer cancelled",
  };
  void createCustomerNotification({
    userId: updated.user.id,
    title: statusTitle[updated.status],
    message: `Your ${formatUSD(updated.amountCents)} transfer from ${
      updated.senderName
    } is now ${updated.status.toLowerCase()}.`,
    url: "/dashboard/transactions",
  });

  revalidatePath("/admin/transactions");
  revalidatePath("/admin");
  return { ok: true as const };
}

// ---------------------------------------------------------------------------
// Admin task queue (follow-ups, payment holds, restricted-account reminders)
// ---------------------------------------------------------------------------

async function snapshotCustomerLabels(
  customerId: string | undefined,
  profileId: string | undefined,
) {
  let customerEmail: string | null = null;
  let profileName: string | null = null;

  if (customerId) {
    const u = await prisma.user.findUnique({
      where: { id: customerId },
      select: { email: true },
    });
    customerEmail = u?.email ?? null;
  }
  if (profileId) {
    const p = await prisma.customerProfile.findUnique({
      where: { id: profileId },
      select: { firstName: true, lastName: true, userId: true, user: { select: { email: true } } },
    });
    if (p) {
      profileName = `${p.firstName} ${p.lastName}`;
      if (!customerEmail) customerEmail = p.user.email ?? null;
    }
  }
  return { customerEmail, profileName };
}

export async function adminCreateTask(input: unknown) {
  const adminId = await requireAdminId();
  const parsed = adminTaskCreateSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false as const,
      error: parsed.error.issues[0]?.message ?? "Invalid input",
    };
  }

  const { customerEmail, profileName } = await snapshotCustomerLabels(
    parsed.data.customerId,
    parsed.data.profileId,
  );

  await prisma.adminTask.create({
    data: {
      title: parsed.data.title,
      category: parsed.data.category,
      priority: parsed.data.priority,
      customerId: parsed.data.customerId ?? null,
      profileId: parsed.data.profileId ?? null,
      transactionId: parsed.data.transactionId ?? null,
      customerEmail,
      profileName,
      amountCents: parsed.data.amountCents ?? null,
      paidAt: parsed.data.paidAt ?? null,
      dueAt: parsed.data.dueAt ?? null,
      reason: parsed.data.reason ?? null,
      notes: parsed.data.notes ?? null,
      createdById: adminId,
    },
  });

  revalidatePath("/admin/tasks");
  revalidatePath("/admin");
  return { ok: true as const };
}

export async function adminUpdateTask(input: unknown) {
  await requireAdminId();
  const parsed = adminTaskUpdateSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false as const,
      error: parsed.error.issues[0]?.message ?? "Invalid input",
    };
  }

  const { id, ...rest } = parsed.data;
  // Strip undefined so we don't overwrite untouched fields.
  const data = Object.fromEntries(
    Object.entries(rest).filter(([, v]) => v !== undefined),
  );
  if (Object.keys(data).length === 0) {
    return { ok: false as const, error: "Nothing to update" };
  }

  await prisma.adminTask.update({ where: { id }, data });

  revalidatePath("/admin/tasks");
  revalidatePath("/admin");
  return { ok: true as const };
}

export async function adminResolveTask(input: unknown) {
  const adminId = await requireAdminId();
  const parsed = adminTaskResolveSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false as const,
      error: parsed.error.issues[0]?.message ?? "Invalid input",
    };
  }

  const existing = await prisma.adminTask.findUnique({
    where: { id: parsed.data.id },
    select: { id: true, notes: true },
  });
  if (!existing) return { ok: false as const, error: "Task not found" };

  const note = parsed.data.resolutionNote?.trim();
  const mergedNotes =
    note && note.length > 0
      ? `${existing.notes ? existing.notes + "\n\n" : ""}Resolved: ${note}`
      : existing.notes;

  await prisma.adminTask.update({
    where: { id: parsed.data.id },
    data: {
      status: "RESOLVED",
      resolvedAt: new Date(),
      resolvedById: adminId,
      snoozedUntil: null,
      notes: mergedNotes,
    },
  });

  revalidatePath("/admin/tasks");
  revalidatePath("/admin");
  return { ok: true as const };
}

export async function adminReopenTask(id: string) {
  await requireAdminId();
  const existing = await prisma.adminTask.findUnique({
    where: { id },
    select: { id: true },
  });
  if (!existing) return { ok: false as const, error: "Task not found" };

  await prisma.adminTask.update({
    where: { id },
    data: {
      status: "OPEN",
      resolvedAt: null,
      resolvedById: null,
      snoozedUntil: null,
    },
  });

  revalidatePath("/admin/tasks");
  revalidatePath("/admin");
  return { ok: true as const };
}

export async function adminSnoozeTask(input: unknown) {
  await requireAdminId();
  const parsed = adminTaskSnoozeSchema.safeParse(input);
  if (!parsed.success) {
    return {
      ok: false as const,
      error: parsed.error.issues[0]?.message ?? "Invalid input",
    };
  }
  if (parsed.data.snoozeUntil.getTime() <= Date.now()) {
    return {
      ok: false as const,
      error: "Snooze date must be in the future",
    };
  }

  await prisma.adminTask.update({
    where: { id: parsed.data.id },
    data: { status: "SNOOZED", snoozedUntil: parsed.data.snoozeUntil },
  });

  revalidatePath("/admin/tasks");
  return { ok: true as const };
}

export async function adminDeleteTasks(ids: unknown) {
  await requireAdminId();
  if (
    !Array.isArray(ids) ||
    ids.length === 0 ||
    ids.some((id) => typeof id !== "string")
  ) {
    return { ok: false as const, error: "No tasks selected" };
  }

  const { count } = await prisma.adminTask.deleteMany({
    where: { id: { in: ids as string[] } },
  });

  revalidatePath("/admin/tasks");
  revalidatePath("/admin");
  return { ok: true as const, deleted: count };
}

/**
 * Scans the DB for items that warrant an admin follow-up and seeds OPEN tasks
 * for any that don't already have one. Idempotent — re-running won't duplicate
 * existing auto-tasks. Currently covers:
 *   • Restricted (blocked) customer accounts
 *   • Profiles sitting in PENDING longer than 48h
 *   • Pending transactions older than 72h (likely awaiting confirmation)
 *   • Scheduled transactions whose ETA passed without flipping to PENDING
 *   • Refunds initiated more than 7d ago that haven't been re-confirmed
 */
export async function adminAutoDetectTasks() {
  const adminId = await requireAdminId();
  const now = Date.now();

  const [
    blocked,
    stalePending,
    oldPendingTx,
    lateScheduled,
    oldRefunds,
    pendingAddressChanges,
  ] = await Promise.all([
      prisma.user.findMany({
        where: { blocked: true, role: "CUSTOMER" },
        select: { id: true, email: true, blockedReason: true, blockedAt: true },
      }),
      prisma.customerProfile.findMany({
        where: {
          status: "PENDING",
          createdAt: { lt: new Date(now - 48 * 60 * 60 * 1000) },
        },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          userId: true,
          createdAt: true,
          user: { select: { email: true } },
        },
      }),
      prisma.transaction.findMany({
        where: {
          status: "PENDING",
          createdAt: { lt: new Date(now - 72 * 60 * 60 * 1000) },
        },
        select: {
          id: true,
          userId: true,
          profileId: true,
          amountCents: true,
          senderName: true,
          createdAt: true,
          user: { select: { email: true } },
          profile: { select: { firstName: true, lastName: true } },
        },
      }),
      prisma.transaction.findMany({
        where: {
          status: "SCHEDULED",
          scheduledFor: { lt: new Date(now - 1 * 60 * 60 * 1000) },
        },
        select: {
          id: true,
          userId: true,
          profileId: true,
          amountCents: true,
          scheduledFor: true,
          user: { select: { email: true } },
          profile: { select: { firstName: true, lastName: true } },
        },
      }),
      prisma.transaction.findMany({
        where: {
          status: "REFUNDED",
          refundedAt: { lt: new Date(now - 7 * 24 * 60 * 60 * 1000) },
        },
        select: {
          id: true,
          userId: true,
          profileId: true,
          amountCents: true,
          refundedAt: true,
          user: { select: { email: true } },
          profile: { select: { firstName: true, lastName: true } },
        },
      }),
      prisma.customerProfile.findMany({
        where: { pendingWithdrawalAddress: { not: null } },
        select: {
          id: true,
          firstName: true,
          lastName: true,
          userId: true,
          pendingWithdrawalRequestedAt: true,
          user: { select: { email: true } },
        },
      }),
    ]);

  // Pull every existing auto-task in one shot so we can dedupe in memory.
  const existing = await prisma.adminTask.findMany({
    where: { autoGenerated: true, status: { in: ["OPEN", "SNOOZED"] } },
    select: { category: true, customerId: true, profileId: true, transactionId: true },
  });
  const seen = new Set(
    existing.map((t) =>
      `${t.category}::${t.customerId ?? ""}::${t.profileId ?? ""}::${t.transactionId ?? ""}`,
    ),
  );
  const has = (
    category: string,
    customerId: string | null,
    profileId: string | null,
    transactionId: string | null,
  ) =>
    seen.has(
      `${category}::${customerId ?? ""}::${profileId ?? ""}::${transactionId ?? ""}`,
    );

  const toCreate: Prisma.AdminTaskCreateManyInput[] = [];

  for (const u of blocked) {
    if (has("RESTRICTED_ACCOUNT", u.id, null, null)) continue;
    toCreate.push({
      title: `Restricted account: ${u.email}`,
      category: "RESTRICTED_ACCOUNT",
      priority: "HIGH",
      status: "OPEN",
      customerId: u.id,
      customerEmail: u.email,
      reason: u.blockedReason ?? "Account is currently blocked.",
      dueAt: new Date(now + 24 * 60 * 60 * 1000),
      autoGenerated: true,
      createdById: adminId,
    });
  }

  for (const p of stalePending) {
    if (has("PROFILE_REVIEW", p.userId, p.id, null)) continue;
    toCreate.push({
      title: `Profile awaiting review: ${p.firstName} ${p.lastName}`,
      category: "PROFILE_REVIEW",
      priority: "NORMAL",
      status: "OPEN",
      customerId: p.userId,
      profileId: p.id,
      customerEmail: p.user.email,
      profileName: `${p.firstName} ${p.lastName}`,
      reason: "Profile has been pending more than 48 hours.",
      dueAt: new Date(now + 24 * 60 * 60 * 1000),
      autoGenerated: true,
      createdById: adminId,
    });
  }

  for (const t of oldPendingTx) {
    if (has("PAYMENT_HOLD", t.userId, t.profileId, t.id)) continue;
    toCreate.push({
      title: `Payment pending confirmation — ${t.senderName}`,
      category: "PAYMENT_HOLD",
      priority: "HIGH",
      status: "OPEN",
      customerId: t.userId,
      profileId: t.profileId,
      transactionId: t.id,
      customerEmail: t.user.email,
      profileName: t.profile
        ? `${t.profile.firstName} ${t.profile.lastName}`
        : null,
      amountCents: t.amountCents,
      paidAt: t.createdAt,
      reason: "Payment received more than 72h ago and still pending.",
      dueAt: new Date(now + 24 * 60 * 60 * 1000),
      autoGenerated: true,
      createdById: adminId,
    });
  }

  for (const t of lateScheduled) {
    if (has("SCHEDULED_TRANSFER", t.userId, t.profileId, t.id)) continue;
    toCreate.push({
      title: `Scheduled transfer ETA passed`,
      category: "SCHEDULED_TRANSFER",
      priority: "URGENT",
      status: "OPEN",
      customerId: t.userId,
      profileId: t.profileId,
      transactionId: t.id,
      customerEmail: t.user.email,
      profileName: t.profile
        ? `${t.profile.firstName} ${t.profile.lastName}`
        : null,
      amountCents: t.amountCents,
      reason:
        "Scheduled-for time has elapsed without the transfer flipping to PENDING.",
      dueAt: t.scheduledFor ?? new Date(now),
      autoGenerated: true,
      createdById: adminId,
    });
  }

  for (const t of oldRefunds) {
    if (has("REFUND_FOLLOWUP", t.userId, t.profileId, t.id)) continue;
    toCreate.push({
      title: `Refund follow-up`,
      category: "REFUND_FOLLOWUP",
      priority: "NORMAL",
      status: "OPEN",
      customerId: t.userId,
      profileId: t.profileId,
      transactionId: t.id,
      customerEmail: t.user.email,
      profileName: t.profile
        ? `${t.profile.firstName} ${t.profile.lastName}`
        : null,
      amountCents: t.amountCents,
      reason: "Refund initiated over 7 days ago; confirm settlement completed.",
      dueAt: new Date(now + 3 * 24 * 60 * 60 * 1000),
      autoGenerated: true,
      createdById: adminId,
    });
  }

  for (const p of pendingAddressChanges) {
    if (has("COMPLIANCE_REVIEW", p.userId, p.id, null)) continue;
    const requested = p.pendingWithdrawalRequestedAt?.getTime() ?? now;
    toCreate.push({
      title: `Withdrawal address change: ${p.firstName} ${p.lastName}`,
      category: "COMPLIANCE_REVIEW",
      priority: "HIGH",
      status: "OPEN",
      customerId: p.userId,
      profileId: p.id,
      customerEmail: p.user.email,
      profileName: `${p.firstName} ${p.lastName}`,
      reason:
        "Customer submitted a new USDC withdrawal address. Verify the change before approving — settlements still route to the old address.",
      dueAt: new Date(requested + 24 * 60 * 60 * 1000),
      autoGenerated: true,
      createdById: adminId,
    });
  }

  let created = 0;
  if (toCreate.length > 0) {
    const res = await prisma.adminTask.createMany({ data: toCreate });
    created = res.count;
  }

  // Wake any snoozed tasks whose timer has elapsed.
  const woken = await prisma.adminTask.updateMany({
    where: {
      status: "SNOOZED",
      snoozedUntil: { lte: new Date() },
    },
    data: { status: "OPEN", snoozedUntil: null },
  });

  revalidatePath("/admin/tasks");
  revalidatePath("/admin");
  return { ok: true as const, created, woken: woken.count };
}

/** Permanently deletes the selected transactions (admin bulk-delete). */
export async function adminDeleteTransactions(ids: unknown) {
  await requireAdminId();
  if (
    !Array.isArray(ids) ||
    ids.length === 0 ||
    ids.some((id) => typeof id !== "string")
  ) {
    return { ok: false as const, error: "No transactions selected" };
  }

  const { count } = await prisma.transaction.deleteMany({
    where: { id: { in: ids as string[] } },
  });

  revalidatePath("/admin/transactions");
  revalidatePath("/admin");
  revalidatePath("/dashboard/transactions");
  revalidatePath("/dashboard");
  return { ok: true as const, deleted: count };
}
