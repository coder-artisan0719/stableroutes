import Link from "next/link";
import { Coins, Percent, ShieldCheck, TrendingUp, Wallet } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth-guards";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDate, formatUSD } from "@/lib/utils";
import { isRevenuePasscodeSet, isRevenueUnlocked } from "@/lib/revenue-gate";
import {
  ExpenseRateCell,
  LockRevenueButton,
  RevenuePasscodeGate,
  RevenueRangeFilter,
} from "./revenue-client";

export const metadata = { title: "Revenue" };

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

function PageHeader() {
  return (
    <div>
      <h1 className="font-display text-3xl font-bold tracking-tight">Revenue</h1>
      <p className="mt-1 text-muted-foreground">
        Net revenue after expenses — commission collected minus your cost rate.
      </p>
    </div>
  );
}

export default async function AdminRevenuePage({
  searchParams,
}: {
  searchParams: { period?: string; from?: string; to?: string };
}) {
  await requireAdmin();

  // Gate 1: the feature is unavailable until a passcode is configured.
  if (!isRevenuePasscodeSet()) {
    return (
      <div className="space-y-6">
        <PageHeader />
        <Card className="mx-auto max-w-md">
          <CardContent className="space-y-2 p-6 text-center">
            <h2 className="text-lg font-semibold">Passcode not configured</h2>
            <p className="text-sm text-muted-foreground">
              Set a <code className="font-mono">REVENUE_PASSCODE</code>{" "}
              environment variable on the server to enable this page. Until
              then, revenue figures stay hidden from everyone.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Gate 2: a valid unlock cookie is required, even for signed-in admins.
  if (!isRevenueUnlocked()) {
    return (
      <div className="space-y-6">
        <PageHeader />
        <RevenuePasscodeGate />
      </div>
    );
  }

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

  // Newest first — a stable order so saving one row never reshuffles others.
  const txns = await prisma.transaction.findMany({
    where: {
      status: "COMPLETED",
      createdAt: {
        ...(rangeStart ? { gte: rangeStart } : {}),
        ...(rangeEnd ? { lte: rangeEnd } : {}),
      },
    },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      amountCents: true,
      commissionPct: true,
      createdAt: true,
      completedAt: true,
      profile: { select: { firstName: true, lastName: true } },
      expenseRate: { select: { expensePct: true } },
    },
  });

  // Each transaction carries its own, independent expense rate.
  let totalVolume = 0;
  let commissionCents = 0;
  let expenseCents = 0;
  const rows = txns.map((t) => {
    const expensePct = t.expenseRate?.expensePct ?? 0;
    const commission = Math.round((t.amountCents * t.commissionPct) / 100);
    const expense = Math.round((t.amountCents * expensePct) / 100);
    totalVolume += t.amountCents;
    commissionCents += commission;
    expenseCents += expense;
    return {
      id: t.id,
      name: `${t.profile.firstName} ${t.profile.lastName}`,
      createdAt: t.createdAt,
      completedAt: t.completedAt,
      amountCents: t.amountCents,
      commissionPct: t.commissionPct,
      expensePct,
      commission,
      expense,
      revenue: commission - expense,
    };
  });
  const revenueCents = commissionCents - expenseCents;

  const stats = [
    {
      label: "Net revenue",
      value: formatUSD(revenueCents),
      sub: "Commission minus expense",
      icon: TrendingUp,
      bg: revenueCents < 0 ? "bg-destructive/10" : "bg-success/10",
      fg: revenueCents < 0 ? "text-destructive" : "text-success",
    },
    {
      label: "Commission collected",
      value: formatUSD(commissionCents),
      sub: `${txns.length} completed transfers`,
      icon: Coins,
      bg: "bg-primary/10",
      fg: "text-primary",
    },
    {
      label: "Expense",
      value: formatUSD(expenseCents),
      sub: "Sum of per-transaction cost",
      icon: Percent,
      bg: "bg-warning/10",
      fg: "text-warning",
    },
    {
      label: "Total volume",
      value: formatUSD(totalVolume),
      sub: "Completed transfers",
      icon: Wallet,
      bg: "bg-primary/10",
      fg: "text-primary",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <PageHeader />
        <div className="flex items-center gap-2">
          <span className="flex items-center gap-1 rounded-full bg-success/10 px-2.5 py-1 text-xs font-medium text-success">
            <ShieldCheck className="h-3.5 w-3.5" /> Passcode protected
          </span>
          <LockRevenueButton />
        </div>
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex flex-wrap gap-1 rounded-lg border bg-card p-1 text-sm">
          {PERIODS.map((p) => (
            <Link
              key={p.key}
              href={
                p.key === "month"
                  ? "/admin/revenue"
                  : `/admin/revenue?period=${p.key}`
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
        <RevenueRangeFilter from={fromStr} to={toStr} />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <Card key={s.label}>
            <CardContent className="flex items-center gap-4 p-5">
              <div
                className={`grid h-11 w-11 place-items-center rounded-lg ${s.bg} ${s.fg}`}
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

      <Card>
        <CardContent className="p-0">
          <div className="border-b px-6 py-4">
            <h2 className="text-sm font-semibold">Revenue by transaction</h2>
            <p className="text-xs text-muted-foreground">
              Set an expense rate for each transaction — every rate is
              independent. Net revenue = commission − expense.
            </p>
          </div>
          {rows.length === 0 ? (
            <div className="px-6 py-12 text-center text-sm text-muted-foreground">
              {isCustom
                ? "No completed transactions in the selected date range."
                : "No completed transactions in this period."}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Transaction</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="text-right">Commission</TableHead>
                  <TableHead className="text-right">Expense rate</TableHead>
                  <TableHead className="text-right">Expense</TableHead>
                  <TableHead className="text-right">Net revenue</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>
                      <div className="font-medium">{r.name}</div>
                      <div className="text-xs text-muted-foreground">
                        Made {formatDate(r.createdAt)}
                        {" · "}
                        Completed{" "}
                        {r.completedAt ? formatDate(r.completedAt) : "—"}
                      </div>
                    </TableCell>
                    <TableCell className="text-right">
                      {formatUSD(r.amountCents)}
                    </TableCell>
                    <TableCell className="text-right">
                      {formatUSD(r.commission)}
                    </TableCell>
                    <TableCell className="text-right">
                      {/* Keying on the saved rate remounts the input after a
                          save so it always reflects the stored value. */}
                      <ExpenseRateCell
                        key={`${r.id}:${r.expensePct}`}
                        transactionId={r.id}
                        expensePct={r.expensePct}
                      />
                    </TableCell>
                    <TableCell className="text-right text-muted-foreground">
                      {formatUSD(r.expense)}
                    </TableCell>
                    <TableCell
                      className={`text-right font-semibold ${
                        r.revenue < 0 ? "text-destructive" : ""
                      }`}
                    >
                      {formatUSD(r.revenue)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
