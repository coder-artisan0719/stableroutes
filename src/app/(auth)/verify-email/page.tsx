import Link from "next/link";
import { redirect } from "next/navigation";
import { MailCheck } from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { VerifyForm } from "./verify-form";

export const metadata = { title: "Verify your email" };

export default function VerifyEmailPage({
  searchParams,
}: {
  searchParams: { email?: string };
}) {
  const email = searchParams.email?.toLowerCase().trim();
  if (!email) redirect("/signup");

  return (
    <Card>
      <CardHeader className="text-center">
        <div className="mx-auto mb-3 grid h-12 w-12 place-items-center rounded-full bg-primary/10 text-primary">
          <MailCheck className="h-5 w-5" />
        </div>
        <CardTitle className="text-2xl">Check your email</CardTitle>
        <CardDescription>
          We sent a 6-digit code to <span className="font-medium">{email}</span>.
          Enter it below to finish creating your account.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <VerifyForm email={email} />
        <p className="mt-6 text-center text-xs text-muted-foreground">
          Wrong email?{" "}
          <Link href="/signup" className="font-medium text-primary hover:underline">
            Start over
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
