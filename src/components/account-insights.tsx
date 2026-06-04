"use client";

import { useEffect, useState } from "react";
import { Loader2, RefreshCw, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

/**
 * Customer-side AI insights card. To avoid burning OpenAI credits on every
 * dashboard mount, this component does NOT auto-generate an AI summary.
 * It loads the FREE templated summary first (server returns it without
 * calling OpenAI). The customer can opt in to an AI rewrite via a button,
 * which fires `?force=1`; the server caches that AI answer for 6h per
 * user so repeated clicks reuse the same text at zero cost.
 */

export function AccountInsights() {
  const [summary, setSummary] = useState<string | null>(null);
  const [aiUsed, setAiUsed] = useState(false);
  const [cached, setCached] = useState(false);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  // Initial load — no `force`, so the server returns either a cached AI
  // answer (free) or the templated fallback (free). Zero credits spent.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/dashboard-insights", {
          cache: "no-store",
        });
        const json = (await res.json()) as {
          summary?: string;
          aiUsed?: boolean;
          cached?: boolean;
        };
        if (cancelled) return;
        setSummary(json.summary ?? null);
        setAiUsed(Boolean(json.aiUsed));
        setCached(Boolean(json.cached));
      } catch {
        if (!cancelled) setSummary(null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Explicit opt-in — generates a fresh AI summary (or returns cached if
  // still within the 6h server window).
  const generate = async () => {
    setGenerating(true);
    try {
      const res = await fetch("/api/dashboard-insights?force=1", {
        cache: "no-store",
      });
      const json = (await res.json()) as {
        summary?: string;
        aiUsed?: boolean;
        cached?: boolean;
      };
      setSummary(json.summary ?? summary);
      setAiUsed(Boolean(json.aiUsed));
      setCached(Boolean(json.cached));
    } catch {
      /* leave the existing summary in place */
    } finally {
      setGenerating(false);
    }
  };

  if (!loading && !summary) return null;

  return (
    <Card className="border-primary/20 bg-gradient-to-br from-primary/[0.06] to-transparent">
      <CardContent className="flex items-start gap-3 p-5">
        <div className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
          <Sparkles className="h-4 w-4" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h3 className="text-sm font-semibold">Your account at a glance</h3>
            {aiUsed && (
              <span
                className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-primary"
                title={
                  cached
                    ? "AI summary cached for 6 hours"
                    : "Fresh AI summary"
                }
              >
                AI{cached ? " · cached" : ""}
              </span>
            )}
          </div>
          {loading ? (
            <p className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
              Reading your last 30 days…
            </p>
          ) : (
            <p className="mt-1 text-sm text-foreground/90">{summary}</p>
          )}
          {!loading && (
            <div className="mt-2">
              <Button
                type="button"
                size="sm"
                variant="ghost"
                onClick={generate}
                disabled={generating}
                className="h-7 gap-1.5 px-2 text-xs"
              >
                {generating ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : aiUsed ? (
                  <RefreshCw className="h-3 w-3" />
                ) : (
                  <Sparkles className="h-3 w-3" />
                )}
                {aiUsed ? "Refresh AI insight" : "Generate AI insight"}
              </Button>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
