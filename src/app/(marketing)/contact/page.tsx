import { Mail, MessageSquare, Phone } from "lucide-react";

const channels = [
  {
    icon: Mail,
    title: "Email",
    body: "Reach our team in your timezone.",
    value: "hello@stableroute.io",
    href: "mailto:hello@stableroute.io",
  },
  {
    icon: MessageSquare,
    title: "Sales",
    body: "Talk to someone about Scale or enterprise.",
    value: "sales@stableroute.io",
    href: "mailto:sales@stableroute.io",
  },
  {
    icon: Phone,
    title: "Support",
    body: "Existing customer? We're here Mon–Fri.",
    value: "support@stableroute.io",
    href: "mailto:support@stableroute.io",
  },
];

export default function ContactPage() {
  return (
    <div className="container py-24">
      <div className="mx-auto max-w-2xl text-center">
        <h1 className="font-display text-4xl font-bold tracking-tight md:text-5xl">
          Get in touch
        </h1>
        <p className="mt-4 text-muted-foreground">
          We respond to most messages within one business day.
        </p>
      </div>
      <div className="mx-auto mt-16 grid max-w-3xl grid-cols-1 gap-6 md:grid-cols-3">
        {channels.map((c) => (
          <a
            key={c.title}
            href={c.href}
            className="rounded-xl border bg-card p-6 transition-shadow hover:shadow-md"
          >
            <div className="mb-4 grid h-10 w-10 place-items-center rounded-lg bg-primary/10 text-primary">
              <c.icon className="h-5 w-5" />
            </div>
            <h3 className="font-semibold">{c.title}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{c.body}</p>
            <p className="mt-3 font-mono text-sm text-foreground">{c.value}</p>
          </a>
        ))}
      </div>
    </div>
  );
}
