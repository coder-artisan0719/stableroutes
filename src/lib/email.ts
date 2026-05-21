import { Resend } from "resend";
import { prisma } from "@/lib/prisma";
import {
  transactionStatusEmail,
  profileStatusEmail,
  welcomeEmail,
  verificationCodeEmail,
  passwordResetEmail,
  adminNewProfileEmail,
  accountStatusEmail,
  credentialsUpdatedEmail,
  announcementEmail,
} from "@/lib/email-templates";
import { CODE_TTL_MINUTES } from "@/lib/verification";
import type { Transaction, CustomerProfile } from "@prisma/client";

const FROM = process.env.EMAIL_FROM ?? "StableRoute <no-reply@stableroute.io>";

const resend = process.env.RESEND_API_KEY
  ? new Resend(process.env.RESEND_API_KEY)
  : null;

async function send(opts: {
  userId: string;
  to: string;
  subject: string;
  html: string;
}) {
  const record = await prisma.notification.create({
    data: {
      userId: opts.userId,
      subject: opts.subject,
      body: opts.html,
    },
  });

  if (!resend) {
    // No API key set — still log it for visibility but don't break flows.
    console.warn("[email] RESEND_API_KEY not set; skipping send to", opts.to);
    return record;
  }

  try {
    const result = await resend.emails.send({
      from: FROM,
      to: opts.to,
      subject: opts.subject,
      html: opts.html,
    });
    // Resend SDK returns { error } on rejection without throwing — handle both paths.
    if (result.error) {
      const msg = `${result.error.name}: ${result.error.message}`;
      await prisma.notification.update({
        where: { id: record.id },
        data: { error: msg },
      });
      console.error("[email] rejected by Resend:", msg);
    } else {
      await prisma.notification.update({
        where: { id: record.id },
        data: { sentAt: new Date() },
      });
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    await prisma.notification.update({
      where: { id: record.id },
      data: { error: msg },
    });
    console.error("[email] send threw:", msg);
  }

  return record;
}

export async function sendWelcomeEmail(user: {
  id: string;
  email: string;
  name: string | null;
}) {
  return send({
    userId: user.id,
    to: user.email,
    subject: "Welcome to StableRoute",
    html: welcomeEmail({ name: user.name ?? "there" }),
  });
}

export async function sendVerificationCodeEmail(args: {
  userId: string;
  email: string;
  name: string | null;
  code: string;
}) {
  // Dev mode: print the code prominently so local testing doesn't depend on
  // email delivery. Stripped in production builds.
  if (process.env.NODE_ENV !== "production") {
    const line = "═".repeat(56);
    console.log(
      `\n${line}\n  📬 VERIFICATION CODE for ${args.email}\n  →  ${args.code}\n  (expires in ${CODE_TTL_MINUTES} min)\n${line}\n`,
    );
  }
  return send({
    userId: args.userId,
    to: args.email,
    subject: "Your StableRoute verification code",
    html: verificationCodeEmail({
      name: args.name ?? "there",
      code: args.code,
      ttlMinutes: CODE_TTL_MINUTES,
    }),
  });
}

export async function sendPasswordResetEmail(args: {
  userId: string;
  email: string;
  name: string | null;
  code: string;
}) {
  if (process.env.NODE_ENV !== "production") {
    const line = "═".repeat(56);
    console.log(
      `\n${line}\n  🔑 PASSWORD RESET CODE for ${args.email}\n  →  ${args.code}\n  (expires in ${CODE_TTL_MINUTES} min)\n${line}\n`,
    );
  }
  return send({
    userId: args.userId,
    to: args.email,
    subject: "Reset your StableRoute password",
    html: passwordResetEmail({
      name: args.name ?? "there",
      code: args.code,
      ttlMinutes: CODE_TTL_MINUTES,
    }),
  });
}

export async function sendTransactionStatusEmail(args: {
  user: { id: string; email: string; name: string | null };
  transaction: Transaction;
}) {
  const { user, transaction } = args;
  const subject =
    transaction.status === "COMPLETED"
      ? "Your transfer has been completed"
      : transaction.status === "REFUNDED"
        ? "Your transfer was refunded"
        : transaction.status === "SCHEDULED"
          ? "Your transfer is scheduled"
          : "Your transfer is pending";
  return send({
    userId: user.id,
    to: user.email,
    subject,
    html: transactionStatusEmail({
      name: user.name ?? "there",
      transaction,
    }),
  });
}

/** Notifies every admin user that a customer submitted a new profile. */
export async function sendAdminNewProfileEmail(args: {
  profile: CustomerProfile;
  customer: { email: string; name: string | null };
}) {
  const admins = await prisma.user.findMany({
    where: { role: "ADMIN" },
    select: { id: true, email: true },
  });
  const html = adminNewProfileEmail({
    profile: args.profile,
    customerName: args.customer.name,
    customerEmail: args.customer.email,
  });
  for (const admin of admins) {
    await send({
      userId: admin.id,
      to: admin.email,
      subject: "New profile submitted for review",
      html,
    });
  }
}

export async function sendAccountStatusEmail(args: {
  user: { id: string; email: string; name: string | null };
  blocked: boolean;
  reason?: string | null;
}) {
  return send({
    userId: args.user.id,
    to: args.user.email,
    subject: args.blocked
      ? "Your StableRoute account has been suspended"
      : "Your StableRoute account has been reinstated",
    html: accountStatusEmail({
      name: args.user.name ?? "there",
      blocked: args.blocked,
      reason: args.reason,
    }),
  });
}

/**
 * Broadcasts an announcement (new feature / maintenance) to every active
 * customer. Blocked accounts are skipped. Returns how many were emailed.
 */
export async function sendAnnouncementToAllCustomers(args: {
  type: "FEATURE" | "MAINTENANCE" | "GENERAL";
  subject: string;
  message: string;
  scheduledLabel?: string | null;
}) {
  const customers = await prisma.user.findMany({
    where: { role: "CUSTOMER", blocked: false },
    select: { id: true, email: true, name: true },
  });
  for (const customer of customers) {
    await send({
      userId: customer.id,
      to: customer.email,
      subject: args.subject,
      html: announcementEmail({
        name: customer.name ?? "there",
        type: args.type,
        heading: args.subject,
        message: args.message,
        scheduledLabel: args.scheduledLabel,
      }),
    });
  }
  return customers.length;
}

export async function sendCredentialsUpdatedEmail(args: {
  user: { id: string; name: string | null };
  to: string;
  emailChanged: boolean;
  passwordChanged: boolean;
  newEmail: string;
}) {
  return send({
    userId: args.user.id,
    to: args.to,
    subject: "Your StableRoute sign-in details were updated",
    html: credentialsUpdatedEmail({
      name: args.user.name ?? "there",
      emailChanged: args.emailChanged,
      passwordChanged: args.passwordChanged,
      newEmail: args.newEmail,
    }),
  });
}

export async function sendProfileStatusEmail(args: {
  user: { id: string; email: string; name: string | null };
  profile: CustomerProfile;
}) {
  const { user, profile } = args;
  const subject =
    profile.status === "APPROVED"
      ? "Your profile has been approved"
      : "Your profile is under review";
  return send({
    userId: user.id,
    to: user.email,
    subject,
    html: profileStatusEmail({ name: user.name ?? "there", profile }),
  });
}
