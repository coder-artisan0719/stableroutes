import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { issueVerificationCode } from "@/lib/verification";
import { sendVerificationCodeEmail } from "@/lib/email";

const schema = z.object({
  email: z.string().email(),
  password: z.string().optional(),
});

/**
 * Called by the login form after a credentials sign-in fails, to explain why.
 * Distinguishes an unverified or blocked account from a wrong password, and —
 * when the password is actually correct — reports that a 2FA code is required.
 * Unverified accounts also get a fresh code reissued automatically.
 */
export async function POST(request: Request) {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ needsVerification: false });
  }
  const parsed = schema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ needsVerification: false });
  }

  const email = parsed.data.email.toLowerCase();
  const user = await prisma.user.findUnique({
    where: { email },
    select: {
      id: true,
      name: true,
      emailVerified: true,
      blocked: true,
      passwordHash: true,
      twoFactor: true,
    },
  });

  if (!user) {
    return NextResponse.json({ needsVerification: false });
  }
  if (user.blocked) {
    return NextResponse.json({ blocked: true });
  }
  if (!user.emailVerified) {
    // Unverified — reissue a fresh code in the background.
    const code = await issueVerificationCode(email);
    void sendVerificationCodeEmail({
      userId: user.id,
      email,
      name: user.name,
      code,
    });
    return NextResponse.json({ needsVerification: true });
  }

  // Verified and not blocked — if the supplied password is correct and 2FA is
  // on, the sign-in failed only because a code is still needed.
  if (
    parsed.data.password &&
    user.passwordHash &&
    user.twoFactor &&
    (await bcrypt.compare(parsed.data.password, user.passwordHash))
  ) {
    return NextResponse.json({ twoFactorRequired: true });
  }

  return NextResponse.json({ needsVerification: false });
}
