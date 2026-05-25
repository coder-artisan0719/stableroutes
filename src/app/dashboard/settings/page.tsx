import { requireCustomer } from "@/lib/auth-guards";
import { prisma } from "@/lib/prisma";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { SettingsForms } from "./settings-forms";
import { TwoFactorSection } from "./two-factor-section";
import { SignInHistory } from "@/components/sign-in-history";

export const metadata = { title: "Settings" };

export default async function SettingsPage() {
  const session = await requireCustomer();
  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      email: true,
      name: true,
      createdAt: true,
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
          Manage your account details and password.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Account</CardTitle>
          <CardDescription>
            Your email is the unique identifier on your account.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <SettingsForms
            user={{ id: user.id, name: user.name, email: user.email }}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Security</CardTitle>
          <CardDescription>
            Add an extra layer of protection to your account at sign-in.
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
            Device and location for the last 10 times your account was
            accessed. Anything you don&apos;t recognise? Change your password
            and enable two-factor authentication.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <SignInHistory userId={user.id} />
        </CardContent>
      </Card>
    </div>
  );
}
