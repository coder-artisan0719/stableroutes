import { requireCustomer } from "@/lib/auth-guards";
import { prisma } from "@/lib/prisma";
import { AppShell } from "@/components/app-shell";
import { IdleTimeout } from "@/components/idle-timeout";
import { AutoRefresh } from "@/components/auto-refresh";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireCustomer();

  const [notifications, unreadCount] = await Promise.all([
    prisma.notification.findMany({
      where: { userId: session.user.id, channel: "IN_APP" },
      orderBy: { createdAt: "desc" },
      take: 15,
      select: {
        id: true,
        subject: true,
        body: true,
        url: true,
        readAt: true,
        createdAt: true,
      },
    }),
    prisma.notification.count({
      where: { userId: session.user.id, channel: "IN_APP", readAt: null },
    }),
  ]);

  return (
    <>
      <IdleTimeout />
      <AutoRefresh />
      <AppShell
        user={{
          name: session.user.name ?? null,
          email: session.user.email ?? "",
          role: session.user.role,
        }}
        panel="customer"
        settingsHref="/dashboard/settings"
        panelLabel="Customer"
        notifications={{
          items: notifications.map((n) => ({
            id: n.id,
            title: n.subject,
            message: n.body,
            url: n.url,
            read: n.readAt !== null,
            createdAt: n.createdAt,
          })),
          unreadCount,
        }}
      >
        {children}
      </AppShell>
    </>
  );
}
