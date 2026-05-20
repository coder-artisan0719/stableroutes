import crypto from "crypto";
import { prisma } from "@/lib/prisma";

export const CODE_LENGTH = 6;
export const CODE_TTL_MINUTES = 15;

/** Code purpose — namespaces codes so an email-verify code can't be reused
 *  as a password-reset code (and vice versa). */
export type CodeScope = "verify" | "reset";

function identifierFor(email: string, scope: CodeScope) {
  return `${scope}:${email.toLowerCase()}`;
}

/** Generate a numeric 6-digit verification code as a string. */
export function generateCode(): string {
  const n = crypto.randomInt(0, 1_000_000);
  return String(n).padStart(CODE_LENGTH, "0");
}

/**
 * Replace any existing codes for this email+scope with a fresh one.
 * Stored in the NextAuth `VerificationToken` table.
 */
export async function issueVerificationCode(
  email: string,
  scope: CodeScope = "verify",
): Promise<string> {
  const identifier = identifierFor(email, scope);
  const code = generateCode();
  const expires = new Date(Date.now() + CODE_TTL_MINUTES * 60 * 1000);

  await prisma.verificationToken.deleteMany({ where: { identifier } });
  await prisma.verificationToken.create({
    data: { identifier, token: code, expires },
  });
  return code;
}

/**
 * Returns ok and clears the code if it matches and hasn't expired.
 */
export async function consumeVerificationCode(
  email: string,
  code: string,
  scope: CodeScope = "verify",
): Promise<{ ok: boolean; reason?: "not-found" | "expired" | "mismatch" }> {
  const identifier = identifierFor(email, scope);
  const trimmed = code.trim();

  const record = await prisma.verificationToken.findFirst({
    where: { identifier },
  });
  if (!record) return { ok: false, reason: "not-found" };
  if (record.expires < new Date()) {
    await prisma.verificationToken.deleteMany({ where: { identifier } });
    return { ok: false, reason: "expired" };
  }
  if (record.token !== trimmed) return { ok: false, reason: "mismatch" };

  await prisma.verificationToken.deleteMany({ where: { identifier } });
  return { ok: true };
}
