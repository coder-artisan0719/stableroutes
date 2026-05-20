import {
  ArrowDownToLine,
  ArrowRight,
  Banknote,
  Check,
  Globe2,
  Sparkles,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { CircleUsdcLogo } from "@/components/partner-logos";

// A polished, original hero visual: a browser-window mockup of the StableRoute
// customer dashboard, with floating overlay cards illustrating the USD → USDC
// flow. Pure components + SVG — no external image hosting required.
export function HeroVisual() {
  return (
    <div className="relative w-full max-w-xl">
      {/* Ambient glow */}
      <div className="absolute -inset-12 -z-10 bg-[radial-gradient(closest-side,hsl(var(--primary)/0.28),transparent)] blur-3xl" />
      <div className="absolute -inset-6 -z-10 bg-[radial-gradient(closest-side,hsl(45_90%_55%/0.14),transparent)] blur-2xl" />

      {/* Browser window */}
      <div className="overflow-hidden rounded-2xl border bg-card shadow-2xl ring-1 ring-black/5 dark:ring-white/5">
        {/* Title bar */}
        <div className="flex items-center gap-2 border-b border-border/60 bg-muted/40 px-4 py-2.5">
          <span className="h-3 w-3 rounded-full bg-[#ff5f57]" />
          <span className="h-3 w-3 rounded-full bg-[#febc2e]" />
          <span className="h-3 w-3 rounded-full bg-[#28c840]" />
          <div className="ml-3 flex flex-1 items-center justify-center">
            <div className="inline-flex items-center gap-1.5 rounded-md border border-border/60 bg-background px-3 py-1 text-[11px] font-medium text-muted-foreground">
              <Globe2 className="h-3 w-3" />
              app.stableroute.io/dashboard
            </div>
          </div>
        </div>

        {/* Window body */}
        <div className="grid grid-cols-12 gap-4 bg-background p-5">
          {/* Mini sidebar */}
          <aside className="col-span-3 hidden flex-col gap-1 rounded-lg bg-muted/30 p-2 sm:flex">
            {[
              { label: "Overview", active: true },
              { label: "Profiles", active: false },
              { label: "Transactions", active: false },
              { label: "Settings", active: false },
            ].map((it) => (
              <div
                key={it.label}
                className={`rounded-md px-2.5 py-1.5 text-[11px] font-medium ${
                  it.active
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground"
                }`}
              >
                {it.label}
              </div>
            ))}
          </aside>

          {/* Main content */}
          <div className="col-span-12 space-y-3 sm:col-span-9">
            {/* Account header */}
            <div className="flex items-start justify-between gap-3 rounded-lg border bg-card p-4">
              <div>
                <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
                  Acme Industries · USD Account
                </p>
                <p className="mt-1 font-mono text-sm font-semibold tracking-tight">
                  0123 •••• •••• 4271
                </p>
              </div>
              <Badge variant="success" className="shrink-0">
                <Banknote className="h-3 w-3" /> Active
              </Badge>
            </div>

            {/* Stat tiles */}
            <div className="grid grid-cols-3 gap-2">
              <div className="rounded-lg border bg-card p-3">
                <p className="text-[9px] uppercase tracking-wider text-muted-foreground">
                  Settled
                </p>
                <p className="mt-0.5 text-base font-semibold tabular-nums">$112.3k</p>
                <p className="text-[9px] text-success">+18.4%</p>
              </div>
              <div className="rounded-lg border bg-card p-3">
                <p className="text-[9px] uppercase tracking-wider text-muted-foreground">
                  Pending
                </p>
                <p className="mt-0.5 text-base font-semibold tabular-nums">$4.8k</p>
                <p className="text-[9px] text-warning">3 in flight</p>
              </div>
              <div className="rounded-lg border bg-card p-3">
                <p className="text-[9px] uppercase tracking-wider text-muted-foreground">
                  Routes
                </p>
                <p className="mt-0.5 text-base font-semibold tabular-nums">2</p>
                <p className="text-[9px] text-muted-foreground">Base · USDC</p>
              </div>
            </div>

            {/* Chart */}
            <div className="rounded-lg border bg-card p-3">
              <div className="mb-1 flex items-center justify-between text-[10px]">
                <span className="font-medium uppercase tracking-wider text-muted-foreground">
                  Inbound volume · 30d
                </span>
                <span className="text-success">↑ 22.3%</span>
              </div>
              <svg viewBox="0 0 320 64" className="h-14 w-full">
                <defs>
                  <linearGradient id="heroChart" x1="0" x2="0" y1="0" y2="1">
                    <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.45" />
                    <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0" />
                  </linearGradient>
                </defs>
                <path
                  d="M0,46 L20,42 L40,44 L60,36 L80,32 L100,36 L120,26 L140,28 L160,18 L180,24 L200,12 L220,18 L240,8 L260,14 L280,6 L300,10 L320,3"
                  fill="none"
                  stroke="hsl(var(--primary))"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d="M0,46 L20,42 L40,44 L60,36 L80,32 L100,36 L120,26 L140,28 L160,18 L180,24 L200,12 L220,18 L240,8 L260,14 L280,6 L300,10 L320,3 L320,64 L0,64 Z"
                  fill="url(#heroChart)"
                />
                {/* highlight dot */}
                <circle cx="280" cy="6" r="3" fill="hsl(var(--primary))" />
                <circle
                  cx="280"
                  cy="6"
                  r="6"
                  fill="hsl(var(--primary))"
                  fillOpacity="0.25"
                />
              </svg>
            </div>

            {/* Recent rows */}
            <div className="rounded-lg border bg-card">
              {[
                {
                  sender: "Globex Corp",
                  type: "WIRE",
                  amount: "$12,500.00",
                  status: "Settled",
                  good: true,
                },
                {
                  sender: "Initech",
                  type: "ACH",
                  amount: "$3,180.00",
                  status: "Pending",
                  good: false,
                },
              ].map((r, i) => (
                <div
                  key={r.sender}
                  className={`flex items-center justify-between px-3 py-2 text-[11px] ${
                    i !== 0 ? "border-t border-border/60" : ""
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="rounded bg-muted px-1.5 py-0.5 font-mono text-[9px]">
                      {r.type}
                    </span>
                    <span className="font-medium">{r.sender}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-semibold tabular-nums">
                      {r.amount}
                    </span>
                    <span
                      className={`rounded-full px-1.5 py-0.5 text-[9px] font-medium ${
                        r.good
                          ? "bg-success/10 text-success"
                          : "bg-warning/10 text-warning"
                      }`}
                    >
                      {r.status}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Floating: inbound wire (top-left) */}
      <div className="absolute -left-4 top-16 hidden rounded-xl border bg-card/95 px-3 py-2 shadow-xl backdrop-blur md:block">
        <div className="flex items-center gap-2 text-xs">
          <div className="grid h-8 w-8 place-items-center rounded-md bg-primary/10 text-primary">
            <ArrowDownToLine className="h-4 w-4" />
          </div>
          <div>
            <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
              Wire received
            </p>
            <p className="font-mono text-sm font-semibold tabular-nums">
              +$12,500.00
            </p>
          </div>
        </div>
      </div>

      {/* Floating: routing arrow (mid-right) */}
      <div className="absolute -right-4 top-1/2 hidden -translate-y-1/2 flex-col items-center gap-1 rounded-xl border bg-card/95 px-3 py-3 shadow-xl backdrop-blur lg:flex">
        <span className="text-[9px] font-semibold uppercase tracking-wider text-muted-foreground">
          USD
        </span>
        <ArrowRight className="h-4 w-4 text-primary" />
        <CircleUsdcLogo className="text-[10px]" />
        <span className="text-[9px] text-muted-foreground">Base · 12s</span>
      </div>

      {/* Floating: settled badge (bottom-right) */}
      <div className="absolute -bottom-5 right-4 hidden items-center gap-2 rounded-xl border bg-card/95 px-3 py-2 shadow-xl backdrop-blur sm:flex">
        <div className="grid h-7 w-7 place-items-center rounded-md bg-success/10 text-success">
          <Check className="h-4 w-4" />
        </div>
        <div>
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">
            Settled · Base
          </p>
          <p className="font-mono text-sm font-semibold tabular-nums">12,500 USDC</p>
        </div>
        <Sparkles className="h-3.5 w-3.5 text-success" />
      </div>

      {/* Bottom trust ribbon */}
      <div className="mx-auto mt-6 inline-flex w-full items-center justify-center gap-1.5 rounded-full border bg-card/80 px-3 py-1.5 text-[11px] font-medium text-muted-foreground shadow-sm backdrop-blur">
        <span className="inline-block h-1.5 w-1.5 animate-pulse rounded-full bg-success" />
        Live · banking by FDIC-insured partners
      </div>
    </div>
  );
}
