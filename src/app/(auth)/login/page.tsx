import Link from "next/link";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { LoginForm } from "./login-form";

export const metadata = { title: "Sign in" };

export default function LoginPage({
  searchParams,
}: {
  searchParams: {
    callbackUrl?: string;
    error?: string;
    verified?: string;
    email?: string;
    expired?: string;
    reset?: string;
  };
}) {
  return (
    <Card>
      <CardHeader className="text-center">
        <CardTitle className="text-2xl">Welcome back</CardTitle>
        <CardDescription>Sign in to manage your StableRoute account</CardDescription>
      </CardHeader>
      <CardContent>
        <LoginForm
          callbackUrl={searchParams.callbackUrl}
          initialError={searchParams.error}
          verified={searchParams.verified === "1"}
          expired={searchParams.expired === "1"}
          reset={searchParams.reset === "1"}
          prefillEmail={searchParams.email}
        />
        <p className="mt-6 text-center text-sm text-muted-foreground">
          Don&apos;t have an account?{" "}
          <Link href="/signup" className="font-medium text-primary hover:underline">
            Create one
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
