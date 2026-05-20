import type { Transaction, CustomerProfile } from "@prisma/client";

const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME ?? "StableRoute";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

const formatUSD = (cents: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
    cents / 100,
  );

function shell(title: string, body: string, cta?: { label: string; href: string }) {
  return `<!doctype html>
<html lang="en">
  <body style="margin:0;background:#f4f6fb;font-family:-apple-system,Segoe UI,Roboto,sans-serif;color:#0f172a;">
    <div style="max-width:560px;margin:32px auto;background:#ffffff;border-radius:14px;overflow:hidden;border:1px solid #e2e8f0;">
      <div style="padding:24px 28px;border-bottom:1px solid #e2e8f0;background:linear-gradient(135deg,#b45309,#f59e0b);color:#fff;">
        <div style="font-weight:700;font-size:18px;letter-spacing:-0.01em;">${APP_NAME}</div>
        <div style="font-size:12px;opacity:.85;margin-top:4px;">Custom-named USD bank for ACH &amp; Wire</div>
      </div>
      <div style="padding:28px;">
        <h1 style="margin:0 0 12px;font-size:20px;line-height:1.3;">${title}</h1>
        <div style="font-size:14px;line-height:1.6;color:#334155;">${body}</div>
        ${
          cta
            ? `<div style="margin-top:24px;"><a href="${cta.href}" style="display:inline-block;padding:10px 18px;background:#b45309;color:#fff;text-decoration:none;border-radius:8px;font-weight:500;font-size:14px;">${cta.label}</a></div>`
            : ""
        }
      </div>
      <div style="padding:18px 28px;border-top:1px solid #e2e8f0;font-size:12px;color:#64748b;background:#f8fafc;">
        You're receiving this because you have an account at ${APP_NAME}.
      </div>
    </div>
  </body>
</html>`;
}

function row(label: string, value: string) {
  return `<tr><td style="padding:8px 0;color:#64748b;font-size:13px;">${label}</td><td style="padding:8px 0;text-align:right;font-weight:500;font-size:13px;color:#0f172a;">${value}</td></tr>`;
}

export function welcomeEmail({ name }: { name: string }) {
  return shell(
    `Welcome to ${APP_NAME}, ${name}`,
    `<p>Your account is ready. Add a profile to start sending ACH or Wire transfers and receive settled funds to your USDC (Base) address.</p>`,
    { label: "Go to dashboard", href: `${APP_URL}/dashboard` },
  );
}

export function verificationCodeEmail({
  name,
  code,
  ttlMinutes,
}: {
  name: string;
  code: string;
  ttlMinutes: number;
}) {
  const codeBlock = `
    <div style="margin:24px 0;text-align:center;">
      <div style="display:inline-block;padding:18px 36px;background:#f1f5f9;border:1px solid #e2e8f0;border-radius:12px;font-family:monospace;font-size:32px;font-weight:700;letter-spacing:0.4em;color:#0f172a;">
        ${code}
      </div>
    </div>`;
  return shell(
    `Verify your email`,
    `<p>Hi ${name},</p>
     <p>Use this code to verify your email and finish creating your ${APP_NAME} account:</p>
     ${codeBlock}
     <p style="font-size:13px;color:#64748b;">This code expires in ${ttlMinutes} minutes. If you didn't request it, you can safely ignore this email.</p>`,
  );
}

function formatScheduledDate(d: Date) {
  return new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZoneName: "short",
  }).format(d);
}

export function transactionStatusEmail({
  name,
  transaction,
}: {
  name: string;
  transaction: Transaction;
}) {
  const statusLine =
    transaction.status === "COMPLETED"
      ? `Your transfer has settled successfully.`
      : transaction.status === "REFUNDED"
        ? `Your transfer has been refunded.${transaction.refundReason ? ` Reason: ${transaction.refundReason}.` : ""}`
        : transaction.status === "SCHEDULED" && transaction.scheduledFor
          ? `Your transfer is scheduled for <strong>${formatScheduledDate(new Date(transaction.scheduledFor))}</strong>. We'll process it automatically and email you again when it moves to Pending.`
          : `Your transfer is being processed. We'll email you again when it moves to its next state.`;

  const hashRow =
    transaction.status === "COMPLETED" && transaction.txHash
      ? row(
          "Settlement tx",
          `<a href="https://basescan.org/tx/${transaction.txHash}" style="color:#b45309;text-decoration:none;">${transaction.txHash.slice(0, 10)}…${transaction.txHash.slice(-8)}</a>`,
        )
      : "";

  const scheduledRow =
    transaction.status === "SCHEDULED" && transaction.scheduledFor
      ? row(
          "Scheduled for",
          formatScheduledDate(new Date(transaction.scheduledFor)),
        )
      : "";

  const body = `
    <p>Hi ${name},</p>
    <p>${statusLine}</p>
    <table style="width:100%;border-collapse:collapse;margin-top:16px;border-top:1px solid #e2e8f0;">
      ${row("Reference", transaction.reference)}
      ${row("Type", transaction.type)}
      ${row("Amount", formatUSD(transaction.amountCents))}
      ${row("Status", transaction.status)}
      ${row("Sender", transaction.senderName)}
      ${scheduledRow}
      ${hashRow}
    </table>`;
  return shell(`Transfer ${transaction.status.toLowerCase()}`, body, {
    label: "View transaction",
    href: `${APP_URL}/dashboard/transactions`,
  });
}

export function profileStatusEmail({
  name,
  profile,
}: {
  name: string;
  profile: CustomerProfile;
}) {
  const statusLine =
    profile.status === "APPROVED"
      ? `Your profile is approved. Share the bank details below with senders to receive ACH or Wire deposits — settled funds will be routed to your USDC (Base) address.`
      : `Your profile is under review. We'll notify you once it's approved.`;

  const bankBlock =
    profile.status === "APPROVED" && profile.accountNumber
      ? `
    <h2 style="margin:24px 0 8px;font-size:14px;text-transform:uppercase;letter-spacing:0.05em;color:#64748b;">Your USD account</h2>
    <table style="width:100%;border-collapse:collapse;border-top:1px solid #e2e8f0;">
      ${row("Bank", profile.bankName ?? "—")}
      ${row("Bank address", profile.bankAddress ?? "—")}
      ${row("Account number", profile.accountNumber ?? "—")}
      ${row("Routing number", profile.routingNumber ?? "—")}
      ${row("Accepts", profile.transferMethod === "BOTH" ? "ACH + Wire" : (profile.transferMethod ?? "—"))}
    </table>`
      : "";

  const body = `
    <p>Hi ${name},</p>
    <p>${statusLine}</p>
    <h2 style="margin:24px 0 8px;font-size:14px;text-transform:uppercase;letter-spacing:0.05em;color:#64748b;">Profile</h2>
    <table style="width:100%;border-collapse:collapse;border-top:1px solid #e2e8f0;">
      ${row("Account name", `${profile.firstName} ${profile.lastName}`)}
      ${row("Sender", profile.senderName)}
      ${row("Withdrawal (USDC Base)", profile.withdrawalAddress.slice(0, 10) + "…" + profile.withdrawalAddress.slice(-6))}
      ${row("Status", profile.status)}
    </table>
    ${bankBlock}`;
  return shell(`Profile ${profile.status.toLowerCase()}`, body, {
    label: "View profiles",
    href: `${APP_URL}/dashboard/profiles`,
  });
}
