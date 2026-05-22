import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { SignupForm } from "./signup-form";

export const metadata = { title: "Create account" };

export default function SignupPage({
  searchParams,
}: {
  searchParams: { ref?: string };
}) {
  const referralCode =
    typeof searchParams.ref === "string" && searchParams.ref.trim()
      ? searchParams.ref.trim().toUpperCase()
      : undefined;

  return (
    <Card>
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">Create your account</CardTitle>
        <CardDescription>
          Open a custom-named USD account in under a minute
        </CardDescription>
      </CardHeader>
      <CardContent>
        <SignupForm referralCode={referralCode} />
        <p className="mt-6 text-center text-sm text-muted-foreground">
          Already have an account?{" "}
          <Link href="/login" className="font-medium text-primary hover:underline">
            Sign in
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
