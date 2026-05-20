import { requireAdmin } from "@/lib/auth-guards";
import { AppShell } from "@/components/app-shell";

export const dynamic = "force-dynamic";

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireAdmin();
  return (
    <AppShell
      user={{
        name: session.user.name ?? null,
        email: session.user.email ?? "",
        role: session.user.role,
      }}
      panel="admin"
      settingsHref="/admin/settings"
      panelLabel="Admin Console"
    >
      {children}
    </AppShell>
  );
}
