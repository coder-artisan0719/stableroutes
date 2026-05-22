import { Gift, TrendingDown, Users } from "lucide-react";
import { requireCustomer } from "@/lib/auth-guards";
import { prisma } from "@/lib/prisma";
import {
  countQualifiedReferrals,
  ensureReferralCode,
  referralTier,
} from "@/lib/referral";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ReferralLinkBox } from "./referral-link";

export const metadata = { title: "Referrals" };

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

export default async function ReferralsPage() {
  const session = await requireCustomer();
  const userId = session.user.id;

  const code = await ensureReferralCode(userId);
  const link = `${APP_URL}/signup?ref=${code}`;

  const [qualified, totalReferred] = await Promise.all([
    countQualifiedReferrals(userId),
    prisma.user.count({ where: { referredById: userId } }),
  ]);

  const { discountPct, label } = referralTier(qualified);

  const stats = [
    {
      label: "People referred",
      value: String(totalReferred),
      sub: "Signed up with your link",
      icon: Users,
    },
    {
      label: "Qualified referrals",
      value: String(qualified),
      sub: "Have made at least one transaction",
      icon: Gift,
    },
    {
      label: "Commission discount",
      value: discountPct > 0 ? `${discountPct}%` : "—",
      sub: label,
      icon: TrendingDown,
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold tracking-tight">
          Referrals
        </h1>
        <p className="mt-1 text-muted-foreground">
          Invite businesses to StableRoute — every qualified referral lowers
          your commission fee on every transfer.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Your referral link</CardTitle>
          <CardDescription>
            Share this link — anyone who signs up through it is tied to your
            account.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ReferralLinkBox link={link} code={code} />
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
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
        <CardHeader>
          <CardTitle>How the discount works</CardTitle>
          <CardDescription>
            A referral qualifies once the person you referred makes their first
            transaction. Your commission fee on every transfer is then reduced:
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ul className="text-sm">
            <li className="flex justify-between border-b border-border/60 py-2">
              <span className="text-muted-foreground">
                1–10 qualified referrals
              </span>
              <span className="font-semibold">0.5% off</span>
            </li>
            <li className="flex justify-between border-b border-border/60 py-2">
              <span className="text-muted-foreground">
                11–20 qualified referrals
              </span>
              <span className="font-semibold">1% off</span>
            </li>
            <li className="flex justify-between border-b border-border/60 py-2">
              <span className="text-muted-foreground">
                21–50 qualified referrals
              </span>
              <span className="font-semibold">2% off</span>
            </li>
            <li className="flex justify-between py-2">
              <span className="text-muted-foreground">
                51+ qualified referrals
              </span>
              <span className="font-semibold">2.5% off</span>
            </li>
          </ul>
          <p className="mt-3 text-xs text-muted-foreground">
            The discount applies automatically to new transfers — for example, a
            5% fee becomes 4.5% at the first tier.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
