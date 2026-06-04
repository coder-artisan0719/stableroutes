"use client";

import { useState } from "react";
import Link from "next/link";
import { Loader2, Search, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

type SearchResults = {
  intent?: {
    entities: string[];
    keywords: string[];
    status: string | null;
    txType: "ACH" | "WIRE" | null;
    minAmountCents: number | null;
    maxAmountCents: number | null;
    daysBack: number | null;
  };
  aiUsed?: boolean;
  fallbackReason?: "quota" | "no-key" | "ai-error" | null;
  results: {
    transactions: Array<{
      id: string;
      href: string;
      title: string;
      subtitle: string;
      status: string;
      date: string;
      risk: number | null;
    }>;
    profiles: Array<{
      id: string;
      href: string;
      title: string;
      subtitle: string;
      status: string;
      date: string;
      pendingChange: boolean;
    }>;
    customers: Array<{
      id: string;
      href: string;
      title: string;
      subtitle: string;
      telegram: string | null;
      blocked: boolean;
      date: string;
    }>;
    tasks: Array<{
      id: string;
      href: string;
      title: string;
      subtitle: string;
      status: string;
      priority: string;
      date: string;
    }>;
  };
};

const EXAMPLES = [
  "wire transfers over $5,000 in the last 7 days",
  "blocked customers with telegram handles",
  "tasks about pending confirmation",
  "rejected profiles",
  "any address change pending",
];

export function SmartSearchClient() {
  const [query, setQuery] = useState("");
  const [pending, setPending] = useState(false);
  const [data, setData] = useState<SearchResults | null>(null);
  const [error, setError] = useState<string | null>(null);

  const search = async (q: string) => {
    const trimmed = q.trim();
    if (trimmed.length === 0 || pending) return;
    setPending(true);
    setError(null);
    try {
      const res = await fetch("/api/admin-search", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ query: trimmed }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Search failed");
      setData(json);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Search failed");
    } finally {
      setPending(false);
    }
  };

  return (
    <div className="space-y-6">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          search(query);
        }}
        className="space-y-3"
      >
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="e.g. 'completed wire transfers over $1k from Acme this month'"
              className="pl-9"
            />
          </div>
          <Button type="submit" disabled={pending || query.trim().length === 0}>
            {pending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Sparkles className="h-4 w-4" />
            )}
            Search
          </Button>
        </div>
        <div className="flex flex-wrap gap-1.5">
          <span className="text-xs text-muted-foreground">Examples:</span>
          {EXAMPLES.map((ex) => (
            <button
              key={ex}
              type="button"
              onClick={() => {
                setQuery(ex);
                search(ex);
              }}
              className="rounded-full border bg-card px-3 py-0.5 text-xs text-muted-foreground hover:bg-accent hover:text-foreground"
            >
              {ex}
            </button>
          ))}
        </div>
      </form>

      {error && (
        <p className="rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
          {error}
        </p>
      )}

      {data?.fallbackReason && (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 text-xs text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300">
          <span className="font-semibold">Plain-keyword search:</span>{" "}
          {data.fallbackReason === "quota"
            ? "the AI quota is exhausted, so results are matched on raw keywords. Top the OpenAI account up to re-enable smart parsing."
            : data.fallbackReason === "no-key"
              ? "OPENAI_API_KEY isn't set on this environment. Add it to .env to enable AI intent parsing."
              : "AI parsing failed for this query — results were matched on raw keywords instead."}
        </div>
      )}

      {data?.intent && (data.intent.keywords.length > 0 || data.intent.status) && (
        <div className="rounded-lg border bg-muted/40 p-3 text-xs text-muted-foreground">
          <span className="font-medium text-foreground">
            {data.aiUsed ? "AI understood:" : "Searching for:"}
          </span>{" "}
          {data.intent.entities.length > 0 && (
            <span>
              entities: {data.intent.entities.join(", ")}
              {" · "}
            </span>
          )}
          {data.intent.keywords.length > 0 && (
            <span>keywords: {data.intent.keywords.join(", ")}{" · "}</span>
          )}
          {data.intent.status && <span>status: {data.intent.status}{" · "}</span>}
          {data.intent.txType && <span>type: {data.intent.txType}{" · "}</span>}
          {data.intent.minAmountCents != null && (
            <span>
              ≥ ${(data.intent.minAmountCents / 100).toLocaleString()}{" · "}
            </span>
          )}
          {data.intent.maxAmountCents != null && (
            <span>
              ≤ ${(data.intent.maxAmountCents / 100).toLocaleString()}{" · "}
            </span>
          )}
          {data.intent.daysBack && (
            <span>last {data.intent.daysBack} days</span>
          )}
        </div>
      )}

      {data && (
        <div className="grid gap-6 lg:grid-cols-2">
          <ResultGroup
            title="Transactions"
            count={data.results.transactions.length}
            items={data.results.transactions.map((t) => ({
              id: t.id,
              href: t.href,
              title: t.title,
              subtitle: t.subtitle,
              meta: t.date,
              tag: t.status,
              extra:
                t.risk != null
                  ? `risk ${t.risk}`
                  : undefined,
            }))}
          />
          <ResultGroup
            title="Profiles"
            count={data.results.profiles.length}
            items={data.results.profiles.map((p) => ({
              id: p.id,
              href: p.href,
              title: p.title,
              subtitle: p.subtitle,
              meta: p.date,
              tag: p.status,
              extra: p.pendingChange ? "change pending" : undefined,
            }))}
          />
          <ResultGroup
            title="Customers"
            count={data.results.customers.length}
            items={data.results.customers.map((c) => ({
              id: c.id,
              href: c.href,
              title: c.title,
              subtitle: c.subtitle,
              meta: c.date,
              tag: c.blocked ? "BLOCKED" : "ACTIVE",
              extra: c.telegram ?? undefined,
            }))}
          />
          <ResultGroup
            title="Tasks"
            count={data.results.tasks.length}
            items={data.results.tasks.map((t) => ({
              id: t.id,
              href: t.href,
              title: t.title,
              subtitle: t.subtitle,
              meta: t.date,
              tag: t.status,
              extra: t.priority,
            }))}
          />
        </div>
      )}
    </div>
  );
}

function ResultGroup({
  title,
  count,
  items,
}: {
  title: string;
  count: number;
  items: Array<{
    id: string;
    href: string;
    title: string;
    subtitle: string;
    meta: string;
    tag?: string;
    extra?: string;
  }>;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-3">
        <CardTitle className="text-base">{title}</CardTitle>
        <span className="rounded-full bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">
          {count}
        </span>
      </CardHeader>
      <CardContent className="space-y-2">
        {items.length === 0 ? (
          <p className="rounded-lg border border-dashed p-3 text-center text-xs text-muted-foreground">
            No matches.
          </p>
        ) : (
          items.map((it) => (
            <Link
              key={it.id}
              href={it.href}
              className="block rounded-lg border bg-card p-3 text-sm transition-colors hover:bg-accent"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium">{it.title}</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {it.subtitle}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  {it.tag && (
                    <span className="inline-block rounded-full bg-muted px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">
                      {it.tag}
                    </span>
                  )}
                  {it.extra && (
                    <div className="mt-1 text-[10px] text-muted-foreground">
                      {it.extra}
                    </div>
                  )}
                  <div className="mt-1 text-[10px] text-muted-foreground">
                    {it.meta}
                  </div>
                </div>
              </div>
            </Link>
          ))
        )}
      </CardContent>
    </Card>
  );
}
