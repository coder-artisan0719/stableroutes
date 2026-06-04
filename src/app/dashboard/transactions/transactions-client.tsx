"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import {
  ArrowUpRight,
  Coins,
  Copy,
  ExternalLink,
  Eye,
  Landmark,
  Loader2,
  Receipt,
  Sparkles,
  X,
} from "lucide-react";
import type { CustomerProfile, Transaction } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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
import { Pagination } from "@/components/ui/pagination";
import { PageSizeSelector } from "@/components/ui/page-size";
import { DEFAULT_PAGE_SIZE, type PageSize } from "@/lib/page-size";
import { useRouter } from "next/navigation";
import { TransactionStatusBadge } from "@/components/status-badge";
import { CircleUsdcLogo } from "@/components/partner-logos";
import { formatDateTime, formatUSD, truncateMiddle } from "@/lib/utils";

type Row = Transaction & { profile: CustomerProfile };

type TxQuery = { from?: string; to?: string };

function buildHref(query: TxQuery, page: number, pageSize: PageSize) {
  const params = new URLSearchParams();
  if (query.from) params.set("from", query.from);
  if (query.to) params.set("to", query.to);
  if (page > 1) params.set("page", String(page));
  if (pageSize !== DEFAULT_PAGE_SIZE) params.set("pageSize", String(pageSize));
  const qs = params.toString();
  return qs ? `/dashboard/transactions?${qs}` : "/dashboard/transactions";
}

function TransactionsToolbar({
  query,
  onChange,
}: {
  query: TxQuery;
  onChange: (next: TxQuery) => void;
}) {
  const hasFilter = Boolean(query.from || query.to);
  return (
    <Card>
      <CardContent className="flex flex-wrap items-end gap-3 py-4">
        <div className="space-y-1.5">
          <label
            htmlFor="tx-from"
            className="block text-xs font-medium text-muted-foreground"
          >
            From
          </label>
          <Input
            id="tx-from"
            type="date"
            value={query.from ?? ""}
            max={query.to || undefined}
            onChange={(e) =>
              onChange({ from: e.target.value || undefined, to: query.to })
            }
            className="h-9 w-[160px]"
          />
        </div>
        <div className="space-y-1.5">
          <label
            htmlFor="tx-to"
            className="block text-xs font-medium text-muted-foreground"
          >
            To
          </label>
          <Input
            id="tx-to"
            type="date"
            value={query.to ?? ""}
            min={query.from || undefined}
            onChange={(e) =>
              onChange({ from: query.from, to: e.target.value || undefined })
            }
            className="h-9 w-[160px]"
          />
        </div>
        {hasFilter && (
          <Button variant="ghost" size="sm" onClick={() => onChange({})}>
            <X className="h-3.5 w-3.5" /> Clear
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

export function CustomerTransactionsClient({
  transactions,
  total,
  page,
  totalPages,
  pageSize,
  query,
}: {
  transactions: Row[];
  total: number;
  page: number;
  totalPages: number;
  pageSize: PageSize;
  query: TxQuery;
}) {
  const router = useRouter();
  const [viewing, setViewing] = useState<Row | null>(null);
  const [explaining, setExplaining] = useState<Row | null>(null);

  const startIdx = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const endIdx = Math.min(page * pageSize, total);

  const hrefFor = (p: number) => buildHref(query, p, pageSize);
  // Changing page size resets to page 1.
  const onPageSizeChange = (n: PageSize) =>
    router.replace(buildHref(query, 1, n));
  // Applying a date filter resets to page 1.
  const onFilterChange = (next: TxQuery) =>
    router.replace(buildHref(next, 1, pageSize));

  return (
    <>
      <TransactionsToolbar query={query} onChange={onFilterChange} />

      {total === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
            <div className="grid h-12 w-12 place-items-center rounded-lg bg-primary/10 text-primary">
              <Receipt className="h-5 w-5" />
            </div>
            <h3 className="text-lg font-semibold">
              No transactions in this range
            </h3>
            <p className="max-w-md text-sm text-muted-foreground">
              No transfers fall within the selected dates. Try widening or
              clearing the date filter.
            </p>
          </CardContent>
        </Card>
      ) : (
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
                      <div className="inline-flex items-center gap-0.5">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setExplaining(t)}
                          aria-label="Explain this transaction"
                          title="Explain this transaction"
                        >
                          <Sparkles className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setViewing(t)}
                          aria-label="View details"
                          title="View details"
                        >
                          <Eye className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {total > 0 && (
        <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
          <PageSizeSelector value={pageSize} onChange={onPageSizeChange} />
          <Pagination page={page} totalPages={totalPages} hrefFor={hrefFor} />
          <div className="hidden text-sm text-muted-foreground sm:block">
            {startIdx}–{endIdx} of {total}
          </div>
        </div>
      )}

      <Dialog open={viewing !== null} onOpenChange={(v) => !v && setViewing(null)}>
        {viewing && <TransactionViewDialog tx={viewing} onClose={() => setViewing(null)} />}
      </Dialog>

      <Dialog
        open={explaining !== null}
        onOpenChange={(v) => !v && setExplaining(null)}
      >
        {explaining && (
          <ExplainTransactionDialog
            tx={explaining}
            onClose={() => setExplaining(null)}
          />
        )}
      </Dialog>
    </>
  );
}

/**
 * AI-written plain-English explanation of a transaction's current state.
 * Fetches on mount; renders a templated fallback inline if AI is paused.
 */
function ExplainTransactionDialog({
  tx,
  onClose,
}: {
  tx: Row;
  onClose: () => void;
}) {
  const [text, setText] = useState<string | null>(null);
  const [aiUsed, setAiUsed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/explain-transaction", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ id: tx.id }),
        });
        const json = (await res.json()) as {
          explanation?: string;
          aiUsed?: boolean;
          error?: string;
        };
        if (cancelled) return;
        if (!res.ok) throw new Error(json.error ?? "Couldn't explain");
        setText(json.explanation ?? null);
        setAiUsed(Boolean(json.aiUsed));
      } catch (err) {
        if (!cancelled) {
          setError(
            err instanceof Error ? err.message : "Something went wrong",
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [tx.id]);

  return (
    <DialogContent className="max-w-lg">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          About this transaction
          {aiUsed && (
            <span className="rounded-full bg-primary/10 px-1.5 py-0.5 text-[10px] font-medium uppercase tracking-wide text-primary">
              AI
            </span>
          )}
        </DialogTitle>
        <DialogDescription>
          {formatUSD(tx.amountCents)} from {tx.senderName} ·{" "}
          {formatDateTime(tx.createdAt)}
        </DialogDescription>
      </DialogHeader>
      {loading ? (
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Reading your transaction…
        </p>
      ) : error ? (
        <p className="text-sm text-destructive">{error}</p>
      ) : (
        <p className="whitespace-pre-wrap text-sm leading-relaxed">{text}</p>
      )}
      <DialogFooter>
        <Button variant="outline" onClick={onClose}>
          Close
        </Button>
      </DialogFooter>
    </DialogContent>
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
