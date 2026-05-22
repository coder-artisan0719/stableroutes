import Link from "next/link";
import { ArrowDownUp, BadgeCheck, Coins, Users } from "lucide-react";
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
import { formatUSD } from "@/lib/utils";
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
  const midnight = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
  );
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

export default async function AdminAnalyticsPage({
  searchParams,
}: {
  searchParams: { period?: string; from?: string; to?: string };
}) {
  await requireAdmin();

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

  const [txns, customers] = await Promise.all([
    prisma.transaction.findMany({
      where: {
        status: "COMPLETED",
        createdAt: {
          ...(rangeStart ? { gte: rangeStart } : {}),
          ...(rangeEnd ? { lte: rangeEnd } : {}),
        },
      },
      select: {
        userId: true,
        amountCents: true,
        commissionPct: true,
      },
    }),
    prisma.user.findMany({
      where: { role: "CUSTOMER" },
      select: { id: true, email: true, name: true },
    }),
  ]);

  // Aggregate completed transactions per customer + overall.
  type Agg = { count: number; balance: number };
  const byCustomer = new Map<string, Agg>();
  let totalBalance = 0;
  let totalVolume = 0;

  for (const t of txns) {
    // Gross transferred amount, before the commission fee is deducted.
    totalVolume += t.amountCents;
    // Net amount the customer receives after the commission fee is deducted.
    const netCents = Math.round(t.amountCents * (1 - t.commissionPct / 100));
    totalBalance += netCents;
    const agg = byCustomer.get(t.userId) ?? { count: 0, balance: 0 };
    agg.count += 1;
    agg.balance += netCents;
    byCustomer.set(t.userId, agg);
  }

  const nameMap = new Map(customers.map((c) => [c.id, c]));
  const rows = [...byCustomer.entries()]
    .map(([userId, agg]) => ({
      userId,
      customer: nameMap.get(userId) ?? null,
      ...agg,
    }))
    .sort((a, b) => b.balance - a.balance);

  const stats = [
    {
      label: "Completed transactions",
      value: String(txns.length),
      sub: "Settled transfers",
      icon: ArrowDownUp,
    },
    {
      label: "Total volume",
      value: formatUSD(totalVolume),
      sub: "Before commission",
      icon: Coins,
    },
    {
      label: "Completed balance",
      value: formatUSD(totalBalance),
      sub: "Net of commission",
      icon: BadgeCheck,
    },
    {
      label: "Active customers",
      value: String(byCustomer.size),
      sub: "With a completed transfer",
      icon: Users,
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold tracking-tight">
          Analytics
        </h1>
        <p className="mt-1 text-muted-foreground">
          Transaction activity per customer — use the presets or a custom date
          range to evaluate engagement and inform bonus decisions.
        </p>
      </div>

      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div className="flex flex-wrap gap-1 rounded-lg border bg-card p-1 text-sm">
          {PERIODS.map((p) => (
            <Link
              key={p.key}
              href={
                p.key === "month"
                  ? "/admin/analytics"
                  : `/admin/analytics?period=${p.key}`
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
                  <TableHead>Customer</TableHead>
                  <TableHead className="text-right">Transactions</TableHead>
                  <TableHead className="text-right">Completed balance</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.userId}>
                    <TableCell>
                      <div className="font-medium">
                        {r.customer?.name ??
                          r.customer?.email.split("@")[0] ??
                          "Unknown"}
                      </div>
                      {r.customer?.email && (
                        <div className="text-xs text-muted-foreground">
                          {r.customer.email}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-right">{r.count}</TableCell>
                    <TableCell className="text-right font-medium">
                      {formatUSD(r.balance)}
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
