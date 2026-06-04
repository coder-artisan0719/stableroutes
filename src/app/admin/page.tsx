import Link from "next/link";
import {
  AlertTriangle,
  Banknote,
  ClipboardList,
  Clock,
  ShieldAlert,
  Undo2,
  Users,
  ArrowUpRight,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth-guards";
import { formatDateTime, formatUSD } from "@/lib/utils";
import {
  ProfileStatusBadge,
  TransactionStatusBadge,
} from "@/components/status-badge";

export const metadata = { title: "Admin Overview" };

export default async function AdminOverview() {
  await requireAdmin();

  const [
    txTotals,
    pendingProfiles,
    customers,
    recentTx,
    pendingProfilesList,
    openTaskCount,
    overdueTaskCount,
    openTasksList,
    pendingAddressList,
  ] = await Promise.all([
    prisma.transaction.groupBy({
      by: ["status"],
      _sum: { amountCents: true },
      _count: true,
    }),
    prisma.customerProfile.count({ where: { status: "PENDING" } }),
    prisma.user.count({ where: { role: "CUSTOMER" } }),
    prisma.transaction.findMany({
      orderBy: { createdAt: "desc" },
      take: 6,
      include: {
        user: { select: { email: true } },
        profile: { select: { firstName: true, lastName: true } },
      },
    }),
    prisma.customerProfile.findMany({
      where: { status: "PENDING" },
      orderBy: { createdAt: "asc" },
      take: 5,
      include: { user: { select: { email: true } } },
    }),
    prisma.adminTask.count({ where: { status: "OPEN" } }),
    prisma.adminTask.count({
      where: { status: "OPEN", dueAt: { lt: new Date() } },
    }),
    prisma.adminTask.findMany({
      where: { status: "OPEN" },
      orderBy: [{ priority: "desc" }, { dueAt: "asc" }, { createdAt: "desc" }],
      take: 5,
      select: {
        id: true,
        title: true,
        priority: true,
        amountCents: true,
        dueAt: true,
        customerEmail: true,
        profileName: true,
        category: true,
      },
    }),
    prisma.customerProfile.findMany({
      where: { pendingWithdrawalAddress: { not: null } },
      orderBy: { pendingWithdrawalRequestedAt: "asc" },
      take: 5,
      include: { user: { select: { email: true } } },
    }),
  ]);

  const pending = txTotals.find((t) => t.status === "PENDING");
  const completed = txTotals.find((t) => t.status === "COMPLETED");
  const refunded = txTotals.find((t) => t.status === "REFUNDED");

  const stats = [
    {
      label: "Settled total",
      value: formatUSD(completed?._sum.amountCents ?? 0),
      sub: `${completed?._count ?? 0} transactions`,
      icon: Banknote,
      bg: "bg-success/10",
      color: "text-success",
    },
    {
      label: "Pending value",
      value: formatUSD(pending?._sum.amountCents ?? 0),
      sub: `${pending?._count ?? 0} in pipeline`,
      icon: Clock,
      bg: "bg-warning/10",
      color: "text-warning",
    },
    {
      label: "Refunded",
      value: formatUSD(refunded?._sum.amountCents ?? 0),
      sub: `${refunded?._count ?? 0} reversed`,
      icon: Undo2,
      bg: "bg-destructive/10",
      color: "text-destructive",
    },
    {
      label: "Customers",
      value: String(customers),
      sub: `${pendingProfiles} profiles awaiting review`,
      icon: Users,
      bg: "bg-primary/10",
      color: "text-primary",
    },
    {
      label: "Open tasks",
      value: String(openTaskCount),
      sub:
        overdueTaskCount > 0
          ? `${overdueTaskCount} overdue — action needed`
          : "Queue is clear",
      icon: overdueTaskCount > 0 ? AlertTriangle : ClipboardList,
      bg: overdueTaskCount > 0 ? "bg-destructive/10" : "bg-primary/10",
      color:
        overdueTaskCount > 0 ? "text-destructive" : "text-primary",
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-3xl font-bold tracking-tight">
          Admin overview
        </h1>
        <p className="mt-1 text-muted-foreground">
          Operational snapshot of payments and customer profiles.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
        {stats.map((s) => (
          <Card key={s.label}>
            <CardContent className="flex items-center gap-4 p-5">
              <div
                className={`grid h-11 w-11 place-items-center rounded-lg ${s.bg} ${s.color}`}
              >
                <s.icon className="h-5 w-5" />
              </div>
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">
                  {s.label}
                </p>
                <p className="mt-0.5 text-xl font-semibold">{s.value}</p>
                <p className="text-xs text-muted-foreground">{s.sub}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Recent transactions</CardTitle>
            <Button asChild variant="ghost" size="sm">
              <Link href="/admin/transactions">View all</Link>
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            <ul className="divide-y divide-border">
              {recentTx.length === 0 && (
                <li className="px-6 py-12 text-center text-sm text-muted-foreground">
                  No transactions recorded yet.
                </li>
              )}
              {recentTx.map((t) => (
                <li
                  key={t.id}
                  className="flex items-center gap-4 px-6 py-4 text-sm"
                >
                  <div className="grid h-9 w-9 place-items-center rounded-lg bg-muted text-xs font-semibold">
                    {t.type}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium">
                      {t.user.email}
                    </div>
                    <div className="truncate text-xs text-muted-foreground">
                      {t.profile.firstName} {t.profile.lastName} ·{" "}
                      {formatDateTime(t.createdAt)}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold">{formatUSD(t.amountCents)}</div>
                    <div className="mt-1">
                      <TransactionStatusBadge status={t.status} />
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 text-warning" />
              Awaiting approval
            </CardTitle>
            <Button asChild variant="ghost" size="sm">
              <Link href="/admin/profiles">
                Review <ArrowUpRight className="h-4 w-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {pendingProfilesList.length === 0 ? (
              <p className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">
                Queue is clear. Nothing to review.
              </p>
            ) : (
              pendingProfilesList.map((p) => (
                <div
                  key={p.id}
                  className="rounded-lg border bg-card p-4"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">
                        {p.firstName} {p.lastName}
                      </p>
                      <p className="truncate text-xs text-muted-foreground">
                        {p.user.email}
                      </p>
                    </div>
                    <ProfileStatusBadge
                      status={p.status}
                      pendingKind={p.accountNumber ? "update" : "new"}
                    />
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      {pendingAddressList.length > 0 && (
        <Card className="border-warning/40">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 text-warning" />
              Withdrawal address changes pending approval
              <span className="ml-1 inline-flex items-center rounded-full bg-warning/15 px-2 py-0.5 text-xs font-medium text-warning">
                {pendingAddressList.length}
              </span>
            </CardTitle>
            <Button asChild variant="ghost" size="sm">
              <Link href="/admin/profiles?status=APPROVED">
                Review <ArrowUpRight className="h-4 w-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-2">
            {pendingAddressList.map((p) => (
              <div
                key={p.id}
                className="rounded-lg border bg-card p-3 text-sm"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="truncate font-medium">
                      {p.firstName} {p.lastName}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {p.user.email}
                    </p>
                  </div>
                  {p.pendingWithdrawalRequestedAt && (
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {formatDateTime(p.pendingWithdrawalRequestedAt)}
                    </span>
                  )}
                </div>
                <div className="mt-2 grid gap-0.5 text-[11px]">
                  <span className="break-all font-mono text-muted-foreground">
                    live: {p.withdrawalAddress}
                  </span>
                  <span className="break-all font-mono text-warning">
                    new: {p.pendingWithdrawalAddress}
                  </span>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle className="flex items-center gap-2">
            <ClipboardList className="h-4 w-4 text-primary" />
            Open follow-up tasks
            {overdueTaskCount > 0 && (
              <span className="ml-1 inline-flex items-center gap-1 rounded-full bg-destructive/10 px-2 py-0.5 text-xs font-medium text-destructive">
                <AlertTriangle className="h-3 w-3" /> {overdueTaskCount} overdue
              </span>
            )}
          </CardTitle>
          <Button asChild variant="ghost" size="sm">
            <Link href="/admin/tasks">
              Open queue <ArrowUpRight className="h-4 w-4" />
            </Link>
          </Button>
        </CardHeader>
        <CardContent className="space-y-2">
          {openTasksList.length === 0 ? (
            <p className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">
              No open tasks. Run <strong>Auto-detect</strong> from the Tasks
              page to surface any payments or accounts that need follow-up.
            </p>
          ) : (
            openTasksList.map((t) => {
              const overdue = t.dueAt && t.dueAt.getTime() < Date.now();
              return (
                <Link
                  key={t.id}
                  href="/admin/tasks"
                  className="block rounded-lg border bg-card p-3 transition-colors hover:bg-accent"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{t.title}</p>
                      <p className="truncate text-xs text-muted-foreground">
                        {t.customerEmail ?? "—"}
                        {t.profileName ? ` · ${t.profileName}` : ""}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      {t.amountCents != null && (
                        <div className="text-sm font-semibold">
                          {formatUSD(t.amountCents)}
                        </div>
                      )}
                      <div
                        className={`text-xs ${overdue ? "font-semibold text-destructive" : "text-muted-foreground"}`}
                      >
                        {t.dueAt
                          ? `${overdue ? "Overdue · " : "Due "}${formatDateTime(
                              t.dueAt,
                            )}`
                          : t.priority}
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })
          )}
        </CardContent>
      </Card>
    </div>
  );
}
