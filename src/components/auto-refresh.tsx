"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

/**
 * Silently re-fetches the current route's server data on an interval, so the
 * customer (or admin) sees new transactions, status changes and profile
 * updates appear without a manual page reload. `router.refresh()` re-runs the
 * server components only — client state (open dialogs, scroll) is preserved.
 *
 * Polling pauses while the tab is hidden and fires once immediately when it
 * becomes visible again, so a returning user always sees fresh data.
 */
export function AutoRefresh({ intervalMs = 20000 }: { intervalMs?: number }) {
  const router = useRouter();

  useEffect(() => {
    const refresh = () => {
      if (document.visibilityState === "visible") router.refresh();
    };
    const id = window.setInterval(refresh, intervalMs);
    document.addEventListener("visibilitychange", refresh);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", refresh);
    };
  }, [router, intervalMs]);

  return null;
}
