import { requireAdmin } from "@/lib/auth-guards";
import { prisma } from "@/lib/prisma";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { SettingsForms } from "@/app/dashboard/settings/settings-forms";
import { TwoFactorSection } from "@/app/dashboard/settings/two-factor-section";
import { SignInHistory } from "@/components/sign-in-history";

export const metadata = { title: "Admin settings" };

export default async function AdminSettingsPage() {
  const session = await requireAdmin();
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      email: true,
      name: true,
      twoFactor: true,
      passwordHash: true,
    },
  });
  if (!user) throw new Error("User not found");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold tracking-tight">Settings</h1>
        <p className="mt-1 text-muted-foreground">
          Manage your admin account credentials.
        </p>
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Account</CardTitle>
          <CardDescription>
            Same controls as customers, scoped to the admin user.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SettingsForms user={{ id: user.id, name: user.name, email: user.email }} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Security</CardTitle>
          <CardDescription>
            Admin accounts have elevated access — enabling two-factor
            authentication is strongly recommended.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <TwoFactorSection
            enabled={user.twoFactor}
            hasPassword={user.passwordHash !== null}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Recent sign-ins</CardTitle>
          <CardDescription>
            Device and location for the last 10 times your admin account was
            accessed. Investigate anything unfamiliar immediately.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <SignInHistory userId={user.id} />
        </CardContent>
      </Card>
    </div>
  );
}
