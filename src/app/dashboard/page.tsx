import Link from "next/link";
import { ArrowUpRight, Banknote, Clock, ShieldCheck, Wallet } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { prisma } from "@/lib/prisma";
import { requireCustomer } from "@/lib/auth-guards";
import { formatUSD, formatDate, truncateMiddle } from "@/lib/utils";
import {
  TransactionStatusBadge,
  ProfileStatusBadge,
} from "@/components/status-badge";

export const metadata = { title: "Overview" };

export default async function DashboardOverview() {
  const session = await requireCustomer();
  const userId = session.user.id;

  const [profiles, recent, totals] = await Promise.all([
    prisma.customerProfile.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 3,
    }),
    prisma.transaction.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 5,
      include: { profile: true },
    }),
    prisma.transaction.groupBy({
      by: ["status"],
      where: { userId },
      _sum: { amountCents: true },
      _count: true,
    }),
  ]);

  const pending = totals.find((t) => t.status === "PENDING");
  const completed = totals.find((t) => t.status === "COMPLETED");
  const refunded = totals.find((t) => t.status === "REFUNDED");
  const approvedProfiles = profiles.filter((p) => p.status === "APPROVED").length;

  const stats = [
    {
      label: "Settled (lifetime)",
      value: formatUSD(completed?._sum.amountCents ?? 0),
      sub: `${completed?._count ?? 0} transactions`,
      icon: Banknote,
      color: "text-success",
      bg: "bg-success/10",
    },
    {
      label: "Pending",
      value: formatUSD(pending?._sum.amountCents ?? 0),
      sub: `${pending?._count ?? 0} in flight`,
      icon: Clock,
      color: "text-warning",
      bg: "bg-warning/10",
    },
    {
      label: "Refunded",
      value: formatUSD(refunded?._sum.amountCents ?? 0),
      sub: `${refunded?._count ?? 0} reversed`,
      icon: Wallet,
      color: "text-destructive",
      bg: "bg-destructive/10",
    },
    {
      label: "Active profiles",
      value: String(approvedProfiles),
      sub: `${profiles.length} total`,
      icon: ShieldCheck,
      color: "text-primary",
      bg: "bg-primary/10",
    },
  ];

  return (
    <div className="space-y-8">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold tracking-tight">
            Welcome back{session.user.name ? `, ${session.user.name.split(" ")[0]}` : ""}
          </h1>
          <p className="mt-1 text-muted-foreground">
            Here&apos;s a snapshot of your account today.
          </p>
        </div>
        <Button asChild className="hidden sm:inline-flex">
          <Link href="/dashboard/profiles">
            New profile <ArrowUpRight />
          </Link>
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.label}>
            <CardContent className="flex items-center gap-4 p-5">
              <div className={`grid h-11 w-11 place-items-center rounded-lg ${s.bg} ${s.color}`}>
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
              <Link href="/dashboard/transactions">View all</Link>
            </Button>
          </CardHeader>
          <CardContent className="p-0">
            {recent.length === 0 ? (
              <div className="px-6 py-12 text-center text-sm text-muted-foreground">
                You haven&apos;t recorded any transactions yet. Once a profile is approved
                you&apos;ll see incoming ACH and Wire deposits here.
              </div>
            ) : (
              <ul className="divide-y divide-border">
                {recent.map((t) => (
                  <li
                    key={t.id}
                    className="flex items-center gap-4 px-6 py-4 text-sm"
                  >
                    <div className="grid h-9 w-9 place-items-center rounded-lg bg-muted text-xs font-semibold">
                      {t.type}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="truncate font-medium">{t.senderName}</div>
                      <div className="truncate text-xs text-muted-foreground">
                        {t.profile.firstName} {t.profile.lastName} · {formatDate(t.createdAt)}
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
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Profiles</CardTitle>
            <Button asChild variant="ghost" size="sm">
              <Link href="/dashboard/profiles">Manage</Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {profiles.length === 0 ? (
              <div className="rounded-lg border border-dashed p-4 text-center text-sm text-muted-foreground">
                <p className="mb-3">Add your first named profile to get started.</p>
                <Button asChild size="sm">
                  <Link href="/dashboard/profiles">Create profile</Link>
                </Button>
              </div>
            ) : (
              profiles.map((p) => (
                <div
                  key={p.id}
                  className="rounded-lg border bg-card p-4 transition-colors hover:bg-accent/30"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="text-sm font-medium">
                        {p.firstName} {p.lastName}
                      </p>
                      <p className="mt-0.5 font-mono text-xs text-muted-foreground">
                        {truncateMiddle(p.withdrawalAddress)}
                      </p>
                    </div>
                    <ProfileStatusBadge status={p.status} />
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
