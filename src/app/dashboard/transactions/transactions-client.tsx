"use client";

import { useState } from "react";
import { toast } from "sonner";
import {
  ArrowUpRight,
  Coins,
  Copy,
  ExternalLink,
  Eye,
  Landmark,
  Receipt,
} from "lucide-react";
import type { CustomerProfile, Transaction } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TransactionStatusBadge } from "@/components/status-badge";
import { CircleUsdcLogo } from "@/components/partner-logos";
import { formatDateTime, formatUSD, truncateMiddle } from "@/lib/utils";

type Row = Transaction & { profile: CustomerProfile };

export function CustomerTransactionsClient({
  transactions,
}: {
  transactions: Row[];
}) {
  const [viewing, setViewing] = useState<Row | null>(null);

  return (
    <>
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Reference</TableHead>
                <TableHead>Profile</TableHead>
                <TableHead>Sender</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Details</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {transactions.map((t) => (
                <TableRow key={t.id}>
                  <TableCell className="whitespace-nowrap text-sm text-muted-foreground">
                    {formatDateTime(t.createdAt)}
                  </TableCell>
                  <TableCell>
                    <span className="font-mono text-xs">
                      {truncateMiddle(t.reference, 6, 4)}
                    </span>
                  </TableCell>
                  <TableCell className="text-sm">
                    {t.profile.firstName} {t.profile.lastName}
                  </TableCell>
                  <TableCell className="text-sm">{t.senderName}</TableCell>
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
                  <TableCell className="text-right">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setViewing(t)}
                      aria-label="View details"
                      title="View details"
                    >
                      <Eye className="h-3.5 w-3.5" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={viewing !== null} onOpenChange={(v) => !v && setViewing(null)}>
        {viewing && <TransactionViewDialog tx={viewing} onClose={() => setViewing(null)} />}
      </Dialog>
    </>
  );
}

function DetailRow({
  label,
  value,
  mono,
  onCopy,
  href,
}: {
  label: string;
  value: string;
  mono?: boolean;
  onCopy?: () => void;
  href?: string;
}) {
  return (
    <div className="flex items-start justify-between gap-3 py-2.5">
      <dt className="shrink-0 text-xs text-muted-foreground">{label}</dt>
      <dd
        className={`flex min-w-0 items-center justify-end gap-2 text-sm font-medium text-foreground ${
          mono ? "font-mono text-xs" : ""
        }`}
      >
        {href ? (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 truncate text-primary underline-offset-2 hover:underline"
          >
            <span className="truncate text-right">{value}</span>
            <ExternalLink className="h-3 w-3 shrink-0" />
          </a>
        ) : (
          <span className="truncate text-right">{value}</span>
        )}
        {onCopy && (
          <button
            type="button"
            onClick={onCopy}
            aria-label={`Copy ${label}`}
            className="shrink-0 text-muted-foreground transition-colors hover:text-foreground"
          >
            <Copy className="h-3 w-3" />
          </button>
        )}
      </dd>
    </div>
  );
}

function Panel({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="overflow-hidden rounded-xl border bg-card">
      <div className="border-b border-border/70 bg-muted/40 px-4 py-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
        {title}
      </div>
      <div className="px-4">{children}</div>
    </div>
  );
}

function TransactionViewDialog({
  tx,
  onClose,
}: {
  tx: Row;
  onClose: () => void;
}) {
  const copy = (value: string, label: string) => {
    navigator.clipboard.writeText(value);
    toast.success(`${label} copied`);
  };

  const isCompleted = tx.status === "COMPLETED";
  const isRefunded = tx.status === "REFUNDED";
  const isScheduled = tx.status === "SCHEDULED";
  const baseScanUrl = tx.txHash ? `https://basescan.org/tx/${tx.txHash}` : null;

  // Status accent for the amount hero.
  const accent = isCompleted
    ? "text-success"
    : isRefunded
      ? "text-destructive"
      : "text-foreground";

  // Activity timeline — only events that actually occurred.
  type Tone = "neutral" | "primary" | "success" | "destructive";
  const events: { label: string; at: Date; tone: Tone }[] = [
    { label: "Transfer initiated", at: tx.createdAt, tone: "neutral" },
  ];
  if (tx.scheduledFor)
    events.push({
      label: isScheduled ? "Scheduled to process" : "Scheduled",
      at: tx.scheduledFor,
      tone: "primary",
    });
  if (tx.completedAt)
    events.push({
      label: "Settled to USDC on Base",
      at: tx.completedAt,
      tone: "success",
    });
  if (tx.refundedAt)
    events.push({
      label: "Transfer refunded",
      at: tx.refundedAt,
      tone: "destructive",
    });

  const toneDot: Record<Tone, string> = {
    neutral: "bg-muted-foreground",
    primary: "bg-primary",
    success: "bg-success",
    destructive: "bg-destructive",
  };

  return (
    <DialogContent className="flex max-h-[85vh] max-w-md flex-col gap-0 p-0">
      {/* Amount hero — receipt-style header */}
      <DialogHeader className="space-y-0 border-b px-6 pb-5 pt-6 text-left">
        <div className="flex items-center justify-between">
          <span className="text-[11px] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Transaction
          </span>
          <TransactionStatusBadge status={tx.status} />
        </div>
        <DialogTitle
          className={`mt-3 font-display text-3xl font-bold tracking-tight ${accent}`}
        >
          {formatUSD(tx.amountCents)}
        </DialogTitle>
        <DialogDescription className="mt-1">
          From {tx.senderName} &middot; {tx.type} transfer
        </DialogDescription>
      </DialogHeader>

      <div className="flex-1 space-y-4 overflow-y-auto bg-muted/20 px-6 py-5">
        <Panel title="Transfer details">
          <dl className="divide-y divide-border/60">
            <DetailRow
              label="Reference"
              value={tx.reference}
              mono
              onCopy={() => copy(tx.reference, "Reference")}
            />
            <DetailRow label="Method" value={`${tx.type} transfer`} />
            <DetailRow label="Sender" value={tx.senderName} />
            <DetailRow label="Amount" value={formatUSD(tx.amountCents)} />
            {tx.description && (
              <DetailRow label="Note" value={tx.description} />
            )}
          </dl>
        </Panel>

        <Panel title="Settlement destination">
          <dl className="divide-y divide-border/60">
            <DetailRow
              label="Profile"
              value={`${tx.profile.firstName} ${tx.profile.lastName}`}
            />
            <DetailRow
              label="USDC wallet (Base)"
              value={tx.profile.withdrawalAddress}
              mono
              onCopy={() => copy(tx.profile.withdrawalAddress, "Address")}
            />
          </dl>
        </Panel>

        {isCompleted && (
          <Panel title="On-chain settlement">
            <dl className="divide-y divide-border/60">
              {tx.txHash ? (
                <DetailRow
                  label="Transaction hash"
                  value={truncateMiddle(tx.txHash, 10, 8)}
                  mono
                  href={baseScanUrl ?? undefined}
                  onCopy={() => copy(tx.txHash!, "Tx hash")}
                />
              ) : (
                <DetailRow label="Transaction hash" value="Pending publish" />
              )}
              <div className="py-2.5">
                {baseScanUrl ? (
                  <a
                    href={baseScanUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
                  >
                    <Coins className="h-3.5 w-3.5" />
                    Verify on BaseScan
                    <ArrowUpRight className="h-3 w-3" />
                  </a>
                ) : (
                  <span className="inline-flex items-center gap-1.5 text-xs text-muted-foreground">
                    <CircleUsdcLogo className="text-[10px]" /> Settled to USDC
                  </span>
                )}
              </div>
            </dl>
          </Panel>
        )}

        {isScheduled && tx.scheduledFor && (
          <Panel title="Scheduled">
            <dl className="divide-y divide-border/60">
              <DetailRow
                label="Processes on"
                value={formatDateTime(tx.scheduledFor)}
              />
            </dl>
          </Panel>
        )}

        {isRefunded && tx.refundReason && (
          <Panel title="Refund reason">
            <p className="py-3 text-sm text-foreground">{tx.refundReason}</p>
          </Panel>
        )}

        {/* Visual activity timeline */}
        <Panel title="Activity">
          <ol className="py-3">
            {events.map((e, i) => (
              <li key={i} className="relative flex gap-3 pb-5 last:pb-0">
                {i < events.length - 1 && (
                  <span
                    className="absolute left-[4.5px] top-3 h-full w-px bg-border"
                    aria-hidden
                  />
                )}
                <span
                  className={`relative z-10 mt-1 h-2.5 w-2.5 shrink-0 rounded-full ring-4 ring-card ${toneDot[e.tone]}`}
                />
                <div className="-mt-0.5">
                  <p className="text-sm font-medium text-foreground">{e.label}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatDateTime(e.at)}
                  </p>
                </div>
              </li>
            ))}
          </ol>
        </Panel>
      </div>

      <DialogFooter className="border-t px-6 py-4">
        <Button variant="outline" onClick={onClose} className="w-full sm:w-auto">
          Close
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}
