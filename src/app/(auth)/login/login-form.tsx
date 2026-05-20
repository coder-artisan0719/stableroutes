"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle, CheckCircle2, Clock, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/password-input";
import { GoogleButton } from "@/components/google-button";
import { loginSchema } from "@/lib/validators";
import type { z } from "zod";

type LoginInput = z.infer<typeof loginSchema>;

export function LoginForm({
  callbackUrl,
  initialError,
  verified,
  expired,
  reset,
  prefillEmail,
}: {
  callbackUrl?: string;
  initialError?: string;
  verified?: boolean;
  expired?: boolean;
  reset?: boolean;
  prefillEmail?: string;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(
    initialError === "CredentialsSignin" ? "Invalid email or password." : null,
  );
  const [pending, startTransition] = useTransition();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: prefillEmail ? { email: prefillEmail } : undefined,
  });

  const onSubmit = handleSubmit((data) => {
    setError(null);
    startTransition(async () => {
      const res = await signIn("credentials", {
        email: data.email,
        password: data.password,
        redirect: false,
      });
      if (res?.error) {
        // signIn failed — was it because the email isn't verified, or wrong
        // password? Ask the server. (Also reissues a fresh code if unverified.)
        try {
          const check = await fetch("/api/check-email", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email: data.email }),
          });
          const body = await check.json().catch(() => ({}));
          if (body?.needsVerification) {
            toast.message("Please verify your email — we sent a fresh code.");
            router.replace(
              `/verify-email?email=${encodeURIComponent(data.email)}`,
            );
            return;
          }
        } catch {
          // fall through to generic error
        }
        setError("Invalid email or password.");
        return;
      }
      toast.success("Signed in");
      router.replace(callbackUrl || "/dashboard");
      router.refresh();
    });
  });

  return (
    <div className="space-y-4">
      <GoogleButton label="Continue with Google" callbackUrl={callbackUrl || "/dashboard"} />

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-card px-2 text-muted-foreground">Or with email</span>
        </div>
      </div>

      <form onSubmit={onSubmit} className="space-y-4">
        {verified && !error && (
          <div className="flex items-start gap-2 rounded-lg border border-success/40 bg-success/10 p-3 text-sm text-success">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
            <span>Email verified. You can sign in now.</span>
          </div>
        )}
        {expired && !error && !verified && !reset && (
          <div className="flex items-start gap-2 rounded-lg border border-warning/40 bg-warning/10 p-3 text-sm text-warning">
            <Clock className="mt-0.5 h-4 w-4 shrink-0" />
            <span>
              You were signed out after 1 hour of inactivity. Please sign in
              again.
            </span>
          </div>
        )}
        {reset && !error && (
          <div className="flex items-start gap-2 rounded-lg border border-success/40 bg-success/10 p-3 text-sm text-success">
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
            <span>Password updated. Sign in with your new password.</span>
          </div>
        )}
        {error && (
          <div className="flex items-start gap-2 rounded-lg border border-destructive/40 bg-destructive/10 p-3 text-sm text-destructive">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
        )}
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="you@company.com"
            {...register("email")}
          />
          {errors.email && (
            <p className="text-xs text-destructive">{errors.email.message}</p>
          )}
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Password</Label>
            <Link
              href="/forgot-password"
              className="text-xs font-medium text-primary hover:underline"
            >
              Forgot password?
            </Link>
          </div>
          <PasswordInput
            id="password"
            autoComplete="current-password"
            placeholder="••••••••"
            {...register("password")}
          />
          {errors.password && (
            <p className="text-xs text-destructive">{errors.password.message}</p>
          )}
        </div>
        <Button type="submit" className="w-full" disabled={pending}>
          {pending ? <Loader2 className="animate-spin" /> : null}
          Sign in
        </Button>
      </form>
    </div>
  );
}
