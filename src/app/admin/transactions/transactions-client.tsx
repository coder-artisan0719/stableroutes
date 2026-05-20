"use client";

import { useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import {
  Check,
  Clock,
  Loader2,
  MoreHorizontal,
  Plus,
  Undo2,
  X,
} from "lucide-react";
import type { Transaction, TransactionStatus } from "@prisma/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { TransactionStatusBadge } from "@/components/status-badge";
import { formatDateTime, formatUSD, truncateMiddle } from "@/lib/utils";
import { adminCreateTransaction, setTransactionStatus } from "../actions";

type Row = Transaction & {
  userEmail: string;
  userName: string | null;
  profileName: string;
};

export type ApprovedProfile = {
  id: string;
  firstName: string;
  lastName: string;
  senderName: string;
  transferMethod: "ACH" | "WIRE" | "BOTH" | null;
  commissionPct: number;
  userEmail: string;
  userName: string | null;
};

const TABS = [
  { key: "ALL", label: "All" },
  { key: "SCHEDULED", label: "Scheduled" },
  { key: "PENDING", label: "Pending" },
  { key: "COMPLETED", label: "Completed" },
  { key: "REFUNDED", label: "Refunded" },
] as const;

export function AdminTransactionsClient({
  transactions,
  approvedProfiles,
  active,
  counts,
}: {
  transactions: Row[];
  approvedProfiles: ApprovedProfile[];
  active: (typeof TABS)[number]["key"];
  counts: Record<(typeof TABS)[number]["key"], number>;
}) {
  const [editing, setEditing] = useState<{
    tx: Row;
    target: TransactionStatus;
  } | null>(null);
  const [creating, setCreating] = useState(false);
  const [note, setNote] = useState("");
  const [reason, setReason] = useState("");
  const [txHash, setTxHash] = useState("");
  const [pending, startTransition] = useTransition();

  const submit = () => {
    if (!editing) return;
    const trimmedHash = txHash.trim();
    if (editing.target === "COMPLETED" && trimmedHash) {
      if (!/^0x[a-fA-F0-9]{64}$/.test(trimmedHash)) {
        toast.error("Tx hash must be 0x followed by 64 hex characters");
        return;
      }
    }
    startTransition(async () => {
      const res = await setTransactionStatus({
        id: editing.tx.id,
        status: editing.target,
        adminNote: note.trim() || undefined,
        refundReason:
          editing.target === "REFUNDED" ? reason.trim() || undefined : undefined,
        txHash:
          editing.target === "COMPLETED" && trimmedHash ? trimmedHash : undefined,
      });
      if (res.ok) {
        toast.success("Status updated. Customer notified.");
        setEditing(null);
        setNote("");
        setReason("");
        setTxHash("");
      } else {
        toast.error(res.error);
      }
    });
  };

  return (
    <>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-1 rounded-lg border bg-card p-1 text-sm">
          {TABS.map((t) => (
            <Link
              key={t.key}
              href={
                t.key === "ALL"
                  ? "/admin/transactions"
                  : `/admin/transactions?status=${t.key}`
              }
              className={`rounded-md px-4 py-2 text-center font-medium transition-colors ${
                active === t.key
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:bg-accent"
              }`}
            >
              {t.label}{" "}
              <span className="ml-1 text-xs opacity-70">({counts[t.key]})</span>
            </Link>
          ))}
        </div>
        <Dialog open={creating} onOpenChange={setCreating}>
          <DialogTrigger asChild>
            <Button disabled={approvedProfiles.length === 0}>
              <Plus /> New payment
            </Button>
          </DialogTrigger>
          {creating && (
            <NewPaymentDialog
              profiles={approvedProfiles}
              onDone={() => setCreating(false)}
            />
          )}
        </Dialog>
      </div>

      {approvedProfiles.length === 0 && (
        <p className="rounded-lg border border-dashed bg-muted/30 p-3 text-xs text-muted-foreground">
          No approved profiles yet — approve a customer profile first to log
          payments against it.
        </p>
      )}

      <Card>
        <CardContent className="p-0">
          {transactions.length === 0 ? (
            <div className="px-6 py-12 text-center text-sm text-muted-foreground">
              No transactions in this state.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Profile</TableHead>
                  <TableHead>Reference</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-12" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.map((t) => (
                  <TableRow key={t.id}>
                    <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                      {formatDateTime(t.createdAt)}
                    </TableCell>
                    <TableCell>
                      <div className="text-sm font-medium">{t.userEmail}</div>
                      {t.userName && (
                        <div className="text-xs text-muted-foreground">
                          {t.userName}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-sm">{t.profileName}</TableCell>
                    <TableCell>
                      <span className="font-mono text-xs">
                        {truncateMiddle(t.reference, 6, 4)}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="rounded-md bg-muted px-2 py-1 font-mono text-xs">
                        {t.type}
                      </span>
                    </TableCell>
                    <TableCell className="text-right font-semibold">
                      {formatUSD(t.amountCents)}
                    </TableCell>
                    <TableCell>
                      <TransactionStatusBadge status={t.status} />
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Set status</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          {(["PENDING", "COMPLETED", "REFUNDED"] as const)
                            .filter((s) => s !== t.status)
                            .map((s) => (
                              <DropdownMenuItem
                                key={s}
                                onClick={() => setEditing({ tx: t, target: s })}
                              >
                                {s === "COMPLETED" && (
                                  <Check className="h-4 w-4 text-success" />
                                )}
                                {s === "PENDING" && (
                                  <Clock className="h-4 w-4 text-warning" />
                                )}
                                {s === "REFUNDED" && (
                                  <Undo2 className="h-4 w-4 text-destructive" />
                                )}
                                Mark as {s.toLowerCase()}
                              </DropdownMenuItem>
                            ))}
                        </DropdownMenuContent>
                        {/* Note: a SCHEDULED transaction can be advanced to PENDING/COMPLETED/REFUNDED via the menu above. */}
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Update status dialog */}
      <Dialog open={editing !== null} onOpenChange={(v) => !v && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Mark as {editing?.target.toLowerCase()}</DialogTitle>
            <DialogDescription>
              {editing && (
                <>
                  {formatUSD(editing.tx.amountCents)} from {editing.tx.senderName} ·{" "}
                  {editing.tx.userEmail}
                </>
              )}
              <br />
              The customer will be emailed about this change.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            {editing?.target === "COMPLETED" && (
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Settlement tx hash (Base) &mdash; optional but recommended
                </label>
                <Input
                  className="font-mono text-xs"
                  value={txHash}
                  onChange={(e) => setTxHash(e.target.value)}
                  placeholder="0x..."
                />
                <p className="text-xs text-muted-foreground">
                  Shown to the customer with a link to BaseScan.
                </p>
              </div>
            )}
            {editing?.target === "REFUNDED" && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Refund reason</label>
                <Textarea
                  rows={2}
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Visible to the customer in the email."
                />
              </div>
            )}
            <div className="space-y-2">
              <label className="text-sm font-medium">Internal note (optional)</label>
              <Textarea
                rows={2}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="Notes for the admin team."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditing(null)}>
              Cancel
            </Button>
            <Button
              variant={
                editing?.target === "COMPLETED"
                  ? "success"
                  : editing?.target === "REFUNDED"
                    ? "destructive"
                    : "default"
              }
              onClick={submit}
              disabled={pending}
            >
              {pending && <Loader2 className="animate-spin" />}
              Confirm
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

type NewPaymentInput = {
  profileId: string;
  amount: string;
  type: "ACH" | "WIRE";
  senderName: string;
  description?: string;
  adminNote?: string;
  scheduledFor?: string;
};

function NewPaymentDialog({
  profiles,
  onDone,
}: {
  profiles: ApprovedProfile[];
  onDone: () => void;
}) {
  const [pending, startTransition] = useTransition();
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<NewPaymentInput>({
    defaultValues: {
      profileId: profiles[0]?.id ?? "",
      amount: "",
      type: "ACH",
      senderName: "",
    },
  });
  const profileId = watch("profileId");
  const type = watch("type");
  const amountWatch = watch("amount");

  const selected = useMemo(
    () => profiles.find((p) => p.id === profileId) ?? null,
    [profileId, profiles],
  );

  // Limit ACH/Wire options to what the profile's bank account supports.
  const allowedTypes = useMemo<("ACH" | "WIRE")[]>(() => {
    if (!selected) return ["ACH", "WIRE"];
    if (selected.transferMethod === "ACH") return ["ACH"];
    if (selected.transferMethod === "WIRE") return ["WIRE"];
    return ["ACH", "WIRE"];
  }, [selected]);

  // Commission is the selected profile's rate — preview the fee/net.
  const preview = useMemo(() => {
    const amt = Number(amountWatch);
    const pct = selected?.commissionPct ?? 0;
    if (!Number.isFinite(amt) || amt <= 0) return null;
    const fee = (amt * pct) / 100;
    return { pct, fee, net: amt - fee };
  }, [amountWatch, selected]);

  const onSubmit = handleSubmit((data) => {
    const amountNum = Number(data.amount);
    if (!Number.isFinite(amountNum) || amountNum <= 0) {
      toast.error("Enter a valid amount");
      return;
    }
    const amountCents = Math.round(amountNum * 100);
    if (amountCents < 1) {
      toast.error("Amount too small");
      return;
    }
    if (!data.profileId) {
      toast.error("Pick a customer profile");
      return;
    }

    let scheduledFor: Date | undefined;
    if (data.scheduledFor) {
      const parsed = new Date(data.scheduledFor);
      if (Number.isNaN(parsed.getTime())) {
        toast.error("Invalid scheduled date");
        return;
      }
      if (parsed.getTime() <= Date.now()) {
        toast.error("Scheduled date must be in the future");
        return;
      }
      scheduledFor = parsed;
    }

    const willBeScheduled = !!scheduledFor;

    startTransition(async () => {
      const res = await adminCreateTransaction({
        profileId: data.profileId,
        amountCents,
        type: data.type,
        senderName: data.senderName.trim(),
        description: data.description?.trim() || undefined,
        adminNote: data.adminNote?.trim() || undefined,
        scheduledFor,
      });
      if (res.ok) {
        toast.success(
          willBeScheduled
            ? "Payment scheduled. Customer notified."
            : "Pending payment created. Customer notified.",
        );
        reset();
        onDone();
      } else {
        toast.error(res.error);
      }
    });
  });

  return (
    <DialogContent className="flex max-h-[85vh] max-w-lg flex-col gap-0 p-0">
      <DialogHeader className="border-b px-6 py-4">
        <DialogTitle>Log a new pending payment</DialogTitle>
        <DialogDescription>
          The selected customer will see this transaction in their dashboard with
          a Pending status and receive a notification email.
        </DialogDescription>
      </DialogHeader>

      <form
        onSubmit={onSubmit}
        className="flex flex-1 flex-col gap-4 overflow-y-auto px-6 py-5"
      >
        <div className="space-y-2">
          <Label htmlFor="profileId">Customer &middot; profile</Label>
          <Select
            value={profileId}
            onValueChange={(v) => setValue("profileId", v, { shouldValidate: true })}
          >
            <SelectTrigger>
              <SelectValue placeholder="Pick a customer profile" />
            </SelectTrigger>
            <SelectContent>
              {profiles.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  <span className="font-medium">
                    {p.firstName} {p.lastName}
                  </span>{" "}
                  <span className="text-muted-foreground">— {p.userEmail}</span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          {selected && (
            <p className="text-xs text-muted-foreground">
              Sender: <strong>{selected.senderName}</strong> &middot; accepts{" "}
              <strong>
                {selected.transferMethod === "BOTH"
                  ? "ACH + Wire"
                  : (selected.transferMethod ?? "—")}
              </strong>{" "}
              &middot; commission{" "}
              <strong>{selected.commissionPct}%</strong>
            </p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label htmlFor="amount">Amount (USD)</Label>
            <Input
              id="amount"
              type="number"
              inputMode="decimal"
              step="0.01"
              min="0.01"
              placeholder="0.00"
              {...register("amount", { required: true })}
            />
            {errors.amount && (
              <p className="text-xs text-destructive">Required</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="type">Transfer type</Label>
            <Select
              value={type}
              onValueChange={(v) =>
                setValue("type", v as "ACH" | "WIRE", { shouldValidate: true })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {allowedTypes.map((t) => (
                  <SelectItem key={t} value={t}>
                    {t}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {preview && preview.pct > 0 && (
          <div className="rounded-lg border bg-muted/40 px-3 py-2.5 text-xs text-muted-foreground">
            Commission <strong>{preview.pct}%</strong> (from the profile) ·
            fee{" "}
            <strong className="text-foreground">
              ${preview.fee.toFixed(2)}
            </strong>{" "}
            · customer nets{" "}
            <strong className="text-foreground">
              ${preview.net.toFixed(2)}
            </strong>
          </div>
        )}

        <div className="space-y-2">
          <Label htmlFor="senderName">Sender name</Label>
          <Input
            id="senderName"
            placeholder="The name shown to the customer (who's sending the funds)"
            {...register("senderName", { required: true, minLength: 1 })}
          />
          {errors.senderName && (
            <p className="text-xs text-destructive">Sender name is required</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="description">Description (optional)</Label>
          <Input
            id="description"
            placeholder="What is this payment for?"
            {...register("description")}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="scheduledFor">
            Scheduled for (optional)
          </Label>
          <Input
            id="scheduledFor"
            type="datetime-local"
            {...register("scheduledFor")}
          />
          <p className="text-xs text-muted-foreground">
            Leave blank to create immediately as Pending. Pick a future date/time
            to create as Scheduled — the customer is notified now and again when
            it transitions.
          </p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="adminNote">Internal note (optional)</Label>
          <Textarea
            id="adminNote"
            rows={2}
            placeholder="Notes only visible to the admin team."
            {...register("adminNote")}
          />
        </div>

        <DialogFooter className="-mx-6 mt-2 border-t bg-background px-6 pt-4">
          <Button type="button" variant="outline" onClick={onDone}>
            <X /> Cancel
          </Button>
          <Button type="submit" disabled={pending || profiles.length === 0}>
            {pending && <Loader2 className="animate-spin" />}
            <Clock className="h-4 w-4" /> Create pending payment
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}
