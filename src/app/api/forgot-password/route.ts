import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { forgotPasswordSchema } from "@/lib/validators";
import { issueVerificationCode } from "@/lib/verification";
import { sendPasswordResetEmail } from "@/lib/email";

export async function POST(request: Request) {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = forgotPasswordSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: "Enter a valid email" }, { status: 400 });
  }
  const email = parsed.data.email.toLowerCase();

  const user = await prisma.user.findUnique({ where: { email } });
  // Always respond ok — never reveal whether an account exists.
  if (user) {
    const code = await issueVerificationCode(email, "reset");
    void sendPasswordResetEmail({
      userId: user.id,
      email: user.email,
      name: user.name,
      code,
    });
  }

  return NextResponse.json({ ok: true });
}
