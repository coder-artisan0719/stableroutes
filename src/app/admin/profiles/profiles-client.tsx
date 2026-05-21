"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import {
  Ban,
  Check,
  Copy,
  Eye,
  Landmark,
  LayoutGrid,
  List,
  Loader2,
  Mail,
  Pencil,
  ShieldAlert,
  Trash2,
  User as UserIcon,
  X,
} from "lucide-react";
import type { CustomerProfile } from "@prisma/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import type { PageSize } from "@/lib/page-size";
import { ProfileStatusBadge } from "@/components/status-badge";
import {
  CurrencyFlag,
  CurrencyFlagLabel,
  currencyMeta,
} from "@/components/currency-flag";
import { cn, formatDateTime, truncateMiddle } from "@/lib/utils";
import { bankDetailsSchema, type BankDetailsInput } from "@/lib/validators";
import { adminDeleteProfile, setProfileStatus } from "../actions";

type Row = CustomerProfile & { userEmail: string; userName: string | null };

type ViewParam = "grid" | "table";

const COMMISSION_OPTIONS = ["0", "2", "3", "4", "5", "6", "7", "8", "10"];

export function AdminProfilesClient({
  profiles,
  active,
  view,
  pendingCount,
  approvedCount,
  rejectedCount,
  page,
  totalPages,
  pageSize,
  total,
}: {
  profiles: Row[];
  active: "PENDING" | "APPROVED" | "REJECTED";
  view: ViewParam;
  pendingCount: number;
  approvedCount: number;
  rejectedCount: number;
  page: number;
  totalPages: number;
  pageSize: PageSize;
  total: number;
}) {
  const router = useRouter();
  const [approving, setApproving] = useState<Row | null>(null);
  const [demoting, setDemoting] = useState<Row | null>(null);
  const [rejecting, setRejecting] = useState<Row | null>(null);
  const [deleting, setDeleting] = useState<Row | null>(null);
  const [viewing, setViewing] = useState<Row | null>(null);

  const startIdx = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const endIdx = Math.min(page * pageSize, total);

  function hrefFor(opts: {
    status?: typeof active;
    page?: number;
    pageSize?: PageSize;
    view?: ViewParam;
  }) {
    const params = new URLSearchParams();
    const s = opts.status ?? active;
    if (s !== "PENDING") params.set("status", s);
    const p = opts.page ?? page;
    if (p > 1) params.set("page", String(p));
    const ps = opts.pageSize ?? pageSize;
    if (ps !== 10) params.set("pageSize", String(ps));
    const v = opts.view ?? view;
    if (v !== "grid") params.set("view", v);
    const qs = params.toString();
    return qs ? `/admin/profiles?${qs}` : "/admin/profiles";
  }

  return (
    <>
      <div className="flex gap-1 rounded-lg border bg-card p-1 text-sm">
        <Link
          href={hrefFor({ status: "PENDING", page: 1 })}
          className={`flex-1 rounded-md px-4 py-2 text-center font-medium transition-colors ${
            active === "PENDING"
              ? "bg-primary/10 text-primary"
              : "text-muted-foreground hover:bg-accent"
          }`}
        >
          Pending <span className="ml-1 text-xs">({pendingCount})</span>
        </Link>
        <Link
          href={hrefFor({ status: "APPROVED", page: 1 })}
          className={`flex-1 rounded-md px-4 py-2 text-center font-medium transition-colors ${
            active === "APPROVED"
              ? "bg-primary/10 text-primary"
              : "text-muted-foreground hover:bg-accent"
          }`}
        >
          Approved <span className="ml-1 text-xs">({approvedCount})</span>
        </Link>
        <Link
          href={hrefFor({ status: "REJECTED", page: 1 })}
          className={`flex-1 rounded-md px-4 py-2 text-center font-medium transition-colors ${
            active === "REJECTED"
              ? "bg-primary/10 text-primary"
              : "text-muted-foreground hover:bg-accent"
          }`}
        >
          Rejected <span className="ml-1 text-xs">({rejectedCount})</span>
        </Link>
      </div>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-muted-foreground">
          {total === 0
            ? `No ${active.toLowerCase()} profiles.`
            : `Showing ${startIdx}–${endIdx} of ${total}`}
        </p>
        <div className="inline-flex self-start rounded-lg border bg-card p-0.5 sm:self-auto">
          <Link
            href={hrefFor({ view: "grid", page: 1 })}
            aria-label="Grid view"
            className={cn(
              "grid h-9 w-9 place-items-center rounded-md transition-colors",
              view === "grid"
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:bg-accent",
            )}
          >
            <LayoutGrid className="h-4 w-4" />
          </Link>
          <Link
            href={hrefFor({ view: "table", page: 1 })}
            aria-label="List view"
            className={cn(
              "grid h-9 w-9 place-items-center rounded-md transition-colors",
              view === "table"
                ? "bg-primary/10 text-primary"
                : "text-muted-foreground hover:bg-accent",
            )}
          >
            <List className="h-4 w-4" />
          </Link>
        </div>
      </div>

      {profiles.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center gap-3 py-16 text-center">
            <div className="grid h-12 w-12 place-items-center rounded-lg bg-success/10 text-success">
              <Check className="h-5 w-5" />
            </div>
            <h3 className="text-lg font-semibold">All clear</h3>
            <p className="text-sm text-muted-foreground">
              No profiles in this state right now.
            </p>
          </CardContent>
        </Card>
      ) : view === "table" ? (
        <ProfilesTable
          rows={profiles}
          onView={setViewing}
          onApprove={setApproving}
          onDemote={setDemoting}
          onReject={setRejecting}
          onDelete={setDeleting}
        />
      ) : (
        <ProfilesGrid
          rows={profiles}
          onView={setViewing}
          onApprove={setApproving}
          onDemote={setDemoting}
          onReject={setRejecting}
          onDelete={setDeleting}
        />
      )}

      {total > 0 && (
        <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
          <PageSizeSelector
            value={pageSize}
            onChange={(n) => router.replace(hrefFor({ page: 1, pageSize: n }))}
          />
          <Pagination
            page={page}
            totalPages={totalPages}
            hrefFor={(p) => hrefFor({ page: p })}
          />
          <div className="hidden text-sm text-muted-foreground sm:block">
            {startIdx}–{endIdx} of {total}
          </div>
        </div>
      )}

      <Dialog open={viewing !== null} onOpenChange={(v) => !v && setViewing(null)}>
        {viewing && <ViewDialog profile={viewing} onClose={() => setViewing(null)} />}
      </Dialog>
      <Dialog open={approving !== null} onOpenChange={(v) => !v && setApproving(null)}>
        {approving && (
          <ApproveDialog profile={approving} onDone={() => setApproving(null)} />
        )}
      </Dialog>
      <Dialog open={demoting !== null} onOpenChange={(v) => !v && setDemoting(null)}>
        {demoting && (
          <DemoteDialog profile={demoting} onDone={() => setDemoting(null)} />
        )}
      </Dialog>
      <Dialog open={rejecting !== null} onOpenChange={(v) => !v && setRejecting(null)}>
        {rejecting && (
          <RejectDialog profile={rejecting} onDone={() => setRejecting(null)} />
        )}
      </Dialog>
      <Dialog open={deleting !== null} onOpenChange={(v) => !v && setDeleting(null)}>
        {deleting && (
          <DeleteDialog profile={deleting} onDone={() => setDeleting(null)} />
        )}
      </Dialog>
    </>
  );
}

