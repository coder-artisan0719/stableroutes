import Link from "next/link";
import { ArrowDownUp, BadgeCheck, Clock, Coins } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireCustomer } from "@/lib/auth-guards";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { TransactionStatusBadge } from "@/components/status-badge";
import { formatDate, formatUSD } from "@/lib/utils";
import { AnalyticsRangeFilter } from "./analytics-range-filter";

export const metadata = { title: "Analytics" };

const PERIODS = [
  { key: "today", label: "Today" },
  { key: "week", label: "This week" },
  { key: "month", label: "This month" },
] as const;

type Period = (typeof PERIODS)[number]["key"];

/** Start of the selected period (server-local time). */
function periodStart(period: Period): Date {
  const now = new Date();
  const midnight = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (period === "today") return midnight;
  if (period === "week") {
    // Week starts Monday.
    const offset = (midnight.getDay() + 6) % 7;
    midnight.setDate(midnight.getDate() - offset);
    return midnight;
  }
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

/** Validate a `YYYY-MM-DD` query value, returning it only if it's a real date. */
function validDateStr(raw: string | undefined): string | undefined {
  if (!raw || !/^\d{4}-\d{2}-\d{2}$/.test(raw)) return undefined;
  const d = new Date(`${raw}T00:00:00`);
  return Number.isNaN(d.getTime()) ? undefined : raw;
}

export default async function CustomerAnalyticsPage({
  searchParams,
}: {
  searchParams: { period?: string; from?: string; to?: string };
}) {
  const session = await requireCustomer();
  const userId = session.user.id;

  const fromStr = validDateStr(searchParams.from);
  const toStr = validDateStr(searchParams.to);
  const isCustom = Boolean(fromStr || toStr);

  const period: Period = PERIODS.some((p) => p.key === searchParams.period)
    ? (searchParams.period as Period)
    : "month";

  // A custom from/to range overrides the preset period.
  const rangeStart = isCustom
    ? fromStr
      ? new Date(`${fromStr}T00:00:00`)
      : undefined
    : periodStart(period);
  const rangeEnd =
    isCustom && toStr ? new Date(`${toStr}T23:59:59.999`) : undefined;

  const txns = await prisma.transaction.findMany({
    where: {
      userId,
      createdAt: {
        ...(rangeStart ? { gte: rangeStart } : {}),
        ...(rangeEnd ? { lte: rangeEnd } : {}),
      },
    },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      amountCents: true,
      status: true,
      commissionPct: true,
      createdAt: true,
      senderName: true,
      type: true,
    },
  });

  let totalVolume = 0;
  let settledBalance = 0;
  let completedCount = 0;
  let pendingCount = 0;

  for (const t of txns) {
    totalVolume += t.amountCents;
    if (t.status === "COMPLETED") {
      completedCount += 1;
      // Net amount received after the commission fee is deducted.
      settledBalance += Math.round(t.amountCents * (1 - t.commissionPct / 100));
    } else if (t.status === "SCHEDULED" || t.status === "PENDING") {
      pendingCount += 1;
    }
  }

  const stats = [
    {
      label: "Transactions",
      value: String(txns.length),
      sub: `${completedCount} completed`,
      icon: ArrowDownUp,
    },
    {
      label: "Total volume",
      value: formatUSD(totalVolume),
      sub: "All statuses",
      icon: Coins,
    },
    {
      label: "Settled balance",
      value: formatUSD(settledBalance),
      sub: "Net of commission",
      icon: BadgeCheck,
    },
    {
      label: "Pending",
      value: String(pendingCount),
      sub: "In flight",
      icon: Clock,
    },
  ];

  const recent = txns.slice(0, 8);
  const txnsHref = isCustom
    ? `/dashboard/transactions?${[
        fromStr && `from=${fromStr}`,
        toStr && `to=${toStr}`,
      ]
        .filter(Boolean)
        .join("&")}`
    : "/dashboard/transactions";

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold tracking-tight">
          Analytics
        </h1>
        <p className="mt-1 text-muted-foreground">
          Your transfer activity at a glance — pick a preset or a custom date
          range.
        </p>
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex flex-wrap gap-1 rounded-lg border bg-card p-1 text-sm">
          {PERIODS.map((p) => (
            <Link
              key={p.key}
              href={
                p.key === "month"
                  ? "/dashboard/analytics"
                  : `/dashboard/analytics?period=${p.key}`
              }
              className={`rounded-md px-4 py-2 font-medium transition-colors ${
                !isCustom && period === p.key
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-accent"
              }`}
            >
              {p.label}
            </Link>
          ))}
        </div>
        <AnalyticsRangeFilter from={fromStr} to={toStr} />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.label}>
            <CardContent className="flex items-center gap-4 p-5">
              <div className="grid h-11 w-11 place-items-center rounded-lg bg-primary/10 text-primary">
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

      <Card>
        <CardContent className="p-0">
          <div className="flex items-center justify-between border-b px-6 py-4">
            <h2 className="text-sm font-semibold">
              Transactions in this period
            </h2>
            {txns.length > recent.length && (
              <Button asChild variant="ghost" size="sm">
                <Link href={txnsHref}>View all</Link>
              </Button>
            )}
          </div>
          {recent.length === 0 ? (
            <div className="px-6 py-12 text-center text-sm text-muted-foreground">
              {isCustom
                ? "No transactions in the selected date range."
                : "No transactions in this period."}
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
                      {formatDate(t.createdAt)}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold">
                      {formatUSD(t.amountCents)}
                    </div>
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
    </div>
  );
}
