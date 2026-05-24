import Link from "next/link";
import { signOut } from "@/auth";
import { Logo } from "@/components/logo";
import { ThemeToggle } from "@/components/theme-toggle";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LogOut, Settings, User as UserIcon } from "lucide-react";
import { MobileNav, type PanelType } from "@/components/app-nav";
import { SidebarShell } from "@/components/sidebar-shell";
import {
  NotificationBell,
  type NotificationItem,
} from "@/components/notification-bell";

const ROOT_HREF: Record<PanelType, string> = {
  customer: "/dashboard",
  admin: "/admin",
};

export function AppShell({
  user,
  panel,
  settingsHref,
  panelLabel,
  notifications,
  children,
}: {
  user: { name: string | null; email: string; role: string };
  panel: PanelType;
  settingsHref: string;
  panelLabel: string;
  notifications?: { items: NotificationItem[]; unreadCount: number };
  children: React.ReactNode;
}) {
  const rootHref = ROOT_HREF[panel];
  const initials =
    (user.name ?? user.email)
      .split(/\s+|@/)
      .filter(Boolean)
      .slice(0, 2)
      .map((s) => s[0]?.toUpperCase())
      .join("") || "?";

  return (
    <div className="flex min-h-screen bg-muted/20">
      <SidebarShell
        panel={panel}
        panelLabel={panelLabel}
        rootHref={rootHref}
        userEmail={user.email}
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-background/80 px-4 backdrop-blur md:px-8">
          <div className="md:hidden">
            <Logo size="sm" href={rootHref} />
          </div>
          <div className="flex flex-1 items-center justify-end gap-2">
            {notifications && (
              <NotificationBell
                items={notifications.items}
                unreadCount={notifications.unreadCount}
              />
            )}
            <ThemeToggle />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="h-10 gap-2 px-2">
                  <Avatar className="h-8 w-8">
                    <AvatarFallback className="bg-primary/10 text-primary">
                      {initials}
                    </AvatarFallback>
                  </Avatar>
                  <span className="hidden text-left text-sm font-medium md:block">
                    {user.name ?? user.email.split("@")[0]}
                  </span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <div className="font-medium">{user.name ?? "Account"}</div>
                  <div className="truncate text-xs text-muted-foreground">
                    {user.email}
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem asChild>
                  <Link href={settingsHref}>
                    <Settings className="h-4 w-4" /> Settings
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuItem asChild>
                  <Link href="/">
                    <UserIcon className="h-4 w-4" /> Visit site
                  </Link>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <form
                  action={async () => {
                    "use server";
                    await signOut({ redirectTo: "/" });
                  }}
                >
                  <button
                    type="submit"
                    className="flex w-full cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors hover:bg-accent"
                  >
                    <LogOut className="h-4 w-4" /> Sign out
                  </button>
                </form>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>
        <div className="md:hidden">
          <MobileNav panel={panel} />
        </div>
        <main className="flex-1 p-4 md:p-8">
          <div className="mx-auto max-w-7xl">{children}</div>
        </main>
      </div>
    </div>
  );
}
