import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth-guards";
import { AdminCustomersClient } from "./customers-client";

export const metadata = { title: "Customers" };

export default async function AdminCustomersPage() {
  await requireAdmin();
  const customers = await prisma.user.findMany({
    where: { role: "CUSTOMER" },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      email: true,
      name: true,
      createdAt: true,
      blocked: true,
      blockedReason: true,
      twoFactor: true,
      telegramId: true,
      _count: { select: { profiles: true, transactions: true } },
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold tracking-tight">Customers</h1>
        <p className="mt-1 text-muted-foreground">
          All registered customers. Block an account if fraudulent activity is
          detected — blocked customers can&apos;t sign in and are notified by email.
        </p>
      </div>
      <AdminCustomersClient
        customers={customers.map((c) => ({
          id: c.id,
          email: c.email,
          name: c.name,
          createdAt: c.createdAt,
          blocked: c.blocked,
          blockedReason: c.blockedReason,
          twoFactor: c.twoFactor,
          telegramId: c.telegramId,
          profiles: c._count.profiles,
          transactions: c._count.transactions,
        }))}
      />
    </div>
  );
}
