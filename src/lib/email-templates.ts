import type { Transaction, CustomerProfile } from "@prisma/client";

const APP_NAME = process.env.NEXT_PUBLIC_APP_NAME ?? "StableRoute";
const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

const formatUSD = (cents: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
    cents / 100,
  );

// Banner color per email tone — solid color + gradient enhancement.
type BannerTone = "gold" | "green" | "red" | "blue";

const BANNER: Record<BannerTone, { solid: string; gradient: string }> = {
  gold: {
    solid: "#b45309",
    gradient: "linear-gradient(135deg,#b45309 0%,#f59e0b 60%,#fbbf24 100%)",
  },
  green: {
    solid: "#15803d",
    gradient: "linear-gradient(135deg,#166534 0%,#16a34a 60%,#22c55e 100%)",
  },
  red: {
    solid: "#b91c1c",
    gradient: "linear-gradient(135deg,#991b1b 0%,#dc2626 60%,#ef4444 100%)",
  },
  blue: {
    solid: "#1d4ed8",
    gradient: "linear-gradient(135deg,#1e40af 0%,#2563eb 60%,#3b82f6 100%)",
  },
};

// Email-safe, table-based layout. Inline styles only; solid colors with
// gradient enhancement (Outlook ignores gradients and falls back gracefully).
function shell(
  title: string,
  body: string,
  cta?: { label: string; href: string },
  tone: BannerTone = "gold",
) {
  const year = new Date().getFullYear();
  const banner = BANNER[tone];
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <meta name="color-scheme" content="light only" />
    <title>${APP_NAME}</title>
  </head>
  <body style="margin:0;padding:0;background:#eef0f5;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#0f172a;-webkit-font-smoothing:antialiased;">
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;">${title}</div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#eef0f5;">
      <tr>
        <td align="center" style="padding:32px 16px;">
          <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:600px;max-width:600px;background:#ffffff;border-radius:16px;overflow:hidden;border:1px solid #e2e8f0;">

            <!-- LOGO HEADER -->
            <tr>
              <td style="padding:22px 32px;border-bottom:1px solid #eef0f5;background:#ffffff;">
                <table role="presentation" cellpadding="0" cellspacing="0">
                  <tr>
                    <td style="vertical-align:middle;">
                      <table role="presentation" cellpadding="0" cellspacing="0">
                        <tr>
                          <td style="width:38px;height:38px;background:#f59e0b;border-radius:10px;text-align:center;vertical-align:middle;color:#ffffff;font-size:16px;font-weight:800;letter-spacing:-0.02em;">$R</td>
                          <td style="padding-left:10px;vertical-align:middle;font-size:19px;font-weight:700;letter-spacing:-0.02em;">
                            <span style="color:#0f172a;">Stable</span><span style="color:#b45309;">Route</span>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

            <!-- BANNER -->
            <tr>
              <td style="background-color:${banner.solid};background:${banner.gradient};padding:34px 32px;">
                <div style="font-size:11px;font-weight:700;letter-spacing:0.14em;text-transform:uppercase;color:rgba(255,255,255,0.72);">${APP_NAME}</div>
                <div style="margin-top:8px;font-size:23px;line-height:1.3;font-weight:700;color:#ffffff;">${title}</div>
              </td>
            </tr>

            <!-- BODY -->
            <tr>
              <td style="padding:30px 32px;font-size:14px;line-height:1.65;color:#334155;">
                ${body}
                ${
                  cta
                    ? `<table role="presentation" cellpadding="0" cellspacing="0" style="margin-top:26px;">
                         <tr>
                           <td style="background:#b45309;border-radius:9px;">
                             <a href="${cta.href}" style="display:inline-block;padding:12px 24px;color:#ffffff;text-decoration:none;font-weight:600;font-size:14px;">${cta.label}</a>
                           </td>
                         </tr>
                       </table>`
                    : ""
                }
              </td>
            </tr>

            <!-- FOOTER -->
            <tr>
              <td style="padding:22px 32px;border-top:1px solid #eef0f5;background:#f8fafc;">
                <table role="presentation" cellpadding="0" cellspacing="0" width="100%">
                  <tr>
                    <td style="font-size:12px;color:#64748b;line-height:1.6;">
                      <a href="${APP_URL}/dashboard" style="color:#b45309;text-decoration:none;font-weight:600;">Dashboard</a>
                      &nbsp;&middot;&nbsp;
                      <a href="${APP_URL}/contact" style="color:#b45309;text-decoration:none;font-weight:600;">Support</a>
                      &nbsp;&middot;&nbsp;
                      <a href="${APP_URL}/legal/privacy" style="color:#b45309;text-decoration:none;font-weight:600;">Privacy</a>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding-top:12px;font-size:11px;color:#94a3b8;line-height:1.6;">
                      You're receiving this because you have an account at ${APP_NAME}.
                      Banking services provided by partner FDIC-insured institutions.
                      USDC is issued by Circle; crypto holdings are not FDIC-insured.
                      <br /><br />
                      © ${year} ${APP_NAME}, Inc. All rights reserved.
                    </td>
                  </tr>
                </table>
              </td>
            </tr>

          </table>
        </td>
      </tr>
    </table>
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

function codeBox(code: string) {
  return `
    <div style="margin:24px 0;text-align:center;">
      <div style="display:inline-block;padding:18px 36px;background:#f1f5f9;border:1px solid #e2e8f0;border-radius:12px;font-family:monospace;font-size:32px;font-weight:700;letter-spacing:0.4em;color:#0f172a;">
        ${code}
      </div>
    </div>`;
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
  return shell(
    `Verify your email`,
    `<p>Hi ${name},</p>
     <p>Use this code to verify your email and finish creating your ${APP_NAME} account:</p>
     ${codeBox(code)}
     <p style="font-size:13px;color:#64748b;">This code expires in ${ttlMinutes} minutes. If you didn't request it, you can safely ignore this email.</p>`,
  );
}

export function passwordResetEmail({
  name,
  code,
  ttlMinutes,
}: {
  name: string;
  code: string;
  ttlMinutes: number;
}) {
  return shell(
    `Reset your password`,
    `<p>Hi ${name},</p>
     <p>We received a request to reset the password on your ${APP_NAME} account. Enter this code to choose a new password:</p>
     ${codeBox(code)}
     <p style="font-size:13px;color:#64748b;">This code expires in ${ttlMinutes} minutes. If you didn't request a password reset, you can safely ignore this email — your password won't change.</p>`,
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

  // For a settled transfer, show the amount the customer actually received
  // (after the commission fee) — not the original gross amount.
  const feeCents = Math.round(
    (transaction.amountCents * transaction.commissionPct) / 100,
  );
  const netCents = transaction.amountCents - feeCents;
  const isCompleted = transaction.status === "COMPLETED";

  const amountRows = isCompleted
    ? (transaction.commissionPct > 0
        ? row(
            "Commission",
            `${transaction.commissionPct}% (−${formatUSD(feeCents)})`,
          )
        : "") + row("Amount settled", formatUSD(netCents))
    : row("Amount", formatUSD(transaction.amountCents));

  const body = `
    <p>Hi ${name},</p>
    <p>${statusLine}</p>
    <table style="width:100%;border-collapse:collapse;margin-top:16px;border-top:1px solid #e2e8f0;">
      ${row("Reference", transaction.reference)}
      ${row("Type", transaction.type)}
      ${amountRows}
      ${row("Status", transaction.status)}
      ${row("Sender", transaction.senderName)}
      ${scheduledRow}
      ${hashRow}
    </table>`;

  const tone: BannerTone =
    transaction.status === "COMPLETED"
      ? "green"
      : transaction.status === "REFUNDED"
        ? "red"
        : transaction.status === "SCHEDULED"
          ? "blue"
          : "gold";

  return shell(
    `Transfer ${transaction.status.toLowerCase()}`,
    body,
    { label: "View transaction", href: `${APP_URL}/dashboard/transactions` },
    tone,
  );
}

export function accountStatusEmail({
  name,
  blocked,
  reason,
}: {
  name: string;
  blocked: boolean;
  reason?: string | null;
}) {
  if (blocked) {
    return shell(
      "Your account has been suspended",
      `<p>Hi ${name},</p>
       <p>Your ${APP_NAME} account has been suspended${
         reason ? ` for the following reason: <strong>${reason}</strong>` : ""
       }.</p>
       <p>While your account is suspended you won't be able to sign in or access
       your dashboard, and no transfers will be processed. If you believe this
       was done in error, please contact our support team.</p>`,
      { label: "Contact support", href: `${APP_URL}/contact` },
      "red",
    );
  }
  return shell(
    "Your account has been reinstated",
    `<p>Hi ${name},</p>
     <p>Good news — your ${APP_NAME} account has been reinstated. You can sign
     in again and resume using your dashboard.</p>`,
    { label: "Sign in", href: `${APP_URL}/login` },
    "green",
  );
}

export function adminNewProfileEmail({
  profile,
  customerName,
  customerEmail,
}: {
  profile: CustomerProfile;
  customerName: string | null;
  customerEmail: string;
}) {
  const body = `
    <p>A customer just submitted a new profile — it's waiting for review and approval.</p>
    <table style="width:100%;border-collapse:collapse;margin-top:16px;border-top:1px solid #e2e8f0;">
      ${row("Customer", `${customerName ?? "—"} (${customerEmail})`)}
      ${row("Account name", `${profile.firstName} ${profile.lastName}`)}
      ${row("Sender", profile.senderName)}
      ${row("Withdrawal (USDC Base)", profile.withdrawalAddress.slice(0, 10) + "…" + profile.withdrawalAddress.slice(-6))}
    </table>`;
  return shell("New profile submitted for review", body, {
    label: "Review in admin panel",
    href: `${APP_URL}/admin/profiles`,
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
      : profile.status === "REJECTED"
        ? `Your profile was not approved.${
            profile.notes ? ` Reason: <strong>${profile.notes}</strong>.` : ""
          } You can edit the profile and resubmit it for review.`
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

  const tone: BannerTone =
    profile.status === "APPROVED"
      ? "green"
      : profile.status === "REJECTED"
        ? "red"
        : "gold";

  return shell(
    `Profile ${profile.status.toLowerCase()}`,
    body,
    { label: "View profiles", href: `${APP_URL}/dashboard/profiles` },
    tone,
  );
}
