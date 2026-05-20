import { Resend } from "resend";
import { prisma } from "@/lib/prisma";
import {
  transactionStatusEmail,
  profileStatusEmail,
  welcomeEmail,
  verificationCodeEmail,
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
