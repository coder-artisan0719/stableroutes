import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth-guards";
import { AdminTransactionsClient } from "./transactions-client";

export const metadata = { title: "Transactions" };

const STATUS_VALUES = [
  "ALL",
  "SCHEDULED",
  "PENDING",
  "COMPLETED",
  "REFUNDED",
] as const;

export default async function AdminTransactionsPage({
  searchParams,
}: {
  searchParams: { status?: string };
}) {
  await requireAdmin();
  const raw = (searchParams.status ?? "ALL").toUpperCase();
  const status = (STATUS_VALUES as readonly string[]).includes(raw)
    ? (raw as (typeof STATUS_VALUES)[number])
    : "ALL";

  const where = status === "ALL" ? {} : { status };

  const [rows, counts, approvedProfiles] = await Promise.all([
    prisma.transaction.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: { user: true, profile: true },
      take: 200,
    }),
    prisma.transaction.groupBy({
      by: ["status"],
      _count: true,
    }),
    prisma.customerProfile.findMany({
      where: { status: "APPROVED" },
      orderBy: [{ user: { email: "asc" } }, { firstName: "asc" }],
      select: {
        id: true,
        firstName: true,
        lastName: true,
        senderName: true,
        transferMethod: true,
        user: { select: { email: true, name: true } },
      },
    }),
  ]);

  const map = Object.fromEntries(counts.map((c) => [c.status, c._count]));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold tracking-tight">
          Transactions
        </h1>
        <p className="mt-1 text-muted-foreground">
          Log new pending payments and update their status. Customers are emailed
          on every state change.
        </p>
      </div>
      <AdminTransactionsClient
        transactions={rows.map((t) => ({
          ...t,
          userEmail: t.user.email,
          userName: t.user.name,
          profileName: `${t.profile.firstName} ${t.profile.lastName}`,
        }))}
        approvedProfiles={approvedProfiles.map((p) => ({
          id: p.id,
          firstName: p.firstName,
          lastName: p.lastName,
          senderName: p.senderName,
          transferMethod: p.transferMethod,
          userEmail: p.user.email,
          userName: p.user.name,
        }))}
        active={status}
        counts={{
          ALL: rows.length,
          SCHEDULED: map.SCHEDULED ?? 0,
          PENDING: map.PENDING ?? 0,
          COMPLETED: map.COMPLETED ?? 0,
          REFUNDED: map.REFUNDED ?? 0,
        }}
      />
    </div>
  );
}
