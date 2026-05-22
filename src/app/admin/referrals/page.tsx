import { TrendingDown, Users } from "lucide-react";
import { requireAdmin } from "@/lib/auth-guards";
import { prisma } from "@/lib/prisma";
import { referralTier } from "@/lib/referral";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const metadata = { title: "Referrals" };

export default async function AdminReferralsPage() {
  await requireAdmin();

  const [customers, qualifiedGroups, referredGroups] = await Promise.all([
    prisma.user.findMany({
      where: { role: "CUSTOMER" },
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        email: true,
        name: true,
        referredBy: { select: { email: true, name: true } },
      },
    }),
    // Referred customers who have made at least one transaction, by referrer.
    prisma.user.groupBy({
      by: ["referredById"],
      where: { referredById: { not: null }, transactions: { some: {} } },
      _count: { _all: true },
    }),
    // All referred signups, by referrer.
    prisma.user.groupBy({
      by: ["referredById"],
      where: { referredById: { not: null } },
      _count: { _all: true },
    }),
  ]);

  const qualifiedMap = new Map<string, number>();
  for (const g of qualifiedGroups) {
    if (g.referredById) qualifiedMap.set(g.referredById, g._count._all);
  }
  const referredMap = new Map<string, number>();
  for (const g of referredGroups) {
    if (g.referredById) referredMap.set(g.referredById, g._count._all);
  }

  const rows = customers.map((c) => {
    const qualified = qualifiedMap.get(c.id) ?? 0;
    return {
      id: c.id,
      name: c.name,
      email: c.email,
      referredBy: c.referredBy,
      referred: referredMap.get(c.id) ?? 0,
      qualified,
      discountPct: referralTier(qualified).discountPct,
    };
  });

  const activeReferrers = rows.filter((r) => r.qualified > 0).length;
  const totalSignups = rows.reduce((sum, r) => sum + r.referred, 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold tracking-tight">
          Referrals
        </h1>
        <p className="mt-1 text-muted-foreground">
          Referral activity and the commission discount each customer has
          earned.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Card>
          <CardContent className="flex items-center gap-4 p-5">
            <div className="grid h-11 w-11 place-items-center rounded-lg bg-primary/10 text-primary">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                Active referrers
              </p>
              <p className="mt-0.5 text-xl font-semibold">{activeReferrers}</p>
              <p className="text-xs text-muted-foreground">
                Customers with at least one qualified referral
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="flex items-center gap-4 p-5">
            <div className="grid h-11 w-11 place-items-center rounded-lg bg-success/10 text-success">
              <TrendingDown className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                Total referral signups
              </p>
              <p className="mt-0.5 text-xl font-semibold">{totalSignups}</p>
              <p className="text-xs text-muted-foreground">
                Accounts created from a referral link
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="p-0">
          {rows.length === 0 ? (
            <div className="px-6 py-12 text-center text-sm text-muted-foreground">
              No customers yet.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer</TableHead>
                  <TableHead>Referred by</TableHead>
                  <TableHead className="text-right">Signed up</TableHead>
                  <TableHead className="text-right">Qualified</TableHead>
                  <TableHead>Commission discount</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell>
                      <div className="font-medium">
                        {r.name ?? r.email.split("@")[0]}
                      </div>
                      <div className="text-xs text-muted-foreground">
                        {r.email}
                      </div>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {r.referredBy
                        ? (r.referredBy.name ?? r.referredBy.email)
                        : "—"}
                    </TableCell>
                    <TableCell className="text-right text-sm">
                      {r.referred}
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {r.qualified}
                    </TableCell>
                    <TableCell>
                      {r.discountPct > 0 ? (
                        <Badge variant="success">
                          {r.discountPct}% off
                        </Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">
                          —
                        </span>
                      )}
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
