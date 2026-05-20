"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { LayoutGrid, List, Search, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

export type ProfilesQuery = {
  q: string;
  status?: "PENDING" | "APPROVED";
  sort: "newest" | "oldest" | "name";
  view: "grid" | "table";
};

export function ProfilesToolbar({
  query,
  counts,
}: {
  query: ProfilesQuery;
  counts: { all: number; pending: number; approved: number };
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [q, setQ] = useState(query.q);

  // Debounced URL sync for search input.
  useEffect(() => {
    if (q === query.q) return;
    const t = setTimeout(() => {
      push({ q });
    }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  function push(next: Partial<ProfilesQuery>) {
    const params = new URLSearchParams();
    const merged = { ...query, ...next };
    if (merged.q) params.set("q", merged.q);
    if (merged.status) params.set("status", merged.status);
    if (merged.sort && merged.sort !== "newest") params.set("sort", merged.sort);
    if (merged.view && merged.view !== "grid") params.set("view", merged.view);
    // Any filter/search change resets to page 1 — don't carry `page`.
    const qs = params.toString();
    startTransition(() => {
      router.replace(qs ? `/dashboard/profiles?${qs}` : "/dashboard/profiles");
    });
  }

  const statusTabs = [
    { key: "all", label: "All", count: counts.all },
    { key: "PENDING", label: "Pending", count: counts.pending },
    { key: "APPROVED", label: "Approved", count: counts.approved },
  ] as const;

  return (
    <div className="space-y-3">
      {/* Status pill tabs */}
      <div className="flex flex-wrap gap-1 rounded-lg border bg-card p-1 text-sm">
        {statusTabs.map((t) => {
          const active =
            (t.key === "all" && !query.status) || t.key === query.status;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() =>
                push({
                  status: t.key === "all" ? undefined : (t.key as "PENDING" | "APPROVED"),
                })
              }
              className={cn(
                "flex-1 rounded-md px-4 py-2 text-center font-medium transition-colors",
                active
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-accent",
              )}
            >
              {t.label}
              <span className="ml-1 text-xs opacity-70">({t.count})</span>
            </button>
          );
        })}
      </div>

      {/* Search + Sort + View */}
      <div className="flex flex-col gap-2 md:flex-row md:items-center">
        <div className="relative flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search by name, sender, or address…"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            className="pl-9 pr-9"
          />
          {q && (
            <button
              type="button"
              onClick={() => setQ("")}
              aria-label="Clear search"
              className="absolute right-2 top-1/2 -translate-y-1/2 rounded-md p-1 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>

        <Select value={query.sort} onValueChange={(v) => push({ sort: v as ProfilesQuery["sort"] })}>
          <SelectTrigger className="md:w-44">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="newest">Newest first</SelectItem>
            <SelectItem value="oldest">Oldest first</SelectItem>
            <SelectItem value="name">Name (A–Z)</SelectItem>
          </SelectContent>
        </Select>

        <div className="inline-flex rounded-lg border bg-card p-0.5">
          <button
            type="button"
            onClick={() => push({ view: "grid" })}
            aria-label="Grid view"
            className={cn(
              "grid h-9 w-9 place-items-center rounded-md transition-colors",
              query.view === "grid"
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:bg-accent",
            )}
          >
            <LayoutGrid className="h-4 w-4" />
          </button>
          <button
            type="button"
            onClick={() => push({ view: "table" })}
            aria-label="Table view"
            className={cn(
              "grid h-9 w-9 place-items-center rounded-md transition-colors",
              query.view === "table"
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:bg-accent",
            )}
          >
            <List className="h-4 w-4" />
          </button>
        </div>
      </div>

      {pending && (
        <p className="text-xs text-muted-foreground" aria-live="polite">
          Updating…
        </p>
      )}
    </div>
  );
}
