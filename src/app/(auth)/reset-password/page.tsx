import Link from "next/link";
import { redirect } from "next/navigation";
import { ShieldCheck } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { ResetForm } from "./reset-form";

export const metadata = { title: "Reset password" };

export default function ResetPasswordPage({
  searchParams,
}: {
  searchParams: { email?: string };
}) {
  const email = searchParams.email?.toLowerCase().trim();
  if (!email) redirect("/forgot-password");

  return (
    <Card>
      <CardHeader className="text-center">
        <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-full bg-primary/10 text-primary">
          <ShieldCheck className="h-5 w-5" />
        </div>
        <CardTitle className="text-2xl">Set a new password</CardTitle>
        <CardDescription>
          We sent a 6-digit code to <span className="font-medium">{email}</span>.
          Enter it below with your new password.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ResetForm email={email} />
        <p className="mt-6 text-center text-xs text-muted-foreground">
          Wrong email?{" "}
          <Link
            href="/forgot-password"
            className="font-medium text-primary hover:underline"
          >
            Start over
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
