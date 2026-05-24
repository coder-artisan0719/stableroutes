"use client";

import { useEffect, useState } from "react";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/logo";
import { SideNav, type PanelType } from "@/components/app-nav";

const STORAGE_KEY = "sr-sidebar-collapsed";

/**
 * Desktop sidebar with a collapse toggle. State persists in localStorage so
 * the user's preference survives navigations. On mobile (md and below) the
 * sidebar is hidden — that breakpoint uses MobileNav from the app shell.
 */
export function SidebarShell({
  panel,
  panelLabel,
  rootHref,
  userEmail,
}: {
  panel: PanelType;
  panelLabel: string;
  rootHref: string;
  userEmail: string;
}) {
  // Default to expanded on first render to match SSR; the effect below
  // restores the persisted choice once the client mounts.
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    try {
      if (window.localStorage.getItem(STORAGE_KEY) === "1") setCollapsed(true);
    } catch {
      // localStorage unavailable — fall back to expanded.
    }
  }, []);

  const toggle = () => {
    setCollapsed((prev) => {
      const next = !prev;
      try {
        window.localStorage.setItem(STORAGE_KEY, next ? "1" : "0");
      } catch {
        // localStorage unavailable — state still updates in memory.
      }
      return next;
    });
  };

  const toggleLabel = collapsed ? "Expand sidebar" : "Collapse sidebar";

  return (
    <aside
      className={cn(
        "hidden shrink-0 border-r border-border bg-card transition-[width] duration-200 md:flex md:flex-col",
        collapsed ? "w-16" : "w-64",
      )}
      aria-label="Primary"
    >
      <div className="flex h-16 items-center border-b border-border px-3">
        {!collapsed && (
          <div className="min-w-0 flex-1 px-3">
            <Logo size="sm" href={rootHref} />
          </div>
        )}
        <button
          type="button"
          onClick={toggle}
          aria-label={toggleLabel}
          title={toggleLabel}
          className={cn(
            "grid h-8 w-8 place-items-center rounded-md text-muted-foreground transition-colors hover:bg-accent hover:text-foreground",
            collapsed && "mx-auto",
          )}
        >
          {collapsed ? (
            <PanelLeftOpen className="h-4 w-4" />
          ) : (
            <PanelLeftClose className="h-4 w-4" />
          )}
        </button>
      </div>

      {!collapsed && (
        <div className="px-4 py-3 text-xs font-medium uppercase tracking-wide text-muted-foreground">
          {panelLabel}
        </div>
      )}

      <SideNav panel={panel} collapsed={collapsed} />

      {!collapsed && (
        <div className="border-t border-border p-4 text-xs text-muted-foreground">
          Signed in as
          <div className="mt-1 truncate text-sm font-medium text-foreground">
            {userEmail}
          </div>
        </div>
      )}
    </aside>
  );
}
