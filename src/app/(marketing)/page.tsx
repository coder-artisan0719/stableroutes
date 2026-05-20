import Image from "next/image";
import Link from "next/link";
import {
  ArrowDownToLine,
  ArrowRight,
  ArrowUpRight,
  Banknote,
  BarChart3,
  Bell,
  Briefcase,
  Building2,
  Calendar,
  CheckCircle2,
  CircleDot,
  Coins,
  Compass,
  CreditCard,
  FileCheck,
  Globe2,
  Landmark,
  Layers,
  Lock,
  Network,
  Percent,
  Quote,
  Send,
  ShieldCheck,
  Sparkles,
  User,
  UserCheck,
  Wallet,
  Webhook,
  Zap,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { HeroVisual } from "@/components/hero-visual";
import {
  AmExLogo,
  CircleUsdcLogo,
  GooglePayLogo,
  LeadBankLogo,
  MastercardLogo,
  StripeLogo,
  VisaLogo,
} from "@/components/partner-logos";
import {
  CurrencyBadge,
  CurrencyCluster,
  type CurrencyCode,
} from "@/components/currency-logos";
import { TrustpilotRating } from "@/components/trustpilot-rating";

const stats = [
  { label: "Settled volume", value: "$4.2B+", sub: "Lifetime to date" },
  { label: "Active accounts", value: "10k+", sub: "Across 50+ countries" },
  { label: "Settlement window", value: "<1 min", sub: "USD → USDC on Base" },
  { label: "Uptime SLA", value: "99.99%", sub: "Independently audited" },
];

const features = [
  {
    icon: Landmark,
    title: "Custom-named USD accounts",
    body: "Receive ACH and domestic wires into a USD account that carries your business name. Looks like a bank, settles like crypto.",
  },
  {
    icon: Wallet,
    title: "Settle to USDC on Base",
    body: "Funds arrive as USDC at the Base address of your choice — fast, programmable, and globally portable.",
  },
  {
    icon: Layers,
    title: "Multiple named profiles",
    body: "Run separate names, senders, and withdrawal addresses for different entities, clients, or projects under one account.",
  },
  {
    icon: Zap,
    title: "Live status pipeline",
    body: "Track every transfer through Pending → Completed or Refunded, with email notifications at every state change.",
  },
  {
    icon: Webhook,
    title: "Webhooks & API",
    body: "Push deposit, settlement, and refund events into your accounting, ledger, or notification systems automatically.",
  },
  {
    icon: Globe2,
    title: "Built for global teams",
    body: "Pay contractors, suppliers, and partners abroad while keeping a USD-denominated entry point in the United States.",
  },
];

const steps = [
  {
    n: "01",
    title: "Apply in under a minute",
    body: "Sign up, complete KYB onboarding, and submit your first profile with a name, sender, and USDC (Base) address.",
  },
  {
    n: "02",
    title: "Get verified by our compliance team",
    body: "Profiles are reviewed by trained operators. You'll get an email the moment your USD account is provisioned and live.",
  },
  {
    n: "03",
    title: "Receive ACH & Wire — auto-settled",
    body: "Share your StableRoute account details with senders. Funds clear, get converted to USDC, and route to your wallet.",
  },
];

const workflow = [
  {
    n: "01",
    actor: "Customer",
    actorColor: "bg-primary/10 text-primary",
    icon: User,
    title: "Submit a profile",
    body: "Sign up, create a named profile, and enter your USDC (Base) withdrawal address.",
  },
  {
    n: "02",
    actor: "StableRoute Ops",
    actorColor: "bg-warning/10 text-warning",
    icon: UserCheck,
    title: "Compliance review",
    body: "Our trained operators verify KYB/KYC documents and the destination address against sanctions screens.",
  },
  {
    n: "03",
    actor: "StableRoute Ops",
    actorColor: "bg-warning/10 text-warning",
    icon: Building2,
    title: "Assign a USD account",
    body: "Admin provisions a custom-named USD account at Lead Bank with routing + account number, ACH/Wire enabled.",
  },
  {
    n: "04",
    actor: "Customer",
    actorColor: "bg-primary/10 text-primary",
    icon: Bell,
    title: "Approval email sent",
    body: "Customer receives the assigned bank details by email and can share them with anyone who needs to pay them.",
  },
  {
    n: "05",
    actor: "Lead Bank",
    actorColor: "bg-success/10 text-success",
    icon: Landmark,
    title: "Funds arrive",
    body: "Senders submit ACH or domestic Wire transfers. Lead Bank credits the customer's named account.",
  },
  {
    n: "06",
    actor: "StableRoute",
    actorColor: "bg-secondary text-secondary-foreground",
    icon: Send,
    title: "Convert USD → USDC",
    body: "Our settlement engine converts the cleared deposit into USDC at Circle's reserve-backed mint window.",
  },
  {
    n: "07",
    actor: "Base · USDC",
    actorColor: "bg-[#2775CA]/10 text-[#2775CA]",
    icon: Coins,
    title: "Route to wallet",
    body: "USDC is transferred to the customer's withdrawal address on Base — confirmed in seconds, on-chain.",
  },
  {
    n: "08",
    actor: "Customer",
    actorColor: "bg-primary/10 text-primary",
    icon: CheckCircle2,
    title: "Settled & notified",
    body: "Status flips to Completed. Customer is notified by email + webhook. Receipt is verifiable on-chain.",
  },
];

const roadmap = [
  {
    quarter: "Q4 2025",
    status: "shipped" as const,
    statusLabel: "Shipped",
    title: "Foundational launch",
    items: [
      "Custom-named USD accounts",
      "ACH + Wire inbound",
      "USDC settlement on Base",
      "Customer & admin portals",
    ],
  },
  {
    quarter: "Q1 2026",
    status: "shipped" as const,
    statusLabel: "Shipped",
    title: "Operational maturity",
    items: [
      "Multiple profiles per customer",
      "Admin approval workflow",
      "Email notification pipeline",
      "Transaction state tracking",
    ],
  },
  {
    quarter: "Q2 2026",
    status: "in-progress" as const,
    statusLabel: "In progress",
    title: "API & automation",
    items: [
      "Public REST API",
      "Webhook events",
      "Batch settlement reports",
      "Audit log for admin actions",
    ],
  },
  {
    quarter: "Q3 2026",
    status: "planned" as const,
    statusLabel: "Planned",
    title: "Cards & access",
    items: [
      "Debit card issuance (Visa)",
      "Spend controls & categories",
      "Mobile apps (iOS / Android)",
      "2FA + SSO",
    ],
  },
  {
    quarter: "Q3–Q4 2026",
    status: "planned" as const,
    statusLabel: "Planned",
    title: "Global rails",
    items: [
      "EUR, GBP & CAD receive accounts",
      "Low-fee multi-currency → USDC",
      "FX corridor (USD ↔ EUR ↔ GBP)",
      "Treasury yield on idle USDC",
    ],
  },
];

const currencies: {
  code: CurrencyCode;
  name: string;
  rail: string;
  status: "live" | "soon";
  statusLabel: string;
}[] = [
  {
    code: "USD",
    name: "US Dollar",
    rail: "ACH + Wire",
    status: "live",
    statusLabel: "Available now",
  },
  {
    code: "EUR",
    name: "Euro",
    rail: "SEPA + SEPA Instant",
    status: "soon",
    statusLabel: "Q3 2026",
  },
  {
    code: "GBP",
    name: "British Pound",
    rail: "Faster Payments",
    status: "soon",
    statusLabel: "Q3 2026",
  },
  {
    code: "CAD",
    name: "Canadian Dollar",
    rail: "EFT + Interac",
    status: "soon",
    statusLabel: "Q4 2026",
  },
];

const freelancerValue = [
  {
    icon: User,
    title: "Accounts in your beneficiary name",
    body: "Each account is issued under your own name or business — so international clients pay you exactly as they would any local supplier.",
  },
  {
    icon: Percent,
    title: "Low, transparent commission",
    body: "One small, flat conversion fee — no hidden FX spreads, no wire markups. You keep what you earn and see the cost before every settlement.",
  },
  {
    icon: Briefcase,
    title: "Built for independent contractors",
    body: "Freelancers, agencies, and remote teams: get paid by clients abroad in their local currency and settle to USDC on Base in minutes.",
  },
];

const compliance = [
  {
    icon: ShieldCheck,
    title: "SOC 2 Type II",
    body: "Independent annual audit covering security, availability, and confidentiality.",
  },
  {
    icon: Lock,
    title: "256-bit encryption",
    body: "TLS 1.3 in transit, AES-256 at rest. Hardware-backed key custody.",
  },
  {
    icon: FileCheck,
    title: "Regulated banking partner",
    body: "USD deposits held at FDIC-insured Lead Bank under a sponsor banking relationship.",
  },
  {
    icon: Network,
    title: "On-chain transparency",
    body: "Every settlement to USDC is verifiable on Base. Cryptographic receipts on request.",
  },
];

const testimonials = [
  {
    quote:
      "Switching to StableRoute cut our cross-border settlement time from 3 business days to under a minute. Our finance team got their nights back.",
    name: "Mira Acosta",
    role: "CFO, Northwind Logistics",
  },
  {
    quote:
      "The compliance team actually reads the docs you upload. We've never had a profile sit longer than half a business day.",
    name: "Daniel Vega",
    role: "Operations Lead, Helios Agency",
  },
  {
    quote:
      "We replaced two payment processors with StableRoute. Customers send dollars; our treasury holds USDC. That's it.",
    name: "Priya Iyer",
    role: "Founder, Lumen Studio",
  },
];

const faqs = [
  {
    q: "Is StableRoute a bank?",
    a: "No. StableRoute is a financial-services platform. USD deposits are held at FDIC-insured partner institutions; USDC is an asset issued by Circle Internet Financial.",
  },
  {
    q: "How fast is settlement?",
    a: "Once an incoming ACH or Wire clears, funds are typically converted to USDC and routed to your Base address in under 60 seconds.",
  },
  {
    q: "Do you support business accounts?",
    a: "Yes. Most of our customers are LLCs, C-corps, and freelancers operating under a business name. KYB is required for entities.",
  },
  {
    q: "Can I have more than one named account?",
    a: "Yes — you can create unlimited profiles, each with its own name, sender, and withdrawal address. The Growth plan covers up to 5; Scale removes the cap.",
  },
];

function RampStep({
  index,
  title,
  body,
  children,
}: {
  index: number;
  title: string;
  body: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-center gap-4 rounded-xl border bg-background/60 p-4">
      <div className="flex shrink-0 items-center gap-3">
        <span className="grid h-6 w-6 place-items-center rounded-full bg-foreground/5 font-mono text-[11px] font-medium text-muted-foreground">
          {index}
        </span>
        {children}
      </div>
      <div className="min-w-0">
        <p className="text-sm font-medium">{title}</p>
        <p className="text-xs text-muted-foreground">{body}</p>
      </div>
    </div>
  );
}

function RampConnector() {
  return (
    <div className="flex justify-center" aria-hidden>
      <span className="h-4 w-px bg-border" />
    </div>
  );
}

export default function HomePage() {
  return (
    <>
      {/* ============================================================
          HERO
      ============================================================ */}
      <section className="relative isolate overflow-hidden border-b border-border/60">
        {/* Backdrop image — locally hosted. Swap by replacing public/hero.jpg
            with your own file (same path), or change `src` below. */}
        <Image
          src="/hero.jpg"
          alt=""
          fill
          priority
          sizes="100vw"
          className="absolute inset-0 -z-30 object-cover"
        />
        {/* Soft tint + readability overlay (lets the image show through clearly
            while keeping the hero copy legible). */}
        <div className="absolute inset-0 -z-20 bg-background/55 dark:bg-background/70" />
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-transparent via-background/30 to-background" />
        <div className="grid-pattern absolute inset-0 -z-10 opacity-20 [mask-image:radial-gradient(ellipse_at_center,black,transparent_70%)]" />

        <div className="container relative grid grid-cols-1 items-center gap-12 py-20 lg:grid-cols-2 lg:py-28">
          <div className="max-w-2xl">
            <Badge className="mb-6">
              <Sparkles className="h-3 w-3" />
              Verified financial service · USD ↔ USDC
            </Badge>
            <h1 className="font-display text-4xl font-bold leading-[1.05] tracking-tight md:text-5xl lg:text-6xl">
              A USD bank account in your name.{" "}
              <span className="gradient-text">Settled to USDC.</span>
            </h1>
            <p className="mt-6 max-w-xl text-lg text-muted-foreground md:text-xl">
              Receive ACH and domestic Wire transfers into a custom-named USD account
              and have the funds arrive as USDC on Base — automatically, in your
              wallet, under a minute.
            </p>

            <div className="mt-10 flex flex-col gap-3 sm:flex-row">
              <Button asChild size="lg">
                <Link href="/signup">
                  Open my account <ArrowRight />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="/#how-it-works">See how it works</Link>
              </Button>
            </div>

            <div className="mt-8 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-muted-foreground">
              <span className="inline-flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-success" /> No card on file
              </span>
              <span className="inline-flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-success" /> Approval in
                hours
              </span>
              <span className="inline-flex items-center gap-1.5">
                <CheckCircle2 className="h-3.5 w-3.5 text-success" /> Cancel any time
              </span>
            </div>

            <div className="mt-6">
              <TrustpilotRating rating={4.8} compact />
            </div>
          </div>

          <div className="flex items-center justify-center lg:justify-end">
            <HeroVisual />
          </div>
        </div>
      </section>

      {/* ============================================================
          BANNER — product showcase
      ============================================================ */}
      <section className="relative border-b border-border/60 py-16">
        <div className="container">
          <div className="relative mx-auto max-w-5xl">
            {/* Soft glow behind banner */}
            <div className="absolute -inset-8 -z-10 bg-[radial-gradient(closest-side,hsl(var(--primary)/0.18),transparent)] blur-2xl" />
            <div className="overflow-hidden rounded-2xl border bg-card shadow-2xl ring-1 ring-black/5 dark:ring-white/5">
              <Image
                src="/banner.png"
                alt="StableRoute product overview"
                width={1196}
                height={678}
                className="h-auto w-full"
                priority
              />
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================
          TRUST BAR / PARTNERS
      ============================================================ */}
      <section className="border-b border-border/60 bg-muted/20 py-10">
        <div className="container">
          <p className="text-center text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            Banking, network &amp; payments infrastructure powered by
          </p>
          <div className="mt-6 flex flex-wrap items-center justify-center gap-x-12 gap-y-6 opacity-90">
            <LeadBankLogo />
            <StripeLogo />
            <VisaLogo />
            <MastercardLogo />
            <AmExLogo />
            <GooglePayLogo />
            <CircleUsdcLogo />
          </div>
        </div>
      </section>

      {/* ============================================================
          STATS
      ============================================================ */}
      <section className="border-b border-border/60 py-16">
        <div className="container">
          <div className="grid grid-cols-2 gap-x-4 gap-y-10 sm:grid-cols-4">
            {stats.map((s) => (
              <div key={s.label} className="text-center">
                <p className="font-display text-3xl font-bold tracking-tight md:text-4xl">
                  {s.value}
                </p>
                <p className="mt-1 text-sm font-medium">{s.label}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">{s.sub}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============================================================
          FEATURES
      ============================================================ */}
      <section id="features" className="border-b border-border/60 py-24">
        <div className="container">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">
              Why StableRoute
            </p>
            <h2 className="mt-3 font-display text-3xl font-bold tracking-tight md:text-4xl">
              Banking rails on the front. Stablecoin rails on the back.
            </h2>
            <p className="mt-4 text-muted-foreground">
              Everything you need to receive USD and own the settled balance — in
              your wallet, on your terms, with the compliance backing of a real US
              bank.
            </p>
          </div>
          <div className="mt-14 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {features.map((f) => (
              <div
                key={f.title}
                className="group rounded-xl border bg-card p-6 transition-shadow hover:shadow-md"
              >
                <div className="mb-4 grid h-10 w-10 place-items-center rounded-lg bg-primary/10 text-primary">
                  <f.icon className="h-5 w-5" />
                </div>
                <h3 className="font-semibold">{f.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{f.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============================================================
          HOW IT WORKS
      ============================================================ */}
      <section
        id="how-it-works"
        className="border-b border-border/60 bg-muted/30 py-24"
      >
        <div className="container">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">
              How it works
            </p>
            <h2 className="mt-3 font-display text-3xl font-bold tracking-tight md:text-4xl">
              From sign-up to settlement in three steps
            </h2>
          </div>
          <div className="mt-14 grid grid-cols-1 gap-6 md:grid-cols-3">
            {steps.map((s, i) => (
              <div
                key={s.n}
                className="relative rounded-xl border bg-card p-6 shadow-sm"
              >
                <div className="mb-4 inline-flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 font-mono text-sm font-medium text-primary">
                  {s.n}
                </div>
                <h3 className="text-lg font-semibold">{s.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{s.body}</p>
                {i < steps.length - 1 && (
                  <ArrowRight className="absolute -right-3 top-1/2 hidden h-5 w-5 -translate-y-1/2 text-muted-foreground md:block" />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============================================================
          WORKFLOW (detailed pipeline)
      ============================================================ */}
      <section id="workflow" className="border-b border-border/60 py-24">
        <div className="container">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">
              Workflow
            </p>
            <h2 className="mt-3 font-display text-3xl font-bold tracking-tight md:text-4xl">
              What happens behind every transfer
            </h2>
            <p className="mt-4 text-muted-foreground">
              Four actors, eight steps, one outcome — your USD on-chain. Every step
              is logged, auditable, and visible to the customer in real time.
            </p>
          </div>

          {/* Lane legend */}
          <div className="mx-auto mt-10 flex max-w-3xl flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs">
            {[
              { label: "Customer", cls: "bg-primary/10 text-primary" },
              { label: "StableRoute Ops", cls: "bg-warning/10 text-warning" },
              { label: "Lead Bank", cls: "bg-success/10 text-success" },
              { label: "Base · USDC", cls: "bg-[#2775CA]/10 text-[#2775CA]" },
            ].map((l) => (
              <span key={l.label} className="inline-flex items-center gap-1.5">
                <span className={`h-2 w-2 rounded-full ${l.cls}`} />
                <span className="text-muted-foreground">{l.label}</span>
              </span>
            ))}
          </div>

          <ol className="relative mx-auto mt-14 max-w-3xl">
            {/* Connector line */}
            <span
              className="absolute left-6 top-6 bottom-6 w-px bg-gradient-to-b from-border via-border to-transparent"
              aria-hidden
            />
            {workflow.map((step, i) => (
              <li key={step.n} className="relative flex gap-5 pb-8 last:pb-0">
                <span
                  className={`relative z-10 grid h-12 w-12 shrink-0 place-items-center rounded-full border-2 border-background bg-card shadow-sm ${
                    i < 4 ? "ring-2 ring-primary/20" : ""
                  }`}
                >
                  <step.icon className="h-5 w-5 text-primary" />
                </span>
                <div className="min-w-0 flex-1 rounded-xl border bg-card p-5 transition-shadow hover:shadow-md">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs font-medium text-muted-foreground">
                      Step {step.n}
                    </span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${step.actorColor}`}
                    >
                      {step.actor}
                    </span>
                  </div>
                  <h3 className="mt-2 font-semibold">{step.title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{step.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* ============================================================
          NETWORK / CRYPTO RAILS
      ============================================================ */}
      <section className="border-b border-border/60 py-24">
        <div className="container grid grid-cols-1 items-center gap-12 lg:grid-cols-2">
          <div>
            <Badge>
              <BarChart3 className="h-3 w-3" /> Network
            </Badge>
            <h2 className="mt-3 font-display text-3xl font-bold tracking-tight md:text-4xl">
              The on-chain side of US banking
            </h2>
            <p className="mt-4 text-muted-foreground">
              Every dollar that lands in your StableRoute account is converted to
              USDC on Base &mdash; settled in under a minute, verifiable on-chain,
              and ready for treasury, payroll, or trading workflows.
            </p>
            <ul className="mt-6 space-y-3 text-sm">
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                <span>
                  <span className="font-medium">USDC by Circle</span> — a
                  fully-reserved, regulated dollar-pegged stablecoin.
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                <span>
                  <span className="font-medium">Base network</span> — Ethereum L2
                  with sub-cent fees and 1-second confirmations.
                </span>
              </li>
              <li className="flex items-start gap-2.5">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                <span>
                  <span className="font-medium">Programmable settlement</span> —
                  webhooks + on-chain events keep your systems in sync.
                </span>
              </li>
            </ul>
            <Button asChild variant="link" className="mt-4 px-0">
              <Link href="/#how-it-works">
                Learn more <ArrowUpRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>

          <div className="relative">
            <div className="rounded-2xl border bg-gradient-to-br from-primary/5 via-card to-card p-6 shadow-xl">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-wider text-muted-foreground">
                    Live activity · last 24h
                  </p>
                  <p className="mt-1 font-display text-3xl font-bold tabular-nums">
                    +$2,184,520
                  </p>
                  <p className="text-xs text-success">↑ 22.3% vs. yesterday</p>
                </div>
                <Badge variant="success">
                  <Sparkles className="h-3 w-3" />
                  Routing
                </Badge>
              </div>

              {/* Activity chart */}
              <div className="mt-6">
                <svg viewBox="0 0 320 110" className="h-24 w-full">
                  <defs>
                    <linearGradient id="netFill" x1="0" x2="0" y1="0" y2="1">
                      <stop
                        offset="0%"
                        stopColor="hsl(var(--primary))"
                        stopOpacity="0.4"
                      />
                      <stop
                        offset="100%"
                        stopColor="hsl(var(--primary))"
                        stopOpacity="0"
                      />
                    </linearGradient>
                  </defs>
                  {[20, 40, 60, 80].map((y) => (
                    <line
                      key={y}
                      x1="0"
                      x2="320"
                      y1={y}
                      y2={y}
                      stroke="hsl(var(--border))"
                      strokeDasharray="2 4"
                    />
                  ))}
                  <path
                    d="M0,80 L20,72 L40,76 L60,60 L80,58 L100,64 L120,46 L140,52 L160,30 L180,42 L200,22 L220,32 L240,16 L260,26 L280,8 L300,14 L320,4"
                    fill="none"
                    stroke="hsl(var(--primary))"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <path
                    d="M0,80 L20,72 L40,76 L60,60 L80,58 L100,64 L120,46 L140,52 L160,30 L180,42 L200,22 L220,32 L240,16 L260,26 L280,8 L300,14 L320,4 L320,110 L0,110 Z"
                    fill="url(#netFill)"
                  />
                </svg>
              </div>

              {/* Recent settlements */}
              <div className="mt-4 space-y-2">
                {[
                  {
                    sender: "Globex Corp",
                    type: "WIRE",
                    amount: "$48,250.00",
                    when: "2 min ago",
                  },
                  {
                    sender: "Initech",
                    type: "ACH",
                    amount: "$3,180.00",
                    when: "9 min ago",
                  },
                  {
                    sender: "Stellar Ventures",
                    type: "WIRE",
                    amount: "$120,000.00",
                    when: "21 min ago",
                  },
                ].map((tx) => (
                  <div
                    key={tx.sender}
                    className="flex items-center justify-between rounded-md border bg-background/60 px-3 py-2 text-xs"
                  >
                    <div className="flex items-center gap-2">
                      <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-[10px]">
                        {tx.type}
                      </span>
                      <span className="font-medium">{tx.sender}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="font-mono font-semibold tabular-nums">
                        {tx.amount}
                      </span>
                      <span className="text-muted-foreground">{tx.when}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================
          COMING SOON — MULTI-CURRENCY
      ============================================================ */}
      <section
        id="multi-currency"
        className="border-b border-border/60 bg-muted/30 py-24"
      >
        <div className="container">
          <div className="mx-auto max-w-2xl text-center">
            <Badge variant="warning" className="mb-4">
              <Sparkles className="h-3 w-3" /> Coming soon
            </Badge>
            <h2 className="font-display text-3xl font-bold tracking-tight md:text-4xl">
              Get paid in any currency.{" "}
              <span className="gradient-text">Settle in crypto.</span>
            </h2>
            <p className="mt-4 text-muted-foreground">
              Multi-currency accounts for freelancers and independent
              contractors &mdash; receive EUR, GBP, and CAD alongside USD, each
              in your own name, and convert to USDC on Base at a low, flat fee.
            </p>
          </div>

          {/* Currency cards */}
          <div className="mt-14 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {currencies.map((c) => (
              <div
                key={c.code}
                className="relative rounded-xl border bg-card p-6 transition-shadow hover:shadow-md"
              >
                <div className="flex items-center justify-between">
                  <CurrencyBadge code={c.code} size="lg" />
                  <Badge variant={c.status === "live" ? "success" : "warning"}>
                    {c.status === "live" ? (
                      <CheckCircle2 className="h-3 w-3" />
                    ) : (
                      <Calendar className="h-3 w-3" />
                    )}
                    {c.statusLabel}
                  </Badge>
                </div>
                <h3 className="mt-4 font-display text-xl font-bold tracking-tight">
                  {c.code}
                </h3>
                <p className="text-sm text-muted-foreground">{c.name}</p>
                <div className="mt-4 flex items-center gap-1.5 border-t border-border/60 pt-3 text-xs text-muted-foreground">
                  <Landmark className="h-3.5 w-3.5" />
                  {c.rail}
                </div>
              </div>
            ))}
          </div>

          {/* Freelancer value props */}
          <div className="mt-8 grid grid-cols-1 gap-6 md:grid-cols-3">
            {freelancerValue.map((v) => (
              <div key={v.title} className="rounded-xl border bg-card p-6">
                <div className="mb-4 grid h-10 w-10 place-items-center rounded-lg bg-primary/10 text-primary">
                  <v.icon className="h-5 w-5" />
                </div>
                <h3 className="font-semibold">{v.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{v.body}</p>
              </div>
            ))}
          </div>

          {/* Notify CTA */}
          <div className="mx-auto mt-10 flex max-w-xl flex-col items-center gap-3 rounded-xl border border-dashed bg-card p-6 text-center sm:flex-row sm:justify-between sm:text-left">
            <div>
              <p className="font-semibold">Want EUR, GBP, or CAD first?</p>
              <p className="text-sm text-muted-foreground">
                Join the early-access list and we&apos;ll reach out when your
                currency goes live.
              </p>
            </div>
            <Button asChild className="shrink-0">
              <Link href="/contact">
                Get notified <ArrowRight />
              </Link>
            </Button>
          </div>
        </div>
      </section>

      {/* ============================================================
          ON-RAMP / OFF-RAMP WORKFLOW
      ============================================================ */}
      <section
        id="ramps"
        className="border-b border-border/60 py-24"
      >
        <div className="container">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">
              On-ramp &amp; off-ramp
            </p>
            <h2 className="mt-3 font-display text-3xl font-bold tracking-tight md:text-4xl">
              Money moves both ways
            </h2>
            <p className="mt-4 text-muted-foreground">
              Convert fiat into USDC when clients pay you, and cash USDC back out
              to a bank account when you need to. One flat, low fee per
              conversion &mdash; no FX spreads.
            </p>
          </div>

          <div className="mt-14 grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* ON-RAMP */}
            <div className="rounded-2xl border bg-card p-6 md:p-8">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="grid h-9 w-9 place-items-center rounded-lg bg-success/10 text-success">
                    <ArrowRight className="h-5 w-5" />
                  </span>
                  <div>
                    <h3 className="font-semibold">On-ramp</h3>
                    <p className="text-xs text-muted-foreground">
                      Fiat &rarr; USDC
                    </p>
                  </div>
                </div>
                <Badge variant="success">
                  <CheckCircle2 className="h-3 w-3" /> Live for USD
                </Badge>
              </div>

              <div className="mt-6 space-y-3">
                <RampStep
                  index={1}
                  title="Client pays you"
                  body="ACH, Wire, SEPA, or Faster Payments into your named account."
                >
                  <CurrencyCluster
                    codes={["USD", "EUR", "GBP", "CAD"]}
                    size="sm"
                  />
                </RampStep>
                <RampConnector />
                <RampStep
                  index={2}
                  title="Funds clear"
                  body="Deposit settles at our regulated banking partner."
                >
                  <span className="grid h-8 w-8 place-items-center rounded-lg bg-muted text-muted-foreground">
                    <Landmark className="h-4 w-4" />
                  </span>
                </RampStep>
                <RampConnector />
                <RampStep
                  index={3}
                  title="Auto-convert"
                  body="We convert to USDC at a low, flat fee — shown upfront."
                >
                  <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary/10 text-primary">
                    <Percent className="h-4 w-4" />
                  </span>
                </RampStep>
                <RampConnector />
                <RampStep
                  index={4}
                  title="USDC in your wallet"
                  body="Routed to your Base address — confirmed on-chain in seconds."
                >
                  <CurrencyBadge code="USDC" size="sm" />
                </RampStep>
              </div>
            </div>

            {/* OFF-RAMP */}
            <div className="rounded-2xl border bg-card p-6 md:p-8">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="grid h-9 w-9 place-items-center rounded-lg bg-primary/10 text-primary">
                    <ArrowDownToLine className="h-5 w-5" />
                  </span>
                  <div>
                    <h3 className="font-semibold">Off-ramp</h3>
                    <p className="text-xs text-muted-foreground">
                      USDC &rarr; Fiat
                    </p>
                  </div>
                </div>
                <Badge variant="warning">
                  <Calendar className="h-3 w-3" /> Q4 2026
                </Badge>
              </div>

              <div className="mt-6 space-y-3">
                <RampStep
                  index={1}
                  title="Send USDC"
                  body="Transfer USDC from your Base wallet to your StableRoute address."
                >
                  <CurrencyBadge code="USDC" size="sm" />
                </RampStep>
                <RampConnector />
                <RampStep
                  index={2}
                  title="Auto-convert"
                  body="We convert USDC to your chosen currency at the same flat fee."
                >
                  <span className="grid h-8 w-8 place-items-center rounded-lg bg-primary/10 text-primary">
                    <Percent className="h-4 w-4" />
                  </span>
                </RampStep>
                <RampConnector />
                <RampStep
                  index={3}
                  title="Bank payout"
                  body="Funds are paid out to your linked external bank account."
                >
                  <span className="grid h-8 w-8 place-items-center rounded-lg bg-muted text-muted-foreground">
                    <Landmark className="h-4 w-4" />
                  </span>
                </RampStep>
                <RampConnector />
                <RampStep
                  index={4}
                  title="Cash in hand"
                  body="Receive in USD, EUR, GBP, or CAD — in your beneficiary name."
                >
                  <CurrencyCluster
                    codes={["USD", "EUR", "GBP", "CAD"]}
                    size="sm"
                  />
                </RampStep>
              </div>
            </div>
          </div>

          {/* Fee strip */}
          <div className="mx-auto mt-8 grid max-w-4xl grid-cols-1 gap-4 sm:grid-cols-3">
            {[
              {
                icon: Percent,
                title: "One flat fee",
                body: "A single low commission per conversion. No hidden FX margin.",
              },
              {
                icon: Zap,
                title: "Minutes, not days",
                body: "On-chain settlement completes while a bank wire would still be pending.",
              },
              {
                icon: Briefcase,
                title: "Made for contractors",
                body: "Built for freelancers and agencies billing clients across borders.",
              },
            ].map((f) => (
              <div
                key={f.title}
                className="rounded-xl border bg-card p-5 text-center"
              >
                <div className="mx-auto mb-3 grid h-10 w-10 place-items-center rounded-lg bg-primary/10 text-primary">
                  <f.icon className="h-5 w-5" />
                </div>
                <h3 className="text-sm font-semibold">{f.title}</h3>
                <p className="mt-1 text-xs text-muted-foreground">{f.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============================================================
          COMPLIANCE / SECURITY
      ============================================================ */}
      <section className="border-b border-border/60 bg-muted/20 py-24">
        <div className="container">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">
              Compliance &amp; security
            </p>
            <h2 className="mt-3 font-display text-3xl font-bold tracking-tight md:text-4xl">
              Built so you can pass an audit on Tuesday
            </h2>
            <p className="mt-4 text-muted-foreground">
              We hold ourselves to the same standards as the banks behind us. KYB,
              KYC, transaction monitoring, and on-chain transparency are non-negotiable.
            </p>
          </div>
          <div className="mt-14 grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-4">
            {compliance.map((c) => (
              <div
                key={c.title}
                className="rounded-xl border bg-card p-6 transition-shadow hover:shadow-md"
              >
                <div className="mb-4 grid h-10 w-10 place-items-center rounded-lg bg-success/10 text-success">
                  <c.icon className="h-5 w-5" />
                </div>
                <h3 className="font-semibold">{c.title}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{c.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ============================================================
          ROADMAP
      ============================================================ */}
      <section id="roadmap" className="border-b border-border/60 py-24">
        <div className="container">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">
              Roadmap
            </p>
            <h2 className="mt-3 font-display text-3xl font-bold tracking-tight md:text-4xl">
              Where we&apos;ve been &mdash; and where we&apos;re going
            </h2>
            <p className="mt-4 text-muted-foreground">
              Public, transparent, and built in the open. Every quarter ships, every
              decision is documented.
            </p>
          </div>

          {/* Timeline */}
          <div className="mt-14">
            <div className="relative grid grid-cols-1 gap-4 md:grid-cols-3 lg:grid-cols-5">
              {/* Horizontal connector on lg+ */}
              <span
                className="absolute left-0 right-0 top-[42px] hidden h-px bg-gradient-to-r from-transparent via-border to-transparent lg:block"
                aria-hidden
              />

              {roadmap.map((m, i) => {
                const StatusIcon =
                  m.status === "shipped"
                    ? CheckCircle2
                    : m.status === "in-progress"
                      ? CircleDot
                      : Calendar;
                const dotColor =
                  m.status === "shipped"
                    ? "bg-success text-success-foreground"
                    : m.status === "in-progress"
                      ? "bg-warning text-warning-foreground"
                      : "bg-muted text-muted-foreground";
                const badgeVariant =
                  m.status === "shipped"
                    ? "success"
                    : m.status === "in-progress"
                      ? "warning"
                      : "outline";

                return (
                  <div key={m.quarter} className="flex flex-col items-center">
                    <span
                      className={`relative z-10 grid h-12 w-12 place-items-center rounded-full border-4 border-background shadow-sm ${dotColor}`}
                    >
                      <StatusIcon className="h-5 w-5" />
                    </span>
                    <div className="mt-4 w-full rounded-xl border bg-card p-5 transition-shadow hover:shadow-md">
                      <div className="flex items-center justify-between gap-2">
                        <p className="font-mono text-xs font-semibold uppercase tracking-wider">
                          {m.quarter}
                        </p>
                        <Badge variant={badgeVariant} className="shrink-0">
                          {m.statusLabel}
                        </Badge>
                      </div>
                      <h3 className="mt-2 text-sm font-semibold">{m.title}</h3>
                      <ul className="mt-3 space-y-1.5 text-xs text-muted-foreground">
                        {m.items.map((item) => (
                          <li
                            key={item}
                            className="flex items-start gap-1.5 leading-relaxed"
                          >
                            <span
                              className={`mt-1.5 inline-block h-1 w-1 shrink-0 rounded-full ${
                                m.status === "shipped"
                                  ? "bg-success"
                                  : m.status === "in-progress"
                                    ? "bg-warning"
                                    : "bg-muted-foreground/50"
                              }`}
                            />
                            <span>{item}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Beyond 2026 callout */}
            <div className="mx-auto mt-10 max-w-3xl rounded-xl border border-dashed bg-muted/20 p-5 text-center">
              <p className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                <Compass className="h-3.5 w-3.5" /> 2027 &amp; beyond &mdash; vision
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                Virtual sub-accounts &middot; real-time payment rails (FedNow / RTP)
                &middot; international wire send &middot; marketplace SDKs &middot;
                yield-bearing checking
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ============================================================
          TESTIMONIALS
      ============================================================ */}
      <section className="border-b border-border/60 py-24">
        <div className="container">
          <div className="mx-auto max-w-2xl text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">
              Customers
            </p>
            <h2 className="mt-3 font-display text-3xl font-bold tracking-tight md:text-4xl">
              Loved by finance teams
            </h2>
            <div className="mt-5 flex justify-center">
              <TrustpilotRating rating={4.8} reviews={1284} />
            </div>
          </div>
          <div className="mt-14 grid grid-cols-1 gap-6 md:grid-cols-3">
            {testimonials.map((t) => (
              <figure
                key={t.name}
                className="flex flex-col rounded-xl border bg-card p-6 shadow-sm"
              >
                <Quote className="h-5 w-5 text-primary/60" />
                <blockquote className="mt-3 flex-1 text-sm leading-relaxed">
                  &ldquo;{t.quote}&rdquo;
                </blockquote>
                <figcaption className="mt-5 border-t border-border/60 pt-4 text-sm">
                  <p className="font-medium">{t.name}</p>
                  <p className="text-xs text-muted-foreground">{t.role}</p>
                </figcaption>
              </figure>
            ))}
          </div>
        </div>
      </section>

      {/* ============================================================
          FAQ
      ============================================================ */}
      <section className="border-b border-border/60 bg-muted/20 py-24">
        <div className="container max-w-3xl">
          <div className="text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.18em] text-primary">
              FAQ
            </p>
            <h2 className="mt-3 font-display text-3xl font-bold tracking-tight md:text-4xl">
              Frequently asked questions
            </h2>
          </div>
          <dl className="mt-12 space-y-3">
            {faqs.map((f) => (
              <details
                key={f.q}
                className="group rounded-lg border bg-card p-5 [&_summary::-webkit-details-marker]:hidden"
              >
                <summary className="flex cursor-pointer items-start justify-between gap-3 font-medium">
                  {f.q}
                  <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full border text-sm text-muted-foreground transition-transform group-open:rotate-45">
                    +
                  </span>
                </summary>
                <p className="mt-3 text-sm text-muted-foreground">{f.a}</p>
              </details>
            ))}
          </dl>
        </div>
      </section>

      {/* ============================================================
          FINAL CTA
      ============================================================ */}
      <section className="py-24">
        <div className="container">
          <div className="mx-auto max-w-4xl overflow-hidden rounded-2xl border bg-gradient-to-br from-primary/15 via-card to-card p-10 text-center shadow-xl md:p-16">
            <Badge variant="default" className="mb-5">
              <Sparkles className="h-3 w-3" />
              Live and accepting customers
            </Badge>
            <h2 className="font-display text-3xl font-bold tracking-tight md:text-5xl">
              Ready to route stable funds?
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-muted-foreground md:text-lg">
              Open your custom-named USD account today. Most profiles are reviewed
              and live within a few hours.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Button asChild size="lg">
                <Link href="/signup">
                  Open my account <ArrowRight />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="/contact">Talk to sales</Link>
              </Button>
            </div>
            <p className="mt-6 text-xs text-muted-foreground">
              Banking services provided by Lead Bank, Member FDIC.
            </p>
          </div>
        </div>
      </section>
    </>
  );
}
