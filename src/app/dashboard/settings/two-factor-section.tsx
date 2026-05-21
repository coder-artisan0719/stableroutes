"use client";

import { useState, useTransition } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, ShieldCheck, ShieldOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/password-input";
import {
  confirmTwoFactorSetup,
  disableTwoFactor,
  startTwoFactorSetup,
} from "../actions";

type Setup = { secret: string; qr: string };

export function TwoFactorSection({
  enabled: initialEnabled,
  hasPassword,
}: {
  enabled: boolean;
  hasPassword: boolean;
}) {
  const router = useRouter();
  const [enabled, setEnabled] = useState(initialEnabled);
  const [setup, setSetup] = useState<Setup | null>(null);
  const [code, setCode] = useState("");
  const [showDisable, setShowDisable] = useState(false);
  const [disablePassword, setDisablePassword] = useState("");
  const [pending, startTransition] = useTransition();

  if (!hasPassword) {
    return (
      <div className="flex items-start gap-3 rounded-lg border bg-muted/30 p-4 text-sm">
        <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
        <p className="text-muted-foreground">
          Your account signs in with Google. Two-factor authentication is
          managed through your Google account&apos;s security settings.
        </p>
      </div>
    );
  }

  const begin = () =>
    startTransition(async () => {
      const res = await startTwoFactorSetup();
      if (res.ok) {
        setSetup({ secret: res.secret, qr: res.qr });
        setCode("");
      } else {
        toast.error(res.error);
      }
    });

  const confirm = () =>
    startTransition(async () => {
      const res = await confirmTwoFactorSetup(code);
      if (res.ok) {
        toast.success("Two-factor authentication is now enabled.");
        setSetup(null);
        setCode("");
        setEnabled(true);
        router.refresh();
      } else {
        toast.error(res.error);
      }
    });

  const disable = () =>
    startTransition(async () => {
      const res = await disableTwoFactor(disablePassword);
      if (res.ok) {
        toast.success("Two-factor authentication disabled.");
        setEnabled(false);
        setShowDisable(false);
        setDisablePassword("");
        router.refresh();
      } else {
        toast.error(res.error);
      }
    });

  if (enabled) {
    return (
      <div className="space-y-4">
        <div className="flex items-start gap-3 rounded-lg border border-success/40 bg-success/10 p-4">
          <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-success" />
          <div className="text-sm">
            <p className="font-medium text-foreground">
              Two-factor authentication is on
            </p>
            <p className="text-muted-foreground">
              You&apos;ll enter a code from your authenticator app each time you
              sign in.
            </p>
          </div>
        </div>

        {showDisable ? (
          <div className="space-y-3 rounded-lg border p-4">
            <Label htmlFor="disable-pw">
              Enter your password to turn off two-factor
            </Label>
            <PasswordInput
              id="disable-pw"
              autoComplete="current-password"
              value={disablePassword}
              onChange={(e) => setDisablePassword(e.target.value)}
            />
            <div className="flex gap-2">
              <Button
                variant="destructive"
                onClick={disable}
                disabled={pending || disablePassword.length === 0}
              >
                {pending && <Loader2 className="animate-spin" />}
                Turn off 2FA
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  setShowDisable(false);
                  setDisablePassword("");
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <Button variant="outline" onClick={() => setShowDisable(true)}>
            <ShieldOff className="h-4 w-4" /> Disable two-factor
          </Button>
        )}
      </div>
    );
  }

  if (setup) {
    return (
      <div className="space-y-5">
        <div>
          <p className="text-sm font-medium">
            1. Scan this QR code with your authenticator app
          </p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Google Authenticator, Authy, 1Password, Microsoft Authenticator —
            any TOTP app works.
          </p>
          <div className="mt-3 inline-block rounded-lg border bg-white p-3">
            <Image
              src={setup.qr}
              alt="Two-factor QR code"
              width={200}
              height={200}
              unoptimized
            />
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Can&apos;t scan? Enter this key manually:
          </p>
          <code className="mt-1 inline-block break-all rounded bg-muted px-2 py-1 font-mono text-xs">
            {setup.secret}
          </code>
        </div>

        <div className="space-y-2">
          <Label htmlFor="totp-code">
            2. Enter the 6-digit code from your app
          </Label>
          <div className="flex flex-wrap gap-2">
            <Input
              id="totp-code"
              inputMode="numeric"
              autoComplete="one-time-code"
              maxLength={6}
              placeholder="123456"
              value={code}
              onChange={(e) =>
                setCode(e.target.value.replace(/\D/g, "").slice(0, 6))
              }
              className="w-32 font-mono tracking-widest"
            />
            <Button onClick={confirm} disabled={pending || code.length !== 6}>
              {pending && <Loader2 className="animate-spin" />}
              Verify &amp; enable
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                setSetup(null);
                setCode("");
              }}
            >
              Cancel
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-start gap-3 rounded-lg border bg-muted/30 p-4">
        <ShieldOff className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
        <div className="text-sm">
          <p className="font-medium text-foreground">
            Two-factor authentication is off
          </p>
          <p className="text-muted-foreground">
            Protect your account with a time-based code from an authenticator
            app, required at every sign-in.
          </p>
        </div>
      </div>
      <Button onClick={begin} disabled={pending}>
        {pending && <Loader2 className="animate-spin" />}
        <ShieldCheck className="h-4 w-4" /> Set up two-factor
      </Button>
    </div>
  );
}
