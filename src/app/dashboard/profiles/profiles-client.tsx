"use client";

import { useEffect, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import {
  ChevronDown,
  ChevronRight,
  ChevronUp,
  Clock,
  Copy,
  Eye,
  Landmark,
  Loader2,
  Lock,
  Pencil,
  Plus,
  Search,
  Trash2,
} from "lucide-react";
import type {
  CustomerProfile,
  TransactionStatus,
  TransactionType,
} from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Pagination } from "@/components/ui/pagination";
import { PageSizeSelector } from "@/components/ui/page-size";
import { Skeleton } from "@/components/ui/skeleton";
import type { PageSize } from "@/lib/page-size";
import { useRouter } from "next/navigation";
import {
  ProfileStatusBadge,
  TransactionStatusBadge,
} from "@/components/status-badge";
import {
  ACCOUNT_CURRENCIES,
  CurrencyFlag,
  CurrencyFlagLabel,
  currencyMeta,
  type AccountCurrency,
} from "@/components/currency-flag";
import { profileSchema, type ProfileInput } from "@/lib/validators";
import {
  cn,
  formatDate,
  formatDateTime,
  formatUSD,
  truncateMiddle,
} from "@/lib/utils";
import {
  createProfile,
  deleteProfile,
  getProfileTransactions,
  updateWithdrawalAddress,
} from "../actions";
import { ProfilesToolbar, type ProfilesQuery } from "./profiles-toolbar";

type ResolvedQuery = {
  q: string;
  status?: "PENDING" | "APPROVED" | "REJECTED";
  sort: "newest" | "oldest" | "name";
  view: "grid" | "table";
};

