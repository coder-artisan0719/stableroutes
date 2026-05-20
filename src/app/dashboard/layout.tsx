import { requireCustomer } from "@/lib/auth-guards";
import { AppShell } from "@/components/app-shell";
import { IdleTimeout } from "@/components/idle-timeout";

export const dynamic = "force-dynamic";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireCustomer();
  return (
    <>
      <IdleTimeout />
      <AppShell
        user={{
          name: session.user.name ?? null,
          email: session.user.email ?? "",
          role: session.user.role,
        }}
        panel="customer"
        settingsHref="/dashboard/settings"
        panelLabel="Customer"
      >
        {children}
      </AppShell>
    </>
  );
}