function CustomerCell({
  email,
  name,
}: {
  email: string;
  name: string | null;
}) {
  const initials =
    (name ?? email).split(/\s+|@/).filter(Boolean).slice(0, 2)
      .map((s) => s[0]?.toUpperCase()).join("") || "?";
  return (
    <div className="flex items-center gap-2.5">
      <Avatar className="h-8 w-8">
        <AvatarFallback className="bg-primary/10 text-xs text-primary">
          {initials}
        </AvatarFallback>
      </Avatar>
      <div className="min-w-0">
        <div className="truncate text-sm font-medium">{name ?? email.split("@")[0]}</div>
        <div className="truncate text-xs text-muted-foreground">{email}</div>
      </div>
    </div>
  );
}

function ActionButtons({
  row,
  onView,
  onApprove,
  onDemote,
  onReject,
  onDelete,
  compact,
}: {
  row: Row;
  onView: (r: Row) => void;
  onApprove: (r: Row) => void;
  onDemote: (r: Row) => void;
  onReject: (r: Row) => void;
  onDelete: (r: Row) => void;
  compact?: boolean;
}) {
  return (
    <div className={cn("flex gap-1", !compact && "flex-wrap")}>
      <Button
        size="sm"
        variant="ghost"
        onClick={() => onView(row)}
        aria-label="View"
        title="View"
      >
        <Eye className="h-3.5 w-3.5" />
      </Button>
      {row.status === "APPROVED" ? (
        <Button
          size="sm"
          variant="ghost"
          onClick={() => onApprove(row)}
          className="text-primary hover:bg-primary/10 hover:text-primary"
          aria-label="Edit bank & commission"
          title="Edit bank & commission"
        >
          <Pencil className="h-3.5 w-3.5" />
        </Button>
      ) : (
        <Button
          size="sm"
          variant="ghost"
          onClick={() => onApprove(row)}
          className="text-success hover:bg-success/10 hover:text-success"
          aria-label="Approve"
          title="Approve"
        >
          <Check className="h-3.5 w-3.5" />
        </Button>
      )}
      {row.status !== "REJECTED" && (
        <Button
          size="sm"
          variant="ghost"
          onClick={() => onReject(row)}
          className="text-destructive hover:bg-destructive/10 hover:text-destructive"
          aria-label="Reject"
          title="Reject"
        >
          <Ban className="h-3.5 w-3.5" />
        </Button>
      )}
      {row.status !== "PENDING" && (
        <Button
          size="sm"
          variant="ghost"
          onClick={() => onDemote(row)}
          className="text-warning hover:bg-warning/10 hover:text-warning"
          aria-label="Move to pending"
          title="Move to pending"
        >
          <ShieldAlert className="h-3.5 w-3.5" />
        </Button>
      )}
      <Button
        size="sm"
        variant="ghost"
        onClick={() => onDelete(row)}
        className="text-muted-foreground hover:bg-accent hover:text-foreground"
        aria-label="Delete"
        title="Delete"
      >
        <Trash2 className="h-3.5 w-3.5" />
      </Button>
    </div>
  );
}

