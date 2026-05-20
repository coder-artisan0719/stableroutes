import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { issueVerificationCode } from "@/lib/verification";
import { sendVerificationCodeEmail } from "@/lib/email";

const schema = z.object({ email: z.string().email() });

export async function POST(request: Request) {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = schema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid email" }, { status: 400 });
  }

  const email = parsed.data.email.toLowerCase();
  const user = await prisma.user.findUnique({ where: { email } });
  // Return ok even if no user — prevents email enumeration.
  if (!user || user.emailVerified) {
    return NextResponse.json({ ok: true });
  }

  const code = await issueVerificationCode(email);
  void sendVerificationCodeEmail({
    userId: user.id,
    email: user.email,
    name: user.name,
    code,
  });
  return NextResponse.json({ ok: true });
}
