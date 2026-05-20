import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function requireAuth() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  return session;
}

export async function requireAdmin() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role !== "ADMIN") redirect("/dashboard");

  // Stale session — the admin row no longer exists (deleted / DB reseeded).
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true },
  });
  if (!user) redirect("/login");

  return session;
}

export async function requireCustomer() {
  const session = await auth();
  if (!session?.user) redirect("/login");
  if (session.user.role === "ADMIN") redirect("/admin");

  // One DB read enforces two things: (1) the user still exists — a session
  // can outlive a deleted account; (2) the account isn't suspended.
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { blocked: true },
  });
  if (!user) redirect("/login"); // stale session — account no longer exists
  if (user.blocked) redirect("/login?blocked=1");

  return session;
}