function ProfilesGrid({
  rows,
  onView,
  onApprove,
  onDemote,
  onReject,
  onDelete,
}: {
  rows: Row[];
  onView: (r: Row) => void;
  onApprove: (r: Row) => void;
  onDemote: (r: Row) => void;
  onReject: (r: Row) => void;
  onDelete: (r: Row) => void;
}) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
      {rows.map((p) => (
        <Card key={p.id}>
          <CardContent className="space-y-4 p-5">
            <div className="flex items-start justify-between gap-3">
              <CustomerCell email={p.userEmail} name={p.userName} />
              <ProfileStatusBadge
                status={p.status}
                pendingKind={p.accountNumber ? "update" : "new"}
              />
            </div>
            <div className="rounded-lg border bg-muted/30 p-3">
              <p className="mb-2 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Profile
              </p>
              <dl className="space-y-1.5 text-xs">
                <DLRow
                  label="Account name"
                  value={`${p.firstName} ${p.lastName}`}
                />
                <DLRow
                  label="Currency"
                  value={
                    <CurrencyFlagLabel
                      code={p.accountCurrency}
                      size="sm"
                      className="text-xs"
                    />
                  }
                />
                <DLRow label="Sender" value={p.senderName} />
                <DLRow
                  label="Withdrawal"
                  value={truncateMiddle(p.withdrawalAddress, 10, 6)}
                  mono
                />
                <DLRow label="Submitted" value={formatDateTime(p.createdAt)} />
                {p.status === "APPROVED" && (
                  <>
                    <div className="my-1 border-t border-border/60" />
                    <DLRow label="Bank" value={p.bankName ?? "—"} />
                    <DLRow label="Account" value={p.accountNumber ?? "—"} mono />
                    <DLRow label="Routing" value={p.routingNumber ?? "—"} mono />
                    <DLRow
                      label="Accepts"
                      value={
                        p.transferMethod === "BOTH"
                          ? "ACH + Wire"
                          : (p.transferMethod ?? "—")
                      }
                    />
                    <DLRow label="Commission" value={`${p.commissionPct}%`} />
                  </>
                )}
              </dl>
            </div>
            <ActionButtons
              row={p}
              onView={onView}
              onApprove={onApprove}
              onDemote={onDemote}
              onReject={onReject}
              onDelete={onDelete}
            />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

function ProfilesTable({
  rows,
  onView,
  onApprove,
  onDemote,
  onReject,
  onDelete,
}: {
  rows: Row[];
  onView: (r: Row) => void;
  onApprove: (r: Row) => void;
  onDemote: (r: Row) => void;
  onReject: (r: Row) => void;
  onDelete: (r: Row) => void;
}) {
  return (
    <Card>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Customer</TableHead>
              <TableHead>Profile name</TableHead>
              <TableHead>Sender</TableHead>
              <TableHead>Withdrawal</TableHead>
              <TableHead>Bank</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Submitted</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((p) => (
              <TableRow key={p.id}>
                <TableCell>
                  <CustomerCell email={p.userEmail} name={p.userName} />
                </TableCell>
                <TableCell className="text-sm font-medium">
                  <span className="flex items-center gap-1.5">
                    <CurrencyFlag code={p.accountCurrency} size="sm" />
                    {p.firstName} {p.lastName}
                  </span>
                  <span className="text-xs font-normal text-muted-foreground">
                    {p.accountCurrency} account
                  </span>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {p.senderName}
                </TableCell>
                <TableCell>
                  <span className="font-mono text-xs text-muted-foreground">
                    {truncateMiddle(p.withdrawalAddress, 8, 6)}
                  </span>
                </TableCell>
                <TableCell className="text-sm">
                  {p.bankName ? (
                    <div>
                      <div>{p.bankName}</div>
                      {p.accountNumber && (
                        <div className="font-mono text-xs text-muted-foreground">
                          {p.accountNumber}
                        </div>
                      )}
                    </div>
                  ) : (
                    <span className="text-xs text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell>
                  <ProfileStatusBadge
                    status={p.status}
                    pendingKind={p.accountNumber ? "update" : "new"}
                  />
                </TableCell>
                <TableCell className="text-xs text-muted-foreground">
                  {formatDateTime(p.createdAt)}
                </TableCell>
                <TableCell className="text-right">
                  <ActionButtons
                    row={p}
                    onView={onView}
                    onApprove={onApprove}
                    onDemote={onDemote}
                    onReject={onReject}
                    onDelete={onDelete}
                    compact
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function DLRow({
  label,
  value,
  mono,
}: {
  label: string;
  value: React.ReactNode;
  mono?: boolean;
}) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-muted-foreground">{label}</dt>
      <dd
        className={`truncate font-medium text-foreground ${mono ? "font-mono" : ""}`}
      >
        {value}
      </dd>
    </div>
  );
}

function ViewDialog({ profile, onClose }: { profile: Row; onClose: () => void }) {
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

  return (
    <DialogContent className="flex max-h-[85vh] max-w-lg flex-col gap-0 p-0">
      <DialogHeader className="border-b px-6 py-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <DialogTitle className="truncate text-xl">
              {profile.firstName} {profile.lastName}
            </DialogTitle>
            <DialogDescription>Sender: {profile.senderName}</DialogDescription>
          </div>
          <ProfileStatusBadge
            status={profile.status}
            pendingKind={profile.accountNumber ? "update" : "new"}
          />
        </div>
      </DialogHeader>

      <div className="flex-1 space-y-5 overflow-y-auto px-6 py-5">
        <section>
          <h3 className="mb-1 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            <UserIcon className="h-3.5 w-3.5" /> Customer
          </h3>
          <dl className="divide-y divide-border/60 rounded-lg border bg-muted/20 px-3">
            <Detail label="Name" value={profile.userName ?? "—"} />
            <Detail
              label="Email"
              value={profile.userEmail}
              onCopy={() => copy(profile.userEmail, "Email")}
            />
          </dl>
        </section>

        <section>
          <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Profile
          </h3>
          <dl className="divide-y divide-border/60 rounded-lg border bg-muted/20 px-3">
            <Detail label="First name" value={profile.firstName} />
            <Detail label="Last name" value={profile.lastName} />
            <Detail label="Sender name" value={profile.senderName} />
            <div className="flex items-center justify-between gap-3 py-2">
              <dt className="shrink-0 text-xs uppercase tracking-wide text-muted-foreground">
                Requested currency
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
                <CurrencyFlag code={profile.accountCurrency} size="sm" />{" "}
                Assigned {profile.accountCurrency} account
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
              <Detail
                label="Commission fee"
                value={`${profile.commissionPct}%`}
              />
            </dl>
          </section>
        ) : null}

        {profile.notes && (
          <section>
            <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Internal notes
            </h3>
            <p className="rounded-lg border bg-muted/20 px-3 py-2 text-sm text-foreground">
              {profile.notes}
            </p>
          </section>
        )}

        <section>
          <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Timeline
          </h3>
          <dl className="divide-y divide-border/60 rounded-lg border bg-muted/20 px-3">
            <Detail label="Submitted" value={formatDateTime(profile.createdAt)} />
            {profile.approvedAt && (
              <Detail label="Approved" value={formatDateTime(profile.approvedAt)} />
            )}
            <Detail label="Last updated" value={formatDateTime(profile.updatedAt)} />
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

function ApproveDialog({
  profile,
  onDone,
}: {
  profile: Row;
  onDone: () => void;
}) {
  const isEditing = profile.status === "APPROVED";
  const [notes, setNotes] = useState(profile.notes ?? "");
  const [commissionPct, setCommissionPct] = useState(
    String(profile.commissionPct ?? 0),
  );
  const [pending, startTransition] = useTransition();
  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<BankDetailsInput>({
    resolver: zodResolver(bankDetailsSchema),
    defaultValues: {
      bankName: profile.bankName ?? "",
      bankAddress: profile.bankAddress ?? "",
      accountNumber: profile.accountNumber ?? "",
      routingNumber: profile.routingNumber ?? "",
      transferMethod: profile.transferMethod ?? "BOTH",
    },
  });

  const transferMethod = watch("transferMethod");

  const onSubmit = handleSubmit((bank) => {
    startTransition(async () => {
      const res = await setProfileStatus({
        id: profile.id,
        status: "APPROVED",
        notes: notes.trim() || undefined,
        commissionPct: Math.min(
          100,
          Math.max(0, Math.round(Number(commissionPct) || 0)),
        ),
        bank,
      });
      if (res.ok) {
        toast.success(
          isEditing
            ? "Profile updated. Customer notified."
            : "Profile approved. Customer notified.",
        );
        onDone();
      } else {
        toast.error(res.error);
      }
    });
  });

  return (
    <DialogContent className="flex max-h-[85vh] max-w-xl flex-col gap-0 p-0">
      <DialogHeader className="border-b px-6 py-4">
        <DialogTitle>
          {isEditing ? "Edit bank account & commission" : "Approve profile"}
        </DialogTitle>
        <DialogDescription>
          {profile.firstName} {profile.lastName} · {profile.userEmail}
          <br />
          {isEditing
            ? "Adjust the bank details or commission rate. Updates are emailed to the customer."
            : "Assign a bank account and commission rate — these are emailed to the customer."}
        </DialogDescription>
      </DialogHeader>
      <form
        onSubmit={onSubmit}
        className="flex flex-1 flex-col gap-4 overflow-y-auto px-6 py-5"
      >
        <div className="flex items-center gap-2 rounded-lg border bg-muted/40 px-3 py-2.5 text-sm">
          <CurrencyFlag code={profile.accountCurrency} />
          <span>
            Customer requested a{" "}
            <strong>{currencyMeta(profile.accountCurrency).label}</strong>{" "}
            account &mdash; provision the bank details below in {" "}
            {profile.accountCurrency}.
          </span>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="bankName">Bank name</Label>
            <Input
              id="bankName"
              placeholder="e.g. Stripe Bank"
              {...register("bankName")}
            />
            {errors.bankName && (
              <p className="text-xs text-destructive">{errors.bankName.message}</p>
            )}
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="bankAddress">Bank address</Label>
            <Input
              id="bankAddress"
              placeholder="1455 Market St, San Francisco, CA 94103, USA"
              {...register("bankAddress")}
            />
            {errors.bankAddress && (
              <p className="text-xs text-destructive">
                {errors.bankAddress.message}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="accountNumber">Account number</Label>
            <Input
              id="accountNumber"
              className="font-mono"
              placeholder="0000000000"
              {...register("accountNumber")}
            />
            {errors.accountNumber && (
              <p className="text-xs text-destructive">
                {errors.accountNumber.message}
              </p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="routingNumber">Routing number (9 digits)</Label>
            <Input
              id="routingNumber"
              className="font-mono"
              placeholder="110000000"
              {...register("routingNumber")}
            />
            {errors.routingNumber && (
              <p className="text-xs text-destructive">
                {errors.routingNumber.message}
              </p>
            )}
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="transferMethod">Accepts</Label>
            <Select
              value={transferMethod}
              onValueChange={(v) =>
                setValue("transferMethod", v as BankDetailsInput["transferMethod"], {
                  shouldValidate: true,
                })
              }
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ACH">ACH only</SelectItem>
                <SelectItem value="WIRE">Wire only</SelectItem>
                <SelectItem value="BOTH">ACH and Wire</SelectItem>
              </SelectContent>
            </Select>
            {errors.transferMethod && (
              <p className="text-xs text-destructive">
                {errors.transferMethod.message}
              </p>
            )}
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="commissionPct">Commission fee</Label>
            <Select value={commissionPct} onValueChange={setCommissionPct}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {COMMISSION_OPTIONS.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}%{c === "0" ? " — no fee" : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Applied to every transfer on this profile. You can change it later.
            </p>
          </div>
        </div>
        <div className="space-y-2">
          <Label htmlFor="notes">Internal notes (optional)</Label>
          <Textarea
            id="notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            placeholder="Why was this decision made?"
          />
        </div>
        <DialogFooter className="-mx-6 mt-2 border-t bg-background px-6 pt-4">
          <Button variant="outline" type="button" onClick={onDone}>
            <X /> Cancel
          </Button>
          <Button variant="success" type="submit" disabled={pending}>
            {pending && <Loader2 className="animate-spin" />}
            <Check className="h-4 w-4" />{" "}
            {isEditing ? "Save changes" : "Approve & notify"}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}

function DemoteDialog({
  profile,
  onDone,
}: {
  profile: Row;
  onDone: () => void;
}) {
  const [notes, setNotes] = useState(profile.notes ?? "");
  const [pending, startTransition] = useTransition();

  const submit = () => {
    startTransition(async () => {
      const res = await setProfileStatus({
        id: profile.id,
        status: "PENDING",
        notes: notes.trim() || undefined,
      });
      if (res.ok) {
        toast.success("Profile moved to pending. Customer notified.");
        onDone();
      } else {
        toast.error(res.error);
      }
    });
  };

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Move to pending</DialogTitle>
        <DialogDescription>
          {profile.firstName} {profile.lastName} · {profile.userEmail}
          <br />
          The customer will be notified that their profile is under review again.
        </DialogDescription>
      </DialogHeader>
      <div className="space-y-2">
        <Label>Internal notes (optional)</Label>
        <Textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={3}
          placeholder="Reason for moving back to pending."
        />
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onDone}>
          <X /> Cancel
        </Button>
        <Button onClick={submit} disabled={pending}>
          {pending && <Loader2 className="animate-spin" />}
          Confirm
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}

function RejectDialog({
  profile,
  onDone,
}: {
  profile: Row;
  onDone: () => void;
}) {
  const [reason, setReason] = useState(profile.notes ?? "");
  const [pending, startTransition] = useTransition();

  const submit = () => {
    startTransition(async () => {
      const res = await setProfileStatus({
        id: profile.id,
        status: "REJECTED",
        notes: reason.trim() || undefined,
      });
      if (res.ok) {
        toast.success("Profile rejected. Customer notified.");
        onDone();
      } else {
        toast.error(res.error);
      }
    });
  };

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Reject this profile</DialogTitle>
        <DialogDescription>
          {profile.firstName} {profile.lastName} · {profile.userEmail}
          <br />
          The customer will be emailed that their profile was not approved. The
          reason below is shown to them — they can edit and resubmit.
        </DialogDescription>
      </DialogHeader>
      <div className="space-y-2">
        <Label>Reason for rejection</Label>
        <Textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          rows={3}
          placeholder="e.g. Withdrawal address could not be verified — please resubmit with a valid Base address."
        />
      </div>
      <DialogFooter>
        <Button variant="outline" onClick={onDone}>
          <X /> Cancel
        </Button>
        <Button variant="destructive" onClick={submit} disabled={pending}>
          {pending && <Loader2 className="animate-spin" />}
          <Ban className="h-4 w-4" /> Reject profile
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}

function DeleteDialog({
  profile,
  onDone,
}: {
  profile: Row;
  onDone: () => void;
}) {
  const [pending, startTransition] = useTransition();

  const submit = () => {
    startTransition(async () => {
      const res = await adminDeleteProfile(profile.id);
      if (res.ok) {
        toast.success("Profile deleted. It will be gone from the customer's view too.");
        onDone();
      } else {
        toast.error(res.error);
      }
    });
  };

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Delete this profile?</DialogTitle>
        <DialogDescription>
          <strong>
            {profile.firstName} {profile.lastName}
          </strong>{" "}
          · {profile.userEmail}
          <br />
          This will permanently remove the profile and all transactions associated
          with it. The customer will no longer see it in their dashboard. This
          action cannot be undone.
        </DialogDescription>
      </DialogHeader>
      <DialogFooter>
        <Button variant="outline" onClick={onDone}>
          <X /> Cancel
        </Button>
        <Button variant="destructive" onClick={submit} disabled={pending}>
          {pending && <Loader2 className="animate-spin" />}
          <Trash2 className="h-4 w-4" /> Delete permanently
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}
