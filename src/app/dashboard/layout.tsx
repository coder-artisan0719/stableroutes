import { requireCustomer } from "@/lib/auth-guards";
import { getInAppNotifications } from "@/lib/notifications";
import { AppShell } from "@/components/app-shell";
import { IdleTimeout } from "@/components/idle-timeout";
import { AutoRefresh } from "@/components/auto-refresh";
import { DashboardChatbot } from "@/components/dashboard-chatbot";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireCustomer();
  const notifications = await getInAppNotifications(session.user.id);

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
        notifications={notifications}
      >
        {children}
      </AppShell>
      <DashboardChatbot />
    </>
  );
}
