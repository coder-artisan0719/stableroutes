import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { signupSchema } from "@/lib/validators";
import { issueVerificationCode } from "@/lib/verification";
import { sendVerificationCodeEmail } from "@/lib/email";

export async function POST(request: Request) {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = signupSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 },
    );
  }

  const email = parsed.data.email.toLowerCase();

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    if (existing.emailVerified) {
      return NextResponse.json(
        { error: "An account with this email already exists" },
        { status: 409 },
      );
    }
    // Existing but unverified — refresh password + reissue code.
    const passwordHash = await bcrypt.hash(parsed.data.password, 12);
    await prisma.user.update({
      where: { id: existing.id },
      data: { passwordHash, name: parsed.data.name },
    });
    const code = await issueVerificationCode(email);
    void sendVerificationCodeEmail({
      userId: existing.id,
      email,
      name: parsed.data.name,
      code,
    });
    return NextResponse.json({ ok: true, email });
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 12);
  const user = await prisma.user.create({
    data: {
      email,
      name: parsed.data.name,
      passwordHash,
      // emailVerified stays null until the code is consumed.
    },
  });

  const code = await issueVerificationCode(email);
  void sendVerificationCodeEmail({
    userId: user.id,
    email: user.email,
    name: user.name,
    code,
  });

  return NextResponse.json({ ok: true, email });
}
