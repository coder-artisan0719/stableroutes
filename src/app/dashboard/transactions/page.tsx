import { Receipt } from "lucide-react";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireCustomer } from "@/lib/auth-guards";
import { parsePageSize } from "@/lib/page-size";
import { Card, CardContent } from "@/components/ui/card";
import { CustomerTransactionsClient } from "./transactions-client";

export const metadata = { title: "Transactions" };

/** Validate a `YYYY-MM-DD` query value, returning it only if it's a real date. */
function validDateStr(raw: string | undefined): string | undefined {
  if (!raw || !/^\d{4}-\d{2}-\d{2}$/.test(raw)) return undefined;
  const d = new Date(`${raw}T00:00:00`);
  return Number.isNaN(d.getTime()) ? undefined : raw;
}

export default async function TransactionsPage({
  searchParams,
}: {
  searchParams: { page?: string; pageSize?: string; from?: string; to?: string };
}) {
  const session = await requireCustomer();
  const userId = session.user.id;

  const fromStr = validDateStr(searchParams.from);
  const toStr = validDateStr(searchParams.to);
  const fromDate = fromStr ? new Date(`${fromStr}T00:00:00`) : undefined;
  const toDate = toStr ? new Date(`${toStr}T23:59:59.999`) : undefined;
  const isFiltered = Boolean(fromDate || toDate);

  const where: Prisma.TransactionWhereInput = {
    userId,
    ...(isFiltered
      ? {
          createdAt: {
            ...(fromDate ? { gte: fromDate } : {}),
            ...(toDate ? { lte: toDate } : {}),
          },
        }
      : {}),
  };

  const pageSize = parsePageSize(searchParams.pageSize);
  const page = Math.max(1, parseInt(searchParams.page ?? "1", 10) || 1);

  // One parallel round-trip: page rows, the filtered count (only when a filter
  // is active), and the unfiltered total (drives the page-level empty state).
  const [transactions, filteredCount, totalAll] = await Promise.all([
    prisma.transaction.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: { profile: true },
      take: pageSize,
      skip: (page - 1) * pageSize,
    }),
    isFiltered ? prisma.transaction.count({ where }) : Promise.resolve(null),
    prisma.transaction.count({ where: { userId } }),
  ]);

  const total = filteredCount ?? totalAll;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold tracking-tight">
          Transactions
        </h1>
        <p className="mt-1 text-muted-foreground">
          Full history of inbound transfers and settled USDC routes.
        </p>
      </div>

      {totalAll === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
            <div className="grid h-12 w-12 place-items-center rounded-lg bg-primary/10 text-primary">
              <Receipt className="h-5 w-5" />
            </div>
            <h3 className="text-lg font-semibold">No transactions yet</h3>
            <p className="max-w-md text-sm text-muted-foreground">
              When customers send ACH or Wire transfers to your approved profile,
              they&apos;ll appear here.
            </p>
          </CardContent>
        </Card>
      ) : (
        <CustomerTransactionsClient
          transactions={transactions}
          total={total}
          page={page}
          totalPages={totalPages}
          pageSize={pageSize}
          query={{ from: fromStr, to: toStr }}
        />
      )}
    </div>
  );
}
