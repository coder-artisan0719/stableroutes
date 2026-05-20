import { Receipt } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireCustomer } from "@/lib/auth-guards";
import { Card, CardContent } from "@/components/ui/card";
import { CustomerTransactionsClient } from "./transactions-client";

export const metadata = { title: "Transactions" };

export default async function TransactionsPage() {
  const session = await requireCustomer();
  const transactions = await prisma.transaction.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    include: { profile: true },
  });

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

      {transactions.length === 0 ? (
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
        <CustomerTransactionsClient transactions={transactions} />
      )}
    </div>
  );
}
