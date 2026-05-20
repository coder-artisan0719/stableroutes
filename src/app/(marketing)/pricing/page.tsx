import Link from "next/link";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

const plans = [
  {
    name: "Starter",
    price: "$0",
    cadence: "/month",
    description: "For solo operators and side businesses.",
    cta: "Get started",
    href: "/signup",
    featured: false,
    features: [
      "1 named USD profile",
      "Up to $10k / month inbound",
      "ACH + Wire receive",
      "USDC (Base) settlement",
      "Email support",
    ],
  },
  {
    name: "Growth",
    price: "$49",
    cadence: "/month",
    description: "For agencies and growing teams.",
    cta: "Start 14-day trial",
    href: "/signup",
    featured: true,
    features: [
      "Up to 5 named USD profiles",
      "Up to $250k / month inbound",
      "Priority compliance review",
      "Webhooks & API access",
      "Priority email support",
    ],
  },
  {
    name: "Scale",
    price: "Custom",
    cadence: "",
    description: "For high-volume operators.",
    cta: "Contact sales",
    href: "/contact",
    featured: false,
    features: [
      "Unlimited named USD profiles",
      "Custom volume limits",
      "Dedicated account manager",
      "Custom SLAs & onboarding",
      "Direct Slack channel",
    ],
  },
];

export default function PricingPage() {
  return (
    <div className="container py-24">
      <div className="mx-auto max-w-2xl text-center">
        <p className="text-sm font-semibold uppercase tracking-wide text-primary">
          Pricing
        </p>
        <h1 className="mt-2 font-display text-4xl font-bold tracking-tight md:text-5xl">
          Simple, predictable plans
        </h1>
        <p className="mt-4 text-muted-foreground">
          No surprise fees on settlement. Pay for the volume and profiles you need.
        </p>
      </div>
      <div className="mt-16 grid grid-cols-1 gap-6 lg:grid-cols-3">
        {plans.map((p) => (
          <div
            key={p.name}
            className={`relative rounded-2xl border p-8 ${
              p.featured
                ? "border-primary/50 bg-gradient-to-b from-primary/5 to-card shadow-lg"
                : "bg-card"
            }`}
          >
            {p.featured && (
              <Badge className="absolute -top-3 left-1/2 -translate-x-1/2">
                Most popular
              </Badge>
            )}
            <h3 className="text-lg font-semibold">{p.name}</h3>
            <p className="mt-2 text-sm text-muted-foreground">{p.description}</p>
            <div className="mt-6 flex items-baseline gap-1">
              <span className="text-4xl font-bold tracking-tight">{p.price}</span>
              <span className="text-sm text-muted-foreground">{p.cadence}</span>
            </div>
            <Button
              asChild
              className="mt-6 w-full"
              variant={p.featured ? "default" : "outline"}
            >
              <Link href={p.href}>{p.cta}</Link>
            </Button>
            <ul className="mt-8 space-y-3">
              {p.features.map((f) => (
                <li key={f} className="flex items-start gap-2 text-sm">
                  <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" />
                  <span>{f}</span>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    </div>
  );
}
