import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { issueVerificationCode } from "@/lib/verification";
import { sendVerificationCodeEmail } from "@/lib/email";

const schema = z.object({ email: z.string().email() });

/**
 * Called by the login form after a credentials sign-in fails, to distinguish
 * an unverified email account from wrong-password. If the account exists but
 * isn't verified, we also reissue a fresh code so the user doesn't have to
 * click "resend" manually after being redirected.
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
    select: { id: true, name: true, emailVerified: true, blocked: true },
  });

  if (!user) {
    return NextResponse.json({ needsVerification: false });
  }
  if (user.blocked) {
    return NextResponse.json({ blocked: true });
  }
  if (user.emailVerified) {
    return NextResponse.json({ needsVerification: false });
  }

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
