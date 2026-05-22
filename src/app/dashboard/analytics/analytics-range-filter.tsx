"use client";

import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export function AnalyticsRangeFilter({
  from,
  to,
}: {
  from?: string;
  to?: string;
}) {
  const router = useRouter();

  const apply = (nextFrom?: string, nextTo?: string) => {
    const params = new URLSearchParams();
    if (nextFrom) params.set("from", nextFrom);
    if (nextTo) params.set("to", nextTo);
    const qs = params.toString();
    router.replace(qs ? `/dashboard/analytics?${qs}` : "/dashboard/analytics");
  };

  const hasFilter = Boolean(from || to);

  return (
    <div className="flex flex-wrap items-end gap-3 rounded-lg border bg-card p-3">
      <div className="space-y-1.5">
        <label
          htmlFor="an-from"
          className="block text-xs font-medium text-muted-foreground"
        >
          From
        </label>
        <Input
          id="an-from"
          type="date"
          value={from ?? ""}
          max={to || undefined}
          onChange={(e) => apply(e.target.value || undefined, to)}
          className="h-9 w-[160px]"
        />
      </div>
      <div className="space-y-1.5">
        <label
          htmlFor="an-to"
          className="block text-xs font-medium text-muted-foreground"
        >
          To
        </label>
        <Input
          id="an-to"
          type="date"
          value={to ?? ""}
          min={from || undefined}
          onChange={(e) => apply(from, e.target.value || undefined)}
          className="h-9 w-[160px]"
        />
      </div>
      {hasFilter && (
        <Button variant="ghost" size="sm" onClick={() => apply()}>
          <X className="h-3.5 w-3.5" /> Clear
        </Button>
      )}
    </div>
  );
}
