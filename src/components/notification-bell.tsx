"use client";

import { useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Bell } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";
import { markAllNotificationsRead } from "@/app/dashboard/actions";

export type NotificationItem = {
  id: string;
  title: string;
  message: string;
  url: string | null;
  read: boolean;
  createdAt: Date;
};

function timeAgo(date: Date) {
  const mins = Math.floor((Date.now() - new Date(date).getTime()) / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(date).toLocaleDateString();
}

export function NotificationBell({
  items,
  unreadCount,
}: {
  items: NotificationItem[];
  unreadCount: number;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();

  // Opening the panel clears the unread badge.
  const onOpenChange = (open: boolean) => {
    if (open && unreadCount > 0) {
      startTransition(async () => {
        await markAllNotificationsRead();
        router.refresh();
      });
    }
  };

  return (
    <DropdownMenu onOpenChange={onOpenChange}>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className="relative h-10 w-10"
          aria-label={
            unreadCount > 0
              ? `Notifications, ${unreadCount} unread`
              : "Notifications"
          }
        >
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute right-1 top-1 grid h-4 min-w-4 place-items-center rounded-full bg-destructive px-1 text-[10px] font-bold leading-none text-destructive-foreground">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 p-0">
        <div className="flex items-center justify-between border-b px-4 py-2.5">
          <span className="text-sm font-semibold">Notifications</span>
          {unreadCount > 0 && (
            <span className="text-xs text-muted-foreground">
              {unreadCount} unread
            </span>
          )}
        </div>

        {items.length === 0 ? (
          <div className="px-4 py-10 text-center text-sm text-muted-foreground">
            You&apos;re all caught up.
          </div>
        ) : (
          <ul className="max-h-[22rem] overflow-y-auto">
            {items.map((n) => (
              <li key={n.id}>
                <DropdownMenuItem asChild className="cursor-pointer p-0">
                  <Link
                    href={n.url ?? "/dashboard"}
                    className={cn(
                      "flex w-full items-start gap-3 border-b px-4 py-3 last:border-b-0",
                      !n.read && "bg-primary/5",
                    )}
                  >
                    <span
                      className={cn(
                        "mt-1.5 h-2 w-2 shrink-0 rounded-full",
                        n.read ? "bg-transparent" : "bg-primary",
                      )}
                      aria-hidden
                    />
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium text-foreground">
                        {n.title}
                      </span>
                      <span className="block text-xs text-muted-foreground">
                        {n.message}
                      </span>
                      <span className="mt-0.5 block text-[11px] text-muted-foreground">
                        {timeAgo(n.createdAt)}
                      </span>
                    </span>
                  </Link>
                </DropdownMenuItem>
              </li>
            ))}
          </ul>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
