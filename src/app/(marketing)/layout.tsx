import Link from "next/link";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { Chatbot } from "@/components/chatbot";
import { auth } from "@/auth";
import { LeadBankLogo, CircleUsdcLogo } from "@/components/partner-logos";

export default async function MarketingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();
  const dashboardHref = session?.user?.role === "ADMIN" ? "/admin" : "/dashboard";

  const productLinks = [
    { href: "/#features", label: "Features" },
    { href: "/#workflow", label: "Workflow" },
    { href: "/#roadmap", label: "Roadmap" },
    { href: "/pricing", label: "Pricing" },
  ];
  const companyLinks = [
    { href: "/contact", label: "Contact" },
    { href: "/contact", label: "Sales" },
    { href: "/contact", label: "Support" },
  ];
  const legalLinks = [
    { href: "/legal/terms", label: "Terms of Service" },
    { href: "/legal/privacy", label: "Privacy Policy" },
    { href: "/legal/compliance", label: "Compliance" },
    { href: "/legal/aml", label: "AML Policy" },
  ];

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-40 border-b border-border/60 bg-background/80 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between">
          <Logo />
          <nav className="hidden items-center gap-7 text-sm font-medium md:flex">
            <Link
              href="/#features"
              className="text-muted-foreground transition-colors hover:text-foreground"
            >
              Features
            </Link>
            <Link
              href="/#workflow"
              className="text-muted-foreground transition-colors hover:text-foreground"
            >
              Workflow
            </Link>
            <Link
              href="/#roadmap"
              className="text-muted-foreground transition-colors hover:text-foreground"
            >
              Roadmap
            </Link>
            <Link
              href="/pricing"
              className="text-muted-foreground transition-colors hover:text-foreground"
            >
              Pricing
            </Link>
            <Link
              href="/contact"
              className="text-muted-foreground transition-colors hover:text-foreground"
            >
              Contact
            </Link>
          </nav>
          <div className="flex items-center gap-2">
            <ThemeToggle />
            {session?.user ? (
              <Button asChild size="sm">
                <Link href={dashboardHref}>Open dashboard</Link>
              </Button>
            ) : (
              <>
                <Button asChild variant="ghost" size="sm">
                  <Link href="/login">Sign in</Link>
                </Button>
                <Button asChild size="sm">
                  <Link href="/signup">Get started</Link>
                </Button>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1">{children}</main>

      <footer className="border-t border-border/60 bg-muted/20">
        <div className="container py-14">
          <div className="grid grid-cols-2 gap-10 md:grid-cols-4 lg:grid-cols-5">
            <div className="col-span-2 lg:col-span-2">
              <Logo size="sm" />
              <p className="mt-4 max-w-sm text-sm text-muted-foreground">
                StableRoute is a financial-services platform that connects regulated
                US banking rails to USDC settlement on Base. Built for businesses
                that need both worlds.
              </p>
              <div className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-3">
                <LeadBankLogo />
                <CircleUsdcLogo />
              </div>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Product
              </p>
              <ul className="mt-4 space-y-2.5 text-sm">
                {productLinks.map((l) => (
                  <li key={l.label}>
                    <Link href={l.href} className="hover:text-foreground">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Company
              </p>
              <ul className="mt-4 space-y-2.5 text-sm">
                {companyLinks.map((l) => (
                  <li key={l.label}>
                    <Link href={l.href} className="hover:text-foreground">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Legal
              </p>
              <ul className="mt-4 space-y-2.5 text-sm">
                {legalLinks.map((l) => (
                  <li key={l.label}>
                    <Link href={l.href} className="hover:text-foreground">
                      {l.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>

        {/* Regulatory disclaimer bar */}
        <div className="border-t border-border/60 bg-background/40">
          <div className="container space-y-4 py-6 text-xs leading-relaxed text-muted-foreground">
            <p>
              <span className="font-semibold text-foreground">Banking services</span>{" "}
              are provided by Lead Bank, Member FDIC, pursuant to a license from
              Visa U.S.A. Inc. for Visa-branded products and from Mastercard
              International Incorporated for Mastercard-branded products. Standard
              FDIC insurance coverage applies to USD balances held at our partner
              bank, subject to FDIC pass-through rules.
            </p>
            <p>
              <span className="font-semibold text-foreground">USDC</span> is a
              dollar-pegged stablecoin issued by Circle Internet Financial, LLC.
              StableRoute is not affiliated with Circle. Cryptocurrency holdings
              are <span className="font-semibold">not</span> FDIC- or SIPC-insured.
              Digital-asset transfers are irreversible; double-check withdrawal
              addresses before submitting.
            </p>
            <p>
              <span className="font-semibold text-foreground">Trademarks.</span> All
              third-party trademarks &mdash; including Visa, Mastercard, American
              Express, Stripe, Google Pay, Lead Bank, USDC, and Base &mdash; are
              the property of their respective owners. Display on this page is for
              informational purposes only and does not imply endorsement.
            </p>
          </div>
        </div>

        <div className="border-t border-border/60">
          <div className="container flex flex-col items-center justify-between gap-3 py-5 text-xs text-muted-foreground sm:flex-row">
            <p>© {new Date().getFullYear()} StableRoute, Inc. All rights reserved.</p>
            <p className="flex items-center gap-1.5">
              <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-success" />
              All systems operational
            </p>
          </div>
        </div>
      </footer>

      <Chatbot />
    </div>
  );
}
