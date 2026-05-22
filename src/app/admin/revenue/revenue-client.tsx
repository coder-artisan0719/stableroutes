"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Lock, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  lockRevenue,
  unlockRevenue,
  updateTransactionExpensePct,
} from "./actions";

/** Passcode entry shown when the revenue view is locked. */
export function RevenuePasscodeGate() {
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [pending, start] = useTransition();

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) return;
    setError("");
    start(async () => {
      const res = await unlockRevenue(code);
      // On success the page re-renders automatically with the unlocked view.
      if (!res.ok) setError(res.error ?? "Incorrect passcode.");
    });
  };

  return (
    <Card className="mx-auto max-w-sm">
      <CardContent className="space-y-5 p-6">
        <div className="flex flex-col items-center gap-2 text-center">
          <div className="grid h-12 w-12 place-items-center rounded-full bg-primary/10 text-primary">
            <Lock className="h-5 w-5" />
          </div>
          <h2 className="text-lg font-semibold">Passcode required</h2>
          <p className="text-sm text-muted-foreground">
            This page is protected. Enter the revenue passcode to continue —
            admin credentials alone are not enough.
          </p>
        </div>
        <form onSubmit={submit} className="space-y-3">
          <Input
            type="password"
            autoFocus
            autoComplete="off"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="Revenue passcode"
          />
          {error && <p className="text-xs text-destructive">{error}</p>}
          <Button
            type="submit"
            className="w-full"
            disabled={pending || !code.trim()}
          >
            {pending ? "Checking…" : "Unlock"}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}

/** Re-locks the revenue view by clearing the unlock cookie. */
export function LockRevenueButton() {
  const [pending, start] = useTransition();
  return (
    <Button
      variant="outline"
      size="sm"
      disabled={pending}
      onClick={() => start(async () => void (await lockRevenue()))}
    >
      <Lock className="h-3.5 w-3.5" /> Lock
    </Button>
  );
}

/** Today / week / month presets plus a custom from/to range. */
export function RevenueRangeFilter({
  from,
  to,
}: {
  from?: string;
  to?: string;
}) {
  const router = useRouter();

  const apply = (nextFrom?: string, nextTo?: string) => {
    const params = new URLSearchParams();
    if (nextFrom) params.set("from", nextFrom);
    if (nextTo) params.set("to", nextTo);
    const qs = params.toString();
    router.replace(qs ? `/admin/revenue?${qs}` : "/admin/revenue");
  };

  const hasFilter = Boolean(from || to);

  return (
    <div className="flex flex-wrap items-end gap-3 rounded-lg border bg-card p-3">
      <div className="space-y-1.5">
        <label
          htmlFor="rev-from"
          className="block text-xs font-medium text-muted-foreground"
        >
          From
        </label>
        <Input
          id="rev-from"
          type="date"
          value={from ?? ""}
          max={to || undefined}
          onChange={(e) => apply(e.target.value || undefined, to)}
          className="h-9 w-[160px]"
        />
      </div>
      <div className="space-y-1.5">
        <label
          htmlFor="rev-to"
          className="block text-xs font-medium text-muted-foreground"
        >
          To
        </label>
        <Input
          id="rev-to"
          type="date"
          value={to ?? ""}
          min={from || undefined}
          onChange={(e) => apply(from, e.target.value || undefined)}
          className="h-9 w-[160px]"
        />
      </div>
      {hasFilter && (
        <Button variant="ghost" size="sm" onClick={() => apply()}>
          <X className="h-3.5 w-3.5" /> Clear
        </Button>
      )}
    </div>
  );
}

/** Inline per-transaction expense-rate editor used inside the revenue table. */
export function ExpenseRateCell({
  transactionId,
  expensePct,
}: {
  transactionId: string;
  expensePct: number;
}) {
  const [value, setValue] = useState(String(expensePct));
  const [pending, start] = useTransition();
  const dirty = value.trim() !== String(expensePct);

  const save = () => {
    const pct = parseFloat(value);
    start(async () => {
      const res = await updateTransactionExpensePct(transactionId, pct);
      if (res.ok) toast.success("Expense rate updated");
      else toast.error(res.error ?? "Could not save the rate");
    });
  };

  return (
    <div className="flex items-center justify-end gap-2">
      <Input
        type="number"
        min={0}
        max={100}
        step={0.1}
        value={value}
        onChange={(e) => setValue(e.target.value)}
        className="h-8 w-[5.5rem] text-right"
      />
      <span className="text-xs text-muted-foreground">%</span>
      <Button
        size="sm"
        onClick={save}
        disabled={pending || !dirty}
        className={dirty ? "" : "invisible"}
      >
        {pending ? "…" : "Save"}
      </Button>
    </div>
  );
}
