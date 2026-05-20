import crypto from "crypto";
import { prisma } from "@/lib/prisma";

export const CODE_LENGTH = 6;
export const CODE_TTL_MINUTES = 15;

/** Generate a numeric 6-digit verification code as a string. */
export function generateCode(): string {
  // Cryptographically-secure 0-999999, zero-padded.
  const n = crypto.randomInt(0, 1_000_000);
  return String(n).padStart(CODE_LENGTH, "0");
}

/**
 * Replace any existing codes for this email with a fresh one.
 * Uses the NextAuth `VerificationToken` table as storage.
 */
export async function issueVerificationCode(email: string): Promise<string> {
  const normalized = email.toLowerCase();
  const code = generateCode();
  const expires = new Date(Date.now() + CODE_TTL_MINUTES * 60 * 1000);

  // Wipe any previous codes for this address.
  await prisma.verificationToken.deleteMany({
    where: { identifier: normalized },
  });
  await prisma.verificationToken.create({
    data: { identifier: normalized, token: code, expires },
  });
  return code;
}

/**
 * Returns true and clears the code if it matches and hasn't expired.
 * Returns false otherwise.
 */
export async function consumeVerificationCode(
  email: string,
  code: string,
): Promise<{ ok: boolean; reason?: "not-found" | "expired" | "mismatch" }> {
  const normalized = email.toLowerCase();
  const trimmed = code.trim();

  const record = await prisma.verificationToken.findFirst({
    where: { identifier: normalized },
  });
  if (!record) return { ok: false, reason: "not-found" };
  if (record.expires < new Date()) {
    await prisma.verificationToken.deleteMany({
      where: { identifier: normalized },
    });
    return { ok: false, reason: "expired" };
  }
  if (record.token !== trimmed) return { ok: false, reason: "mismatch" };

  await prisma.verificationToken.deleteMany({
    where: { identifier: normalized },
  });
  return { ok: true };
}