export function ProfilesClient({
  profiles,
  total,
  page,
  totalPages,
  pageSize,
  counts,
  query,
}: {
  profiles: CustomerProfile[];
  total: number;
  page: number;
  totalPages: number;
  pageSize: PageSize;
  counts: { all: number; pending: number; approved: number; rejected: number };
  query: ResolvedQuery;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<CustomerProfile | null>(null);
  const [viewing, setViewing] = useState<CustomerProfile | null>(null);

  const isFiltered = Boolean(query.q || query.status);
  const startIdx = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const endIdx = Math.min(page * pageSize, total);

  const hrefFor = (p: number) => buildHref({ ...query, page: p, pageSize });
  const onPageSizeChange = (n: PageSize) => {
    // Changing size resets to page 1.
    router.replace(buildHref({ ...query, page: 1, pageSize: n }));
  };

  return (
    <>
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <p className="text-sm text-muted-foreground">
          {total === 0
            ? isFiltered
              ? "No profiles match your filters."
              : "No profiles yet."
            : `Showing ${startIdx}–${endIdx} of ${total}`}
        </p>
        <Dialog open={open} onOpenChange={(v) => !v && setOpen(false)}>
          <DialogTrigger asChild>
            <Button onClick={() => setOpen(true)}>
              <Plus /> New profile
            </Button>
          </DialogTrigger>
          <ProfileDialog onDone={() => setOpen(false)} />
        </Dialog>
      </div>

      <ProfilesToolbar query={query as ProfilesQuery} counts={counts} />

      {profiles.length === 0 ? (
        <EmptyState filtered={isFiltered} onCreate={() => setOpen(true)} />
      ) : query.view === "table" ? (
        <ProfilesTable
          profiles={profiles}
          onView={setViewing}
          onEdit={setEditing}
        />
      ) : (
        <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {profiles.map((p) => (
            <ProfileCard
              key={p.id}
              profile={p}
              onView={() => setViewing(p)}
              onEdit={() => setEditing(p)}
            />
          ))}
        </div>
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
        {viewing && (
          <ProfileViewDialog
            profile={viewing}
            onClose={() => setViewing(null)}
            onEdit={() => {
              setEditing(viewing);
              setViewing(null);
            }}
          />
        )}
      </Dialog>

      <Dialog open={editing !== null} onOpenChange={(v) => !v && setEditing(null)}>
        {editing && (
          <EditAddressDialog
            profile={editing}
            onDone={() => setEditing(null)}
          />
        )}
      </Dialog>
    </>
  );
}

function buildHref(q: ResolvedQuery & { page: number; pageSize?: PageSize }) {
  const params = new URLSearchParams();
  if (q.q) params.set("q", q.q);
  if (q.status) params.set("status", q.status);
  if (q.sort && q.sort !== "newest") params.set("sort", q.sort);
  if (q.view && q.view !== "table") params.set("view", q.view);
  if (q.page > 1) params.set("page", String(q.page));
  if (q.pageSize && q.pageSize !== 10) params.set("pageSize", String(q.pageSize));
  const qs = params.toString();
  return qs ? `/dashboard/profiles?${qs}` : "/dashboard/profiles";
}

function EmptyState({
  filtered,
  onCreate,
}: {
  filtered: boolean;
  onCreate: () => void;
}) {
  return (
    <Card>
      <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
        <div className="grid h-12 w-12 place-items-center rounded-lg bg-primary/10 text-primary">
          {filtered ? <Search className="h-5 w-5" /> : <Plus className="h-5 w-5" />}
        </div>
        <h3 className="text-lg font-semibold">
          {filtered ? "No matching profiles" : "No profiles yet"}
        </h3>
        <p className="max-w-md text-sm text-muted-foreground">
          {filtered
            ? "Try removing filters or adjusting your search."
            : "Create your first profile to define how incoming USD payments will be labeled and where settled USDC should land."}
        </p>
        {!filtered && (
          <Button onClick={onCreate}>
            <Plus /> Create profile
          </Button>
        )}
      </CardContent>
    </Card>
  );
}

function ProfileCard({
  profile,
  onView,
  onEdit,
}: {
  profile: CustomerProfile;
  onView: () => void;
  onEdit: () => void;
}) {
  const [pending, startTransition] = useTransition();

  const copy = (value: string, label = "Copied") => {
    navigator.clipboard.writeText(value);
    toast.success(label);
  };
  const onDelete = () => {
    if (!confirm("Delete this profile? This cannot be undone.")) return;
    startTransition(async () => {
      const res = await deleteProfile(profile.id);
      if (res.ok) toast.success("Profile deleted");
      else toast.error(res.error);
    });
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <CardTitle className="truncate">
              {profile.firstName} {profile.lastName}
            </CardTitle>
            <CardDescription className="flex items-center gap-1.5 truncate">
              <CurrencyFlag code={profile.accountCurrency} size="sm" />
              {profile.accountCurrency} · Sender: {profile.senderName}
            </CardDescription>
          </div>
          <ProfileStatusBadge
            status={profile.status}
            pendingKind={profile.accountNumber ? "update" : "new"}
          />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {profile.status === "APPROVED" && profile.accountNumber ? (
          <div className="rounded-lg border bg-muted/30 p-3">
            <div className="mb-2 flex items-center justify-between">
              <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                <CurrencyFlag code={profile.accountCurrency} size="sm" /> Your{" "}
                {profile.accountCurrency} account
              </p>
              {profile.transferMethod && (
                <Badge variant="outline" className="font-mono text-[10px]">
                  {profile.transferMethod === "BOTH"
                    ? "ACH + Wire"
                    : profile.transferMethod}
                </Badge>
              )}
            </div>
            <dl className="space-y-1.5 text-xs">
              <BankRow label="Bank" value={profile.bankName ?? "—"} />
              <BankRow
                label="Account"
                value={profile.accountNumber}
                copyable
                onCopy={() => copy(profile.accountNumber!, "Account copied")}
              />
              <BankRow
                label="Routing"
                value={profile.routingNumber ?? "—"}
                copyable={!!profile.routingNumber}
                onCopy={() =>
                  profile.routingNumber &&
                  copy(profile.routingNumber, "Routing copied")
                }
              />
            </dl>
          </div>
        ) : null}

        <div>
          <p className="text-xs uppercase tracking-wide text-muted-foreground">
            USDC (Base) withdrawal
          </p>
          <div className="mt-1 flex items-center justify-between gap-2 rounded-lg border bg-muted/40 px-3 py-2">
            <span className="truncate font-mono text-xs">
              {truncateMiddle(profile.withdrawalAddress, 10, 8)}
            </span>
            <button
              type="button"
              onClick={() => copy(profile.withdrawalAddress, "Address copied")}
              className="text-muted-foreground transition-colors hover:text-foreground"
              aria-label="Copy address"
            >
              <Copy className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Created {formatDate(profile.createdAt)}</span>
          {profile.approvedAt && <span>Approved {formatDate(profile.approvedAt)}</span>}
        </div>
        <div className="flex gap-2 pt-2">
          <Button variant="outline" size="sm" className="flex-1" onClick={onView}>
            <Eye className="h-3.5 w-3.5" /> View
          </Button>
          <Button variant="outline" size="sm" className="flex-1" onClick={onEdit}>
            <Pencil className="h-3.5 w-3.5" /> Edit
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={onDelete}
            disabled={pending}
            className="text-destructive hover:bg-destructive/10 hover:text-destructive"
            aria-label="Delete"
          >
            {pending ? (
              <Loader2 className="animate-spin" />
            ) : (
              <Trash2 className="h-3.5 w-3.5" />
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

function BankRow({
  label,
  value,
  copyable,
  onCopy,
}: {
  label: string;
  value: string;
  copyable?: boolean;
  onCopy?: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <dt className="text-muted-foreground">{label}</dt>
      <dd className="flex items-center gap-1.5 font-mono text-foreground">
        <span className="truncate">{value}</span>
        {copyable && onCopy && (
          <button
            type="button"
            onClick={onCopy}
            aria-label={`Copy ${label}`}
            className="text-muted-foreground transition-colors hover:text-foreground"
          >
            <Copy className="h-3 w-3" />
          </button>
        )}
      </dd>
    </div>
  );
}

// Muted palette for the per-profile circular icon (Found-style).
const POCKET_COLORS = [
  "bg-emerald-600",
  "bg-teal-600",
  "bg-amber-600",
  "bg-sky-700",
  "bg-violet-600",
  "bg-rose-600",
  "bg-slate-600",
];

function pocketColor(id: string) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return POCKET_COLORS[h % POCKET_COLORS.length];
}

function initialsOf(p: CustomerProfile) {
  return (
    (p.firstName[0] ?? "") + (p.lastName[0] ?? "")
  ).toUpperCase();
}

/** Found-style "Pockets" list — clickable rows with circular icons,
 *  masked account numbers, routing numbers, and status. */
function ProfilesTable({
  profiles,
  onView,
  onEdit,
}: {
  profiles: CustomerProfile[];
  onView: (p: CustomerProfile) => void;
  onEdit: (p: CustomerProfile) => void;
}) {
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [revealed, setRevealed] = useState<Set<string>>(new Set());
  const [, startTransition] = useTransition();

  const toggleReveal = (id: string) =>
    setRevealed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const copy = (value: string, label = "Copied") => {
    navigator.clipboard.writeText(value);
    toast.success(label);
  };

  const remove = (id: string) => {
    if (!confirm("Delete this profile? This cannot be undone.")) return;
    setPendingId(id);
    startTransition(async () => {
      const res = await deleteProfile(id);
      if (res.ok) toast.success("Profile deleted");
      else toast.error(res.error);
      setPendingId(null);
    });
  };

  return (
    <Card className="overflow-hidden">
      {/* Column header */}
      <div className="hidden grid-cols-[1.6fr_1fr_1fr_auto] gap-4 border-b border-border bg-muted/40 px-5 py-3 text-xs font-medium uppercase tracking-wide text-muted-foreground md:grid">
        <span>Name</span>
        <span>Account number</span>
        <span>Routing number</span>
        <span className="w-32 text-right">Status</span>
      </div>

      <ul className="divide-y divide-border">
        {profiles.map((p) => {
          const isRevealed = revealed.has(p.id);
          const approved = p.status === "APPROVED" && p.accountNumber;
          return (
            <li key={p.id}>
              <div
                role="button"
                tabIndex={0}
                onClick={() => onView(p)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") onView(p);
                }}
                className="group grid cursor-pointer grid-cols-1 gap-3 px-5 py-4 transition-colors hover:bg-accent/40 md:grid-cols-[1.6fr_1fr_1fr_auto] md:items-center md:gap-4"
              >
                {/* Name + icon */}
                <div className="flex items-center gap-3">
                  <span
                    className={cn(
                      "grid h-11 w-11 shrink-0 place-items-center rounded-full text-sm font-semibold text-white",
                      pocketColor(p.id),
                    )}
                  >
                    {initialsOf(p)}
                  </span>
                  <div className="min-w-0">
                    <p className="flex items-center gap-1.5 truncate font-medium">
                      <CurrencyFlag code={p.accountCurrency} size="sm" />
                      {p.firstName} {p.lastName}
                    </p>
                    <p className="truncate text-xs text-muted-foreground">
                      {p.accountCurrency} account · Sender: {p.senderName}
                    </p>
                  </div>
                </div>

                {/* Account number */}
                <div className="min-w-0">
                  <p className="mb-0.5 text-[10px] uppercase tracking-wide text-muted-foreground md:hidden">
                    Account number
                  </p>
                  {approved ? (
                    <div className="flex items-center gap-1.5">
                      <span className="font-mono text-sm">
                        {isRevealed
                          ? p.accountNumber
                          : `•••• •••• ${p.accountNumber!.slice(-4)}`}
                      </span>
                      <button
                        type="button"
                        aria-label={isRevealed ? "Hide" : "Reveal"}
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleReveal(p.id);
                        }}
                        className="text-muted-foreground transition-colors hover:text-foreground"
                      >
                        {isRevealed ? (
                          <ChevronUp className="h-3.5 w-3.5" />
                        ) : (
                          <ChevronDown className="h-3.5 w-3.5" />
                        )}
                      </button>
                      <button
                        type="button"
                        aria-label="Copy account number"
                        onClick={(e) => {
                          e.stopPropagation();
                          copy(p.accountNumber!, "Account copied");
                        }}
                        className="text-muted-foreground transition-colors hover:text-foreground"
                      >
                        <Copy className="h-3 w-3" />
                      </button>
                    </div>
                  ) : (
                    <span className="text-sm text-muted-foreground">
                      {p.status === "REJECTED" ? "Not approved" : "Pending"}
                    </span>
                  )}
                </div>

                {/* Routing number */}
                <div className="min-w-0">
                  <p className="mb-0.5 text-[10px] uppercase tracking-wide text-muted-foreground md:hidden">
                    Routing number
                  </p>
                  <span className="font-mono text-sm">
                    {approved && p.routingNumber ? p.routingNumber : "—"}
                  </span>
                </div>

                {/* Status + actions */}
                <div className="flex items-center justify-between gap-2 md:w-32 md:justify-end">
                  <ProfileStatusBadge
                    status={p.status}
                    pendingKind={p.accountNumber ? "update" : "new"}
                  />
                  <div className="flex items-center gap-0.5">
                    <button
                      type="button"
                      aria-label="Edit"
                      title="Edit"
                      onClick={(e) => {
                        e.stopPropagation();
                        onEdit(p);
                      }}
                      className="grid h-8 w-8 place-items-center rounded-md text-muted-foreground opacity-0 transition hover:bg-accent hover:text-foreground focus:opacity-100 group-hover:opacity-100"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      aria-label="Delete"
                      title="Delete"
                      disabled={pendingId === p.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        remove(p.id);
                      }}
                      className="grid h-8 w-8 place-items-center rounded-md text-destructive opacity-0 transition hover:bg-destructive/10 focus:opacity-100 group-hover:opacity-100"
                    >
                      {pendingId === p.id ? (
                        <Loader2 className="h-3.5 w-3.5 animate-spin" />
                      ) : (
                        <Trash2 className="h-3.5 w-3.5" />
                      )}
                    </button>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </div>
              </div>
            </li>
          );
        })}
      </ul>
    </Card>
  );
}

type ProfileTx = {
  id: string;
  createdAt: Date;
  senderName: string;
  type: TransactionType;
  amountCents: number;
  status: TransactionStatus;
};

/** A profile's transaction history, lazily loaded with a skeleton state. */
function ProfileTransactionHistory({ profileId }: { profileId: string }) {
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<ProfileTx[]>([]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    getProfileTransactions(profileId)
      .then((res) => {
        if (active) setItems(res.ok ? res.transactions : []);
      })
      .finally(() => {
        if (active) setLoading(false);
      });
    return () => {
      active = false;
    };
  }, [profileId]);

  return (
    <section>
      <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
        Transaction history
      </h3>
      {loading ? (
        <div className="space-y-3 rounded-lg border bg-muted/20 p-3">
          {[0, 1, 2].map((i) => (
            <div key={i} className="flex items-center justify-between gap-3">
              <div className="space-y-1.5">
                <Skeleton className="h-3.5 w-32" />
                <Skeleton className="h-3 w-24" />
              </div>
              <div className="flex flex-col items-end gap-1.5">
                <Skeleton className="h-3.5 w-16" />
                <Skeleton className="h-4 w-20" />
              </div>
            </div>
          ))}
        </div>
      ) : items.length === 0 ? (
        <p className="rounded-lg border border-dashed bg-muted/20 px-3 py-6 text-center text-sm text-muted-foreground">
          No transactions on this profile yet.
        </p>
      ) : (
        <ul className="divide-y divide-border/60 overflow-hidden rounded-lg border bg-muted/20">
          {items.map((t) => (
            <li
              key={t.id}
              className="flex items-center justify-between gap-3 px-3 py-2.5"
            >
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-foreground">
                  {t.senderName}
                </p>
                <p className="text-xs text-muted-foreground">
                  {formatDateTime(t.createdAt)} · {t.type}
                </p>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1">
                <span className="text-sm font-semibold">
                  {formatUSD(t.amountCents)}
                </span>
                <TransactionStatusBadge status={t.status} />
              </div>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

function ProfileViewDialog({
  profile,
  onClose,
  onEdit,
}: {
  profile: CustomerProfile;
  onClose: () => void;
  onEdit: () => void;
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
  }: {
    label: string;
    value: string;
    mono?: boolean;
    onCopy?: () => void;
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
        <span className="truncate text-right">{value}</span>
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

  const isApproved = profile.status === "APPROVED";
  const isRejected = profile.status === "REJECTED";

  return (
    <DialogContent className="flex max-h-[85vh] max-w-lg flex-col gap-0 p-0">
      <DialogHeader className="border-b px-6 py-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <DialogTitle className="text-xl">
              {profile.firstName} {profile.lastName}
            </DialogTitle>
            <DialogDescription className="flex items-center gap-1.5">
              <CurrencyFlag code={profile.accountCurrency} size="sm" />
              {profile.accountCurrency} account · Sender: {profile.senderName}
            </DialogDescription>
          </div>
          <ProfileStatusBadge
            status={profile.status}
            pendingKind={profile.accountNumber ? "update" : "new"}
          />
        </div>
      </DialogHeader>

      <div className="flex-1 space-y-5 overflow-y-auto px-6 py-5">
        {isRejected && (
          <section className="rounded-lg border border-destructive/40 bg-destructive/10 p-4">
            <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-destructive">
              <Lock className="h-3.5 w-3.5" /> Profile not approved
            </h3>
            <p className="mt-1.5 text-sm text-foreground">
              {profile.notes
                ? profile.notes
                : "This profile was not approved. Edit the details below and resubmit it for review."}
            </p>
            <p className="mt-2 text-xs text-muted-foreground">
              Editing this profile resubmits it for review.
            </p>
          </section>
        )}

        <section>
          <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Profile
          </h3>
          <dl className="divide-y divide-border/60 rounded-lg border bg-muted/20 px-3">
            <Detail
              label="Full name"
              value={[profile.firstName, profile.middleName, profile.lastName]
                .filter(Boolean)
                .join(" ")}
            />
            <Detail label="Sender name" value={profile.senderName} />
            <div className="flex items-center justify-between gap-3 py-2">
              <dt className="shrink-0 text-xs uppercase tracking-wide text-muted-foreground">
                Account currency
              </dt>
              <dd className="text-sm">
                <CurrencyFlagLabel code={profile.accountCurrency} withName />
              </dd>
            </div>
            <Detail
              label="Withdrawal (USDC Base)"
              value={profile.withdrawalAddress}
              mono
              onCopy={() => copy(profile.withdrawalAddress, "Address")}
            />
          </dl>
        </section>

        {isApproved && profile.accountNumber ? (
          <section>
            <div className="mb-1 flex items-center justify-between">
              <h3 className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                <CurrencyFlag code={profile.accountCurrency} size="sm" /> Your{" "}
                {profile.accountCurrency} account
              </h3>
              {profile.transferMethod && (
                <Badge variant="outline" className="font-mono text-[10px]">
                  {profile.transferMethod === "BOTH"
                    ? "ACH + Wire"
                    : profile.transferMethod}
                </Badge>
              )}
            </div>
            <dl className="divide-y divide-border/60 rounded-lg border bg-muted/20 px-3">
              <Detail label="Bank" value={profile.bankName ?? "—"} />
              <Detail label="Bank address" value={profile.bankAddress ?? "—"} />
              <Detail
                label="Account number"
                value={profile.accountNumber}
                mono
                onCopy={() => copy(profile.accountNumber!, "Account number")}
              />
              <Detail
                label="Routing number"
                value={profile.routingNumber ?? "—"}
                mono
                onCopy={
                  profile.routingNumber
                    ? () => copy(profile.routingNumber!, "Routing number")
                    : undefined
                }
              />
            </dl>
            <p className="mt-2 flex items-start gap-1.5 text-xs text-muted-foreground">
              <Lock className="mt-0.5 h-3 w-3" />
              <span>
                Share these details with senders to receive ACH or Wire deposits.
                Funds settle automatically to your USDC withdrawal address.
              </span>
            </p>
          </section>
        ) : (
          <section className="rounded-lg border border-dashed bg-muted/20 p-4 text-center">
            <Lock className="mx-auto h-5 w-5 text-muted-foreground" />
            <p className="mt-2 text-sm font-medium">
              {profile.accountCurrency} account not assigned yet
            </p>
            <p className="mt-1 text-xs text-muted-foreground">
              Your bank details will appear here once an admin approves this
              profile.
            </p>
          </section>
        )}

        <ProfileTransactionHistory profileId={profile.id} />
      </div>

      <DialogFooter className="border-t px-6 py-4">
        <Button variant="outline" onClick={onClose}>
          Close
        </Button>
        <Button onClick={onEdit}>
          <Pencil className="h-4 w-4" /> Edit
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}

function ProfileDialog({ onDone }: { onDone: () => void }) {
  const [pending, startTransition] = useTransition();
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
    reset,
  } = useForm<ProfileInput>({
    resolver: zodResolver(profileSchema),
    defaultValues: { accountCurrency: "USD" },
  });
  const accountCurrency = watch("accountCurrency") ?? "USD";

  const onSubmit = handleSubmit((data) => {
    startTransition(async () => {
      const res = await createProfile(data);
      if (res.ok) {
        toast.success("Profile submitted for review");
        reset();
        onDone();
      } else {
        toast.error(res.error);
      }
    });
  });

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>New profile</DialogTitle>
        <DialogDescription>
          Your profile will be reviewed by our team and approved before
          activation.
        </DialogDescription>
      </DialogHeader>
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="firstName">First name</Label>
            <Input id="firstName" {...register("firstName")} />
            {errors.firstName && (
              <p className="text-xs text-destructive">
                {errors.firstName.message}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="middleName">
              Middle name{" "}
              <span className="text-muted-foreground">(optional)</span>
            </Label>
            <Input id="middleName" {...register("middleName")} />
            {errors.middleName && (
              <p className="text-xs text-destructive">
                {errors.middleName.message}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="lastName">Last name</Label>
            <Input id="lastName" {...register("lastName")} />
            {errors.lastName && (
              <p className="text-xs text-destructive">
                {errors.lastName.message}
              </p>
            )}
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="senderName">Sender name</Label>
          <Input
            id="senderName"
            placeholder="The name that should appear on incoming transfers"
            {...register("senderName")}
          />
          {errors.senderName && (
            <p className="text-xs text-destructive">{errors.senderName.message}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="accountCurrency">Bank account currency</Label>
          <Select
            value={accountCurrency}
            onValueChange={(v) =>
              setValue("accountCurrency", v as AccountCurrency, {
                shouldValidate: true,
              })
            }
          >
            <SelectTrigger id="accountCurrency">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {ACCOUNT_CURRENCIES.map((c) => (
                <SelectItem key={c} value={c}>
                  <span className="flex items-center gap-2">
                    <CurrencyFlag code={c} />
                    {c} · {currencyMeta(c).label}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label htmlFor="withdrawalAddress">Withdrawal address (USDC on Base)</Label>
          <Input
            id="withdrawalAddress"
            placeholder="0x..."
            className="font-mono text-xs"
            {...register("withdrawalAddress")}
          />
          {errors.withdrawalAddress && (
            <p className="text-xs text-destructive">
              {errors.withdrawalAddress.message}
            </p>
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onDone}>
            Cancel
          </Button>
          <Button type="submit" disabled={pending}>
            {pending && <Loader2 className="animate-spin" />}
            Submit for review
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}

/**
 * Lets a customer change a profile's USDC withdrawal address. Deliberately a
 * plain controlled form (no form library) — the submit button enables only
 * when the address is valid and changed, so there is no hidden validation
 * step that can silently swallow a click.
 */
function EditAddressDialog({
  profile,
  onDone,
}: {
  profile: CustomerProfile;
  onDone: () => void;
}) {
  const [address, setAddress] = useState(profile.withdrawalAddress);
  const [pending, startTransition] = useTransition();

  const trimmed = address.trim();
  const valid = /^0x[a-fA-F0-9]{40}$/.test(trimmed);
  const changed = trimmed !== profile.withdrawalAddress;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!valid || !changed || pending) return;
    startTransition(async () => {
      const res = await updateWithdrawalAddress(profile.id, trimmed);
      if (res.ok) {
        toast.success(
          "Withdrawal address submitted — your profile is now pending admin review.",
        );
        onDone();
      } else {
        toast.error(res.error);
      }
    });
  };

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Update withdrawal address</DialogTitle>
        <DialogDescription>
          {profile.firstName} {profile.lastName} · {profile.accountCurrency}{" "}
          account
        </DialogDescription>
      </DialogHeader>
      <form onSubmit={submit} className="space-y-4">
        <div className="space-y-1.5">
          <Label>Current address</Label>
          <p className="break-all rounded-lg border bg-muted/40 px-3 py-2 font-mono text-xs">
            {profile.withdrawalAddress}
          </p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="newWithdrawalAddress">
            New withdrawal address (USDC on Base)
          </Label>
          <Input
            id="newWithdrawalAddress"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="0x..."
            className="font-mono text-xs"
            autoComplete="off"
          />
          {trimmed.length > 0 && !valid && (
            <p className="text-xs text-destructive">
              Enter a valid Base address — 0x followed by 40 hexadecimal
              characters.
            </p>
          )}
        </div>
        <div className="flex items-start gap-2 rounded-lg border border-warning/40 bg-warning/10 p-3 text-xs text-warning">
          <Clock className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          <span>
            Changing the withdrawal address sends this profile back to admin
            review. An admin is notified and must approve it before it goes
            live.
          </span>
        </div>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={onDone}>
            Cancel
          </Button>
          <Button type="submit" disabled={pending || !valid || !changed}>
            {pending && <Loader2 className="animate-spin" />}
            Submit for review
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}
