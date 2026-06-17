"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import {
  Check,
  Clock,
  Copy,
  ExternalLink,
  ListChecks,
  Loader2,
  Lock,
  MoreHorizontal,
  Pencil,
  Plus,
  Trash2,
  Undo2,
  Wallet,
  X,
  XCircle,
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
import {
  adminCreateTransaction,
  adminDeleteTransactions,
  adminUpdateScheduledTransaction,
  setTransactionStatus,
} from "../actions";

type Row = Transaction & {
  userEmail: string;
  userName: string | null;
  profileName: string;
  withdrawalAddress: string;
};

export type ApprovedProfile = {
  id: string;
  firstName: string;
  lastName: string;
  senderName: string;
  transferMethod: "ACH" | "WIRE" | "SEPA" | "BOTH" | null;
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
  { key: "CANCELLED", label: "Cancelled" },
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
  const [editingDetails, setEditingDetails] = useState<Row | null>(null);
  const [creating, setCreating] = useState(false);
  const [note, setNote] = useState("");
  const [reason, setReason] = useState("");
  const [txHash, setTxHash] = useState("");
  const [pending, startTransition] = useTransition();
  const [selectionMode, setSelectionMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deletePending, startDeleteTransition] = useTransition();

  const allSelected =
    transactions.length > 0 && transactions.every((t) => selected.has(t.id));

  const toggleRow = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const toggleAll = () =>
    setSelected(
      allSelected ? new Set() : new Set(transactions.map((t) => t.id)),
    );

  const exitSelection = () => {
    setSelectionMode(false);
    setSelected(new Set());
  };

  const deleteSelected = () => {
    startDeleteTransition(async () => {
      const res = await adminDeleteTransactions([...selected]);
      if (res.ok) {
        toast.success(
          `${res.deleted} transaction${res.deleted === 1 ? "" : "s"} deleted.`,
        );
        setConfirmDelete(false);
        exitSelection();
      } else {
        toast.error(res.error);
      }
    });
  };

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
        <div className="flex items-center gap-2">
          {selectionMode ? (
            <>
              <span className="text-sm text-muted-foreground">
                {selected.size} selected
              </span>
              <Button
                variant="destructive"
                size="sm"
                disabled={selected.size === 0}
                onClick={() => setConfirmDelete(true)}
              >
                <Trash2 className="h-4 w-4" /> Delete
              </Button>
              <Button variant="outline" size="sm" onClick={exitSelection}>
                <X className="h-4 w-4" /> Cancel
              </Button>
            </>
          ) : (
            <>
              {transactions.length > 0 && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setSelectionMode(true)}
                >
                  <ListChecks className="h-4 w-4" /> Select
                </Button>
              )}
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
            </>
          )}
        </div>
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
                  {selectionMode && (
                    <TableHead className="w-10">
                      <input
                        type="checkbox"
                        checked={allSelected}
                        onChange={toggleAll}
                        aria-label="Select all transactions"
                        className="h-4 w-4 cursor-pointer accent-primary"
                      />
                    </TableHead>
                  )}
                  <TableHead>Date</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Profile</TableHead>
                  <TableHead>Reference</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead>Risk</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-12" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {transactions.map((t) => (
                  <TableRow key={t.id}>
                    {selectionMode && (
                      <TableCell className="w-10">
                        <input
                          type="checkbox"
                          checked={selected.has(t.id)}
                          onChange={() => toggleRow(t.id)}
                          aria-label="Select transaction"
                          className="h-4 w-4 cursor-pointer accent-primary"
                        />
                      </TableCell>
                    )}
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
                    <TableCell className="text-right">
                      <div className="font-semibold">
                        {formatUSD(t.amountCents)}
                      </div>
                      {t.commissionPct > 0 && (
                        <div className="text-xs font-normal text-muted-foreground">
                          {t.commissionPct}% fee · net{" "}
                          {formatUSD(
                            t.amountCents -
                              Math.round(
                                (t.amountCents * t.commissionPct) / 100,
                              ),
                          )}
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <RiskBadge
                        score={t.riskScore}
                        reasons={t.riskReasons}
                      />
                    </TableCell>
                    <TableCell>
                      <TransactionStatusBadge status={t.status} />
                    </TableCell>
                    <TableCell>
                      {t.status === "COMPLETED" ? (
                        // A completed payment is final — no status changes.
                        <span
                          className="inline-flex items-center gap-1 text-xs text-muted-foreground"
                          title="Completed payments are final"
                        >
                          <Lock className="h-3 w-3" /> Final
                        </span>
                      ) : (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            {t.status === "SCHEDULED" && (
                              <>
                                <DropdownMenuLabel>
                                  Scheduled transfer
                                </DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                  onClick={() => setEditingDetails(t)}
                                >
                                  <Pencil className="h-4 w-4" /> Edit sender
                                  / time
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                              </>
                            )}
                            <DropdownMenuLabel>Set status</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            {(
                              [
                                "PENDING",
                                "COMPLETED",
                                "REFUNDED",
                                "CANCELLED",
                              ] as const
                            )
                              .filter((s) => s !== t.status)
                              .map((s) => (
                                <DropdownMenuItem
                                  key={s}
                                  onClick={() =>
                                    setEditing({ tx: t, target: s })
                                  }
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
                                  {s === "CANCELLED" && (
                                    <XCircle className="h-4 w-4 text-muted-foreground" />
                                  )}
                                  Mark as {s.toLowerCase()}
                                </DropdownMenuItem>
                              ))}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
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
              <>
                <div className="rounded-lg border bg-muted/40 p-3 text-xs">
                  <div className="mb-1.5 flex items-center gap-1.5 font-medium text-foreground">
                    <Wallet className="h-3.5 w-3.5" />
                    Customer USDC destination (Base)
                  </div>
                  <div className="flex items-center gap-2">
                    <code className="flex-1 break-all rounded bg-background px-2 py-1 font-mono text-[11px]">
                      {editing.tx.withdrawalAddress}
                    </code>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        navigator.clipboard
                          .writeText(editing.tx.withdrawalAddress)
                          .then(() => toast.success("Address copied"));
                      }}
                      title="Copy address"
                      aria-label="Copy address"
                    >
                      <Copy className="h-3.5 w-3.5" />
                    </Button>
                    <a
                      href={`https://basescan.org/address/${editing.tx.withdrawalAddress}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground hover:bg-accent hover:text-foreground"
                      title="Open address on BaseScan"
                      aria-label="Open address on BaseScan"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  </div>
                  <p className="mt-1.5 text-muted-foreground">
                    Verify the recipient before signing the transfer.
                  </p>
                </div>
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
                  {/^0x[a-fA-F0-9]{64}$/.test(txHash.trim()) && (
                    <a
                      href={`https://basescan.org/tx/${txHash.trim()}`}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
                    >
                      <ExternalLink className="h-3 w-3" /> Open this hash on
                      BaseScan
                    </a>
                  )}
                  <p className="text-xs text-muted-foreground">
                    Shown to the customer with a link to BaseScan.
                  </p>
                </div>
              </>
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

      <Dialog
        open={editingDetails !== null}
        onOpenChange={(v) => !v && setEditingDetails(null)}
      >
        {editingDetails && (
          <EditScheduledDialog
            tx={editingDetails}
            onDone={() => setEditingDetails(null)}
          />
        )}
      </Dialog>

      <Dialog
        open={confirmDelete}
        onOpenChange={(v) => !v && setConfirmDelete(false)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Delete {selected.size} transaction
              {selected.size === 1 ? "" : "s"}?
            </DialogTitle>
            <DialogDescription>
              This permanently removes{" "}
              {selected.size === 1 ? "this transaction" : "these transactions"}{" "}
              from the admin panel and the customers&apos; transaction history.
              This can&apos;t be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDelete(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={deleteSelected}
              disabled={deletePending}
            >
              {deletePending && <Loader2 className="animate-spin" />}
              <Trash2 className="h-4 w-4" /> Delete permanently
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

/**
 * Compact AI risk indicator shown on each row. Hover for the bullet reasons
 * the model gave. Renders a quiet dash when no score has been generated yet
 * (background scoring still running, or OpenAI not configured).
 */
function RiskBadge({
  score,
  reasons,
}: {
  score: number | null;
  reasons: string[];
}) {
  if (score == null) {
    return (
      <span
        className="text-xs text-muted-foreground"
        title="No AI score yet"
      >
        —
      </span>
    );
  }
  const tone =
    score >= 75
      ? "bg-destructive/15 text-destructive ring-destructive/30"
      : score >= 45
        ? "bg-amber-100 text-amber-800 ring-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:ring-amber-900"
        : score >= 20
          ? "bg-blue-100 text-blue-700 ring-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:ring-blue-900"
          : "bg-emerald-100 text-emerald-700 ring-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:ring-emerald-900";
  const tooltip = reasons.length > 0 ? reasons.join("\n• ") : "AI risk score";
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-semibold ring-1 ring-inset ${tone}`}
      title={reasons.length > 0 ? `• ${tooltip}` : tooltip}
    >
      {score}
    </span>
  );
}

/**
 * Inline editor for a scheduled transaction. Only sender name and scheduled
 * time are editable — amount, type, profile and commission are snapshotted
 * at creation and never change. Sender name is required; the Save button
 * stays disabled while it's empty so the customer-facing record can never
 * end up without a sender.
 */
function EditScheduledDialog({
  tx,
  onDone,
}: {
  tx: Row;
  onDone: () => void;
}) {
  const [senderName, setSenderName] = useState(tx.senderName);
  const [scheduledFor, setScheduledFor] = useState(() =>
    tx.scheduledFor
      ? new Date(tx.scheduledFor).toISOString().slice(0, 16)
      : "",
  );
  const [pending, startTransition] = useTransition();

  const trimmed = senderName.trim();
  const isEmpty = trimmed.length === 0;
  const dateChanged =
    scheduledFor !==
    (tx.scheduledFor
      ? new Date(tx.scheduledFor).toISOString().slice(0, 16)
      : "");
  const nameChanged = trimmed !== tx.senderName;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isEmpty || pending) return;
    if (!nameChanged && !dateChanged) {
      toast.error("Nothing to update");
      return;
    }

    let parsedDate: Date | undefined;
    if (scheduledFor) {
      const d = new Date(scheduledFor);
      if (Number.isNaN(d.getTime())) {
        toast.error("Invalid scheduled date");
        return;
      }
      if (d.getTime() <= Date.now()) {
        toast.error("Scheduled date must be in the future");
        return;
      }
      parsedDate = d;
    }

    startTransition(async () => {
      const res = await adminUpdateScheduledTransaction({
        id: tx.id,
        senderName: trimmed,
        scheduledFor: parsedDate,
      });
      if (res.ok) {
        toast.success("Scheduled transfer updated.");
        onDone();
      } else {
        toast.error(res.error);
      }
    });
  };

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Edit scheduled transfer</DialogTitle>
        <DialogDescription>
          {formatUSD(tx.amountCents)} · {tx.profileName} ·{" "}
          {tx.userEmail}
        </DialogDescription>
      </DialogHeader>
      <form onSubmit={submit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="edit-sender">Sender name</Label>
          <Input
            id="edit-sender"
            value={senderName}
            onChange={(e) => setSenderName(e.target.value)}
            placeholder="Name the customer will see"
            autoComplete="off"
            required
          />
          {isEmpty && (
            <p className="text-xs text-destructive">
              Sender name is required and cannot be empty.
            </p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="edit-scheduled">Scheduled for</Label>
          <Input
            id="edit-scheduled"
            type="datetime-local"
            value={scheduledFor}
            onChange={(e) => setScheduledFor(e.target.value)}
          />
          <p className="text-xs text-muted-foreground">
            Must be in the future. Leave unchanged to keep the existing time.
          </p>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onDone}>
            Cancel
          </Button>
          <Button
            type="submit"
            disabled={pending || isEmpty || (!nameChanged && !dateChanged)}
          >
            {pending && <Loader2 className="animate-spin" />}
            Save changes
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}

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
      // Seeded from the initial profile's sender — the admin can still edit.
      senderName: profiles[0]?.senderName ?? "",
    },
  });
  const profileId = watch("profileId");
  const type = watch("type");
  const amountWatch = watch("amount");
  const senderWatch = watch("senderName");

  const selected = useMemo(
    () => profiles.find((p) => p.id === profileId) ?? null,
    [profileId, profiles],
  );

  // When the admin picks a different profile, replace the sender input with
  // that profile's sender — unless the admin already typed a non-matching
  // custom value, in which case we preserve their edit.
  const lastSyncedProfileId = useRef(profileId);
  useEffect(() => {
    if (!selected) return;
    if (lastSyncedProfileId.current === profileId) return;
    const previous = profiles.find((p) => p.id === lastSyncedProfileId.current);
    const adminCustomised =
      senderWatch && previous && senderWatch !== previous.senderName;
    if (!adminCustomised) {
      setValue("senderName", selected.senderName, { shouldValidate: true });
    }
    lastSyncedProfileId.current = profileId;
  }, [profileId, selected, senderWatch, profiles, setValue]);

  // Limit ACH/Wire options to what the profile's bank account supports.
  // SEPA-only and SWIFT+SEPA profiles (EUR) are recorded against WIRE for
  // now since the underlying transaction type only knows ACH/WIRE.
  const allowedTypes = useMemo<("ACH" | "WIRE")[]>(() => {
    if (!selected) return ["ACH", "WIRE"];
    if (selected.transferMethod === "ACH") return ["ACH"];
    if (selected.transferMethod === "WIRE") return ["WIRE"];
    if (selected.transferMethod === "SEPA") return ["WIRE"];
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

    // Sender defaults from the customer's profile but the admin can edit it
    // before submitting (e.g. when one profile receives from multiple senders).
    const senderName = data.senderName.trim();
    if (senderName.length === 0) {
      toast.error("Sender name is required");
      return;
    }

    startTransition(async () => {
      const res = await adminCreateTransaction({
        profileId: data.profileId,
        amountCents,
        type: data.type,
        senderName,
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
            placeholder="Pre-filled from the customer's profile"
            {...register("senderName", {
              required: "Sender name is required",
              validate: (v) =>
                v.trim().length > 0 || "Sender name cannot be empty",
            })}
          />
          <p className="text-xs text-muted-foreground">
            Default comes from the customer&apos;s profile — edit if this
            specific payment needs a different sender name.
          </p>
          {errors.senderName && (
            <p className="text-xs text-destructive">
              {errors.senderName.message ?? "Sender name is required"}
            </p>
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
