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

  const Detail = ({
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
  }) => (
    <div className="flex items-start justify-between gap-3 py-2">
      <dt className="shrink-0 text-xs uppercase tracking-wide text-muted-foreground">
        {label}
      </dt>
      <dd
        className={`flex min-w-0 items-center justify-end gap-2 text-sm text-foreground ${
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

  const isCompleted = tx.status === "COMPLETED";
  const isRefunded = tx.status === "REFUNDED";
  const isScheduled = tx.status === "SCHEDULED";
  const baseScanUrl = tx.txHash ? `https://basescan.org/tx/${tx.txHash}` : null;

  return (
    <DialogContent className="flex max-h-[85vh] max-w-lg flex-col gap-0 p-0">
      <DialogHeader className="border-b px-6 py-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <DialogTitle className="text-xl">
              {formatUSD(tx.amountCents)}
            </DialogTitle>
            <DialogDescription>
              From {tx.senderName} via {tx.type}
            </DialogDescription>
          </div>
          <TransactionStatusBadge status={tx.status} />
        </div>
      </DialogHeader>

      <div className="flex-1 space-y-5 overflow-y-auto px-6 py-5">
        <section>
          <h3 className="mb-1 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            <Receipt className="h-3.5 w-3.5" /> Transfer
          </h3>
          <dl className="divide-y divide-border/60 rounded-lg border bg-muted/20 px-3">
            <Detail
              label="Reference"
              value={tx.reference}
              mono
              onCopy={() => copy(tx.reference, "Reference")}
            />
            <Detail label="Type" value={tx.type} />
            <Detail label="Sender" value={tx.senderName} />
            <Detail label="Amount" value={formatUSD(tx.amountCents)} />
            {tx.description && <Detail label="Description" value={tx.description} />}
          </dl>
        </section>

        <section>
          <h3 className="mb-1 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            <Landmark className="h-3.5 w-3.5" /> Routed to
          </h3>
          <dl className="divide-y divide-border/60 rounded-lg border bg-muted/20 px-3">
            <Detail
              label="Profile"
              value={`${tx.profile.firstName} ${tx.profile.lastName}`}
            />
            <Detail
              label="Withdrawal (USDC Base)"
              value={tx.profile.withdrawalAddress}
              mono
              onCopy={() => copy(tx.profile.withdrawalAddress, "Address")}
            />
          </dl>
        </section>

        {isCompleted && (
          <section>
            <div className="mb-1 flex items-center justify-between">
              <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <CircleUsdcLogo className="text-[10px]" />
              </h3>
              <Badge variant="success">Settled</Badge>
            </div>
            <dl className="divide-y divide-border/60 rounded-lg border bg-muted/20 px-3">
              {tx.txHash ? (
                <Detail
                  label="Tx hash"
                  value={truncateMiddle(tx.txHash, 10, 8)}
                  mono
                  href={baseScanUrl ?? undefined}
                  onCopy={() => copy(tx.txHash!, "Tx hash")}
                />
              ) : (
                <div className="flex items-start justify-between gap-3 py-2">
                  <dt className="shrink-0 text-xs uppercase tracking-wide text-muted-foreground">
                    Tx hash
                  </dt>
                  <dd className="text-sm text-muted-foreground">Pending publish</dd>
                </div>
              )}
              {tx.completedAt && (
                <Detail label="Completed" value={formatDateTime(tx.completedAt)} />
              )}
            </dl>
            {baseScanUrl && (
              <a
                href={baseScanUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
              >
                <Coins className="h-3.5 w-3.5" />
                View settlement on BaseScan
                <ArrowUpRight className="h-3 w-3" />
              </a>
            )}
          </section>
        )}

        {isScheduled && tx.scheduledFor && (
          <section>
            <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Scheduled
            </h3>
            <dl className="divide-y divide-border/60 rounded-lg border bg-muted/20 px-3">
              <Detail
                label="Will process on"
                value={formatDateTime(tx.scheduledFor)}
              />
            </dl>
            <p className="mt-2 text-xs text-muted-foreground">
              We&apos;ll email you again when this transfer moves from Scheduled
              to Pending, and once more when it settles.
            </p>
          </section>
        )}

        {isRefunded && (
          <section>
            <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Refund
            </h3>
            <dl className="divide-y divide-border/60 rounded-lg border bg-muted/20 px-3">
              {tx.refundedAt && (
                <Detail label="Refunded" value={formatDateTime(tx.refundedAt)} />
              )}
              {tx.refundReason && (
                <Detail label="Reason" value={tx.refundReason} />
              )}
            </dl>
          </section>
        )}

        <section>
          <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Timeline
          </h3>
          <dl className="divide-y divide-border/60 rounded-lg border bg-muted/20 px-3">
            <Detail label="Initiated" value={formatDateTime(tx.createdAt)} />
            {tx.scheduledFor && (
              <Detail
                label="Scheduled for"
                value={formatDateTime(tx.scheduledFor)}
              />
            )}
            {tx.completedAt && (
              <Detail label="Completed" value={formatDateTime(tx.completedAt)} />
            )}
            {tx.refundedAt && (
              <Detail label="Refunded" value={formatDateTime(tx.refundedAt)} />
            )}
            <Detail label="Last updated" value={formatDateTime(tx.updatedAt)} />
          </dl>
        </section>
      </div>

      <DialogFooter className="border-t px-6 py-4">
        <Button variant="outline" onClick={onClose}>
          Close
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}
