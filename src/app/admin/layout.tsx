import { requireAdmin } from "@/lib/auth-guards";
import { getInAppNotifications } from "@/lib/notifications";
import { AppShell } from "@/components/app-shell";
import { AutoRefresh } from "@/components/auto-refresh";

export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireAdmin();
  const notifications = await getInAppNotifications(session.user.id);

  return (
    <>
      <AutoRefresh />
      <AppShell
        user={{
          name: session.user.name ?? null,
          email: session.user.email ?? "",
          role: session.user.role,
        }}
        panel="admin"
        settingsHref="/admin/settings"
        panelLabel="Admin Console"
        notifications={notifications}
      >
        {children}
      </AppShell>
    </>
  );
}
