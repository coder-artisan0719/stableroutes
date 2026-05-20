import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { resetPasswordSchema } from "@/lib/validators";
import { consumeVerificationCode } from "@/lib/verification";

export async function POST(request: Request) {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const parsed = resetPasswordSchema.safeParse(payload);
  if (!parsed.success) {
    return NextResponse.json(
      { error: parsed.error.issues[0]?.message ?? "Invalid input" },
      { status: 400 },
    );
  }
  const email = parsed.data.email.toLowerCase();

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    return NextResponse.json({ error: "Account not found" }, { status: 404 });
  }

  const result = await consumeVerificationCode(email, parsed.data.code, "reset");
  if (!result.ok) {
    const message =
      result.reason === "expired"
        ? "That code has expired — request a new one."
        : result.reason === "not-found"
          ? "No active reset code. Request a new one."
          : "Incorrect code.";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 12);
  await prisma.user.update({
    where: { id: user.id },
    data: {
      passwordHash,
      // Receiving the code proves email ownership — verify it if it wasn't.
      emailVerified: user.emailVerified ?? new Date(),
    },
  });

  return NextResponse.json({ ok: true });
}
