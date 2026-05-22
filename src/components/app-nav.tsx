"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Gift,
  LayoutDashboard,
  Megaphone,
  Receipt,
  Settings,
  ShieldCheck,
  UserCircle2,
  Users,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";

export type PanelType = "customer" | "admin";

type NavItem = { href: string; label: string; icon: LucideIcon };

const NAV: Record<PanelType, NavItem[]> = {
  customer: [
    { href: "/dashboard", label: "Overview", icon: LayoutDashboard },
    { href: "/dashboard/profiles", label: "Profiles", icon: UserCircle2 },
    { href: "/dashboard/transactions", label: "Transactions", icon: Receipt },
    { href: "/dashboard/referrals", label: "Referrals", icon: Gift },
    { href: "/dashboard/settings", label: "Settings", icon: Settings },
  ],
  admin: [
    { href: "/admin", label: "Overview", icon: LayoutDashboard },
    { href: "/admin/profiles", label: "Profiles", icon: ShieldCheck },
    { href: "/admin/transactions", label: "Transactions", icon: Receipt },
    { href: "/admin/customers", label: "Customers", icon: Users },
    { href: "/admin/announcements", label: "Announcements", icon: Megaphone },
    { href: "/admin/referrals", label: "Referrals", icon: Gift },
    { href: "/admin/settings", label: "Settings", icon: Settings },
  ],
};

export function SideNav({ panel }: { panel: PanelType }) {
  const items = NAV[panel];
  const rootHref = items[0]?.href ?? "/";
  const pathname = usePathname() ?? "";
  return (
    <nav className="flex-1 space-y-1 px-3">
      {items.map((item) => {
        const isRoot = item.href === rootHref;
        const active = isRoot ? pathname === rootHref : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
              active
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:bg-accent hover:text-foreground",
            )}
          >
            <item.icon className="h-4 w-4" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}

export function MobileNav({ panel }: { panel: PanelType }) {
  const items = NAV[panel];
  const rootHref = items[0]?.href ?? "/";
  const pathname = usePathname() ?? "";
  return (
    <nav className="flex gap-1 overflow-x-auto border-b border-border bg-card px-3 py-2">
      {items.map((item) => {
        const isRoot = item.href === rootHref;
        const active = isRoot ? pathname === rootHref : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center gap-2 whitespace-nowrap rounded-lg px-3 py-2 text-sm font-medium",
              active ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-accent",
            )}
          >
            <item.icon className="h-4 w-4" />
            {item.label}
          </Link>
        );
      })}
    </nav>
  );
}
