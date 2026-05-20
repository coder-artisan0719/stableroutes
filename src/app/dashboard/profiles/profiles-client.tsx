"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import {
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
import type { CustomerProfile } from "@prisma/client";
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
import { useRouter } from "next/navigation";
import { ProfileStatusBadge } from "@/components/status-badge";
import { profileSchema, type ProfileInput } from "@/lib/validators";
import { formatDate, truncateMiddle } from "@/lib/utils";
import { createProfile, deleteProfile, updateProfile } from "../actions";
import { ProfilesToolbar, type ProfilesQuery } from "./profiles-toolbar";

type ResolvedQuery = {
  q: string;
  status?: "PENDING" | "APPROVED";
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
  counts: { all: number; pending: number; approved: number };
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
        <Dialog
          open={open || editing !== null}
          onOpenChange={(v) => {
            if (!v) {
              setOpen(false);
              setEditing(null);
            }
          }}
        >
          <DialogTrigger asChild>
            <Button onClick={() => setOpen(true)}>
              <Plus /> New profile
            </Button>
          </DialogTrigger>
          <ProfileDialog
            profile={editing}
            onDone={() => {
              setOpen(false);
              setEditing(null);
            }}
          />
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
    </>
  );
}

function buildHref(q: ResolvedQuery & { page: number; pageSize?: PageSize }) {
  const params = new URLSearchParams();
  if (q.q) params.set("q", q.q);
  if (q.status) params.set("status", q.status);
  if (q.sort && q.sort !== "newest") params.set("sort", q.sort);
  if (q.view && q.view !== "grid") params.set("view", q.view);
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
            <CardDescription className="truncate">
              Sender: {profile.senderName}
            </CardDescription>
          </div>
          <ProfileStatusBadge status={profile.status} />
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {profile.status === "APPROVED" && profile.accountNumber ? (
          <div className="rounded-lg border bg-muted/30 p-3">
            <div className="mb-2 flex items-center justify-between">
              <p className="flex items-center gap-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                <Landmark className="h-3.5 w-3.5" /> Your USD account
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
  const [, startTransition] = useTransition();

  const copy = (address: string) => {
    navigator.clipboard.writeText(address);
    toast.success("Copied");
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
    <Card>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Sender</TableHead>
              <TableHead>Bank</TableHead>
              <TableHead>Account</TableHead>
              <TableHead>Withdrawal</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {profiles.map((p) => (
              <TableRow key={p.id}>
                <TableCell className="font-medium">
                  {p.firstName} {p.lastName}
                </TableCell>
                <TableCell className="text-sm text-muted-foreground">
                  {p.senderName}
                </TableCell>
                <TableCell className="text-sm">{p.bankName ?? "—"}</TableCell>
                <TableCell>
                  {p.accountNumber ? (
                    <button
                      type="button"
                      onClick={() => copy(p.accountNumber!)}
                      title="Copy"
                      className="inline-flex items-center gap-1 font-mono text-xs text-muted-foreground transition-colors hover:text-foreground"
                    >
                      {p.accountNumber}
                      <Copy className="h-3 w-3" />
                    </button>
                  ) : (
                    <span className="text-xs text-muted-foreground">—</span>
                  )}
                </TableCell>
                <TableCell>
                  <button
                    type="button"
                    onClick={() => copy(p.withdrawalAddress)}
                    title="Copy"
                    className="inline-flex items-center gap-1 font-mono text-xs text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {truncateMiddle(p.withdrawalAddress, 8, 6)}
                    <Copy className="h-3 w-3" />
                  </button>
                </TableCell>
                <TableCell>
                  <ProfileStatusBadge status={p.status} />
                </TableCell>
                <TableCell className="text-right">
                  <div className="inline-flex gap-1">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => onView(p)}
                      aria-label="View"
                      title="View"
                    >
                      <Eye className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => onEdit(p)}
                      aria-label="Edit"
                      title="Edit"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => remove(p.id)}
                      disabled={pendingId === p.id}
                      aria-label="Delete"
                      title="Delete"
                      className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                    >
                      {pendingId === p.id ? (
                        <Loader2 className="animate-spin" />
                      ) : (
                        <Trash2 className="h-3.5 w-3.5" />
                      )}
                    </Button>
                  </div>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
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

  return (
    <DialogContent className="flex max-h-[85vh] max-w-lg flex-col gap-0 p-0">
      <DialogHeader className="border-b px-6 py-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <DialogTitle className="text-xl">
              {profile.firstName} {profile.lastName}
            </DialogTitle>
            <DialogDescription>Sender: {profile.senderName}</DialogDescription>
          </div>
          <ProfileStatusBadge status={profile.status} />
        </div>
      </DialogHeader>

      <div className="flex-1 space-y-5 overflow-y-auto px-6 py-5">
        <section>
          <h3 className="mb-1 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Profile
          </h3>
          <dl className="divide-y divide-border/60 rounded-lg border bg-muted/20 px-3">
            <Detail label="Full name" value={`${profile.firstName} ${profile.lastName}`} />
            <Detail label="Sender name" value={profile.senderName} />
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
                <Landmark className="h-3.5 w-3.5" /> Your USD account
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
            <p className="mt-2 text-sm font-medium">USD account not assigned yet</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Your bank details will appear here once an admin approves this
              profile.
            </p>
          </section>
        )}

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

function ProfileDialog({
  profile,
  onDone,
}: {
  profile: CustomerProfile | null;
  onDone: () => void;
}) {
  const isApproved = profile?.status === "APPROVED";
  const [pending, startTransition] = useTransition();
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<ProfileInput>({
    resolver: zodResolver(profileSchema),
    defaultValues: profile
      ? {
          firstName: profile.firstName,
          lastName: profile.lastName,
          senderName: profile.senderName,
          withdrawalAddress: profile.withdrawalAddress,
        }
      : undefined,
  });

  const onSubmit = handleSubmit((data) => {
    startTransition(async () => {
      const payload =
        isApproved && profile
          ? {
              senderName: data.senderName,
              withdrawalAddress: data.withdrawalAddress,
            }
          : data;

      const res = profile
        ? await updateProfile(profile.id, payload)
        : await createProfile(data);
      if (res.ok) {
        toast.success(profile ? "Profile updated" : "Profile submitted for review");
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
        <DialogTitle>{profile ? "Edit profile" : "New profile"}</DialogTitle>
        <DialogDescription>
          {!profile
            ? "Your profile will be reviewed by our team and approved before activation."
            : isApproved
              ? "Your profile is approved. You can update the sender name and withdrawal address. Contact support to change the name on the account."
              : "Your profile is still under review — you can edit any field."}
        </DialogDescription>
      </DialogHeader>
      <form onSubmit={onSubmit} className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label htmlFor="firstName" className="flex items-center gap-1.5">
              First name{" "}
              {isApproved && <Lock className="h-3 w-3 text-muted-foreground" />}
            </Label>
            <Input id="firstName" disabled={isApproved} {...register("firstName")} />
            {errors.firstName && (
              <p className="text-xs text-destructive">{errors.firstName.message}</p>
            )}
          </div>
          <div className="space-y-2">
            <Label htmlFor="lastName" className="flex items-center gap-1.5">
              Last name{" "}
              {isApproved && <Lock className="h-3 w-3 text-muted-foreground" />}
            </Label>
            <Input id="lastName" disabled={isApproved} {...register("lastName")} />
            {errors.lastName && (
              <p className="text-xs text-destructive">{errors.lastName.message}</p>
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
            {profile ? "Save changes" : "Submit for review"}
          </Button>
        </DialogFooter>
      </form>
    </DialogContent>
  );
}
