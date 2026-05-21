"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import {
  Ban,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  Loader2,
  ShieldCheck,
  ShieldOff,
  Trash2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatDate } from "@/lib/utils";
import {
  adminDeleteCustomer,
  adminResetTwoFactor,
  adminUpdateCustomerCredentials,
  setCustomerBlocked,
} from "../actions";

type Customer = {
  id: string;
  email: string;
  name: string | null;
  createdAt: Date;
  blocked: boolean;
  blockedReason: string | null;
  twoFactor: boolean;
  profiles: number;
  transactions: number;
};

export function AdminCustomersClient({
  customers,
}: {
  customers: Customer[];
}) {
  const [target, setTarget] = useState<Customer | null>(null);
  const [deleting, setDeleting] = useState<Customer | null>(null);
  const [editing, setEditing] = useState<Customer | null>(null);

  return (
    <>
      <Card>
        <CardContent className="p-0">
          {customers.length === 0 ? (
            <div className="px-6 py-12 text-center text-sm text-muted-foreground">
              No customers yet.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Email</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead className="text-right">Profiles</TableHead>
                  <TableHead className="text-right">Transactions</TableHead>
                  <TableHead>Joined</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {customers.map((c) => (
                  <TableRow key={c.id}>
                    <TableCell className="font-medium">{c.email}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {c.name ?? "—"}
                    </TableCell>
                    <TableCell className="text-right">{c.profiles}</TableCell>
                    <TableCell className="text-right">{c.transactions}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {formatDate(c.createdAt)}
                    </TableCell>
                    <TableCell>
                      {c.blocked ? (
                        <Badge variant="destructive">
                          <Ban className="h-3 w-3" /> Blocked
                        </Badge>
                      ) : (
                        <Badge variant="success">
                          <CheckCircle2 className="h-3 w-3" /> Active
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="inline-flex items-center gap-1">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setEditing(c)}
                          aria-label="Edit credentials"
                          title="Edit sign-in credentials"
                        >
                          <KeyRound className="h-3.5 w-3.5" />
                        </Button>
                        {c.blocked ? (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => setTarget(c)}
                          >
                            <ShieldCheck className="h-3.5 w-3.5" /> Unblock
                          </Button>
                        ) : (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setTarget(c)}
                            className="text-warning hover:bg-warning/10 hover:text-warning"
                          >
                            <Ban className="h-3.5 w-3.5" /> Block
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setDeleting(c)}
                          aria-label="Delete customer"
                          title="Delete customer"
                          className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={target !== null} onOpenChange={(v) => !v && setTarget(null)}>
        {target && (
          <BlockDialog customer={target} onDone={() => setTarget(null)} />
        )}
      </Dialog>

      <Dialog open={deleting !== null} onOpenChange={(v) => !v && setDeleting(null)}>
        {deleting && (
          <DeleteCustomerDialog
            customer={deleting}
            onDone={() => setDeleting(null)}
          />
        )}
      </Dialog>

      <Dialog open={editing !== null} onOpenChange={(v) => !v && setEditing(null)}>
        {editing && (
          <CredentialsDialog
            customer={editing}
            onDone={() => setEditing(null)}
          />
        )}
      </Dialog>
    </>
  );
}

function CredentialsDialog({
  customer,
  onDone,
}: {
  customer: Customer;
  onDone: () => void;
}) {
  const [email, setEmail] = useState(customer.email);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [twoFactorOn, setTwoFactorOn] = useState(customer.twoFactor);
  const [pending, startTransition] = useTransition();
  const [resetPending, startResetTransition] = useTransition();

  const submit = () => {
    startTransition(async () => {
      const res = await adminUpdateCustomerCredentials({
        id: customer.id,
        email: email.trim(),
        password,
      });
      if (res.ok) {
        toast.success(
          "Credentials updated. The customer has been notified by email.",
        );
        onDone();
      } else {
        toast.error(res.error);
      }
    });
  };

  const resetTwoFactor = () => {
    if (
      !confirm(
        "Disable two-factor for this customer? They'll be able to sign in with just their password until they set it up again.",
      )
    )
      return;
    startResetTransition(async () => {
      const res = await adminResetTwoFactor(customer.id);
      if (res.ok) {
        toast.success("Two-factor authentication disabled for this customer.");
        setTwoFactorOn(false);
      } else {
        toast.error(res.error);
      }
    });
  };

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Edit sign-in credentials</DialogTitle>
        <DialogDescription>
          Update the sign-in email or set a new password for{" "}
          <strong>{customer.name ?? customer.email}</strong>. Existing passwords
          are encrypted and can&apos;t be viewed — only replaced. The customer is
          notified by email of any change.
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="cred-email">Sign-in email</Label>
          <Input
            id="cred-email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="off"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="cred-password">New password</Label>
          <div className="relative">
            <Input
              id="cred-password"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Leave blank to keep current password"
              autoComplete="new-password"
              className="pr-10"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? "Hide password" : "Show password"}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          </div>
          <p className="text-xs text-muted-foreground">
            Minimum 8 characters. Leave blank to leave the password unchanged.
          </p>
        </div>

        <div className="rounded-lg border p-3">
          <div className="flex items-center justify-between gap-3">
            <div className="text-sm">
              <p className="font-medium">Two-factor authentication</p>
              <p className="text-xs text-muted-foreground">
                {twoFactorOn
                  ? "Enabled — the customer signs in with an authenticator code."
                  : "Not enabled for this customer."}
              </p>
            </div>
            {twoFactorOn && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={resetTwoFactor}
                disabled={resetPending}
                className="shrink-0"
              >
                {resetPending ? (
                  <Loader2 className="animate-spin" />
                ) : (
                  <ShieldOff className="h-3.5 w-3.5" />
                )}
                Disable
              </Button>
            )}
          </div>
          {twoFactorOn && (
            <p className="mt-2 text-xs text-muted-foreground">
              Use this if the customer has lost access to their authenticator
              app and is locked out.
            </p>
          )}
        </div>
      </div>

      <DialogFooter>
        <Button variant="outline" onClick={onDone}>
          <X /> Cancel
        </Button>
        <Button onClick={submit} disabled={pending}>
          {pending && <Loader2 className="animate-spin" />}
          <KeyRound className="h-4 w-4" /> Save changes
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}

function DeleteCustomerDialog({
  customer,
  onDone,
}: {
  customer: Customer;
  onDone: () => void;
}) {
  const [pending, startTransition] = useTransition();

  const submit = () => {
    startTransition(async () => {
      const res = await adminDeleteCustomer(customer.id);
      if (res.ok) {
        toast.success("Customer and all their data deleted.");
        onDone();
      } else {
        toast.error(res.error);
      }
    });
  };

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Delete this customer?</DialogTitle>
        <DialogDescription>
          <strong>{customer.name ?? customer.email}</strong> · {customer.email}
          <br />
          This permanently deletes the customer account along with{" "}
          <strong>
            {customer.profiles} profile{customer.profiles === 1 ? "" : "s"}
          </strong>{" "}
          and{" "}
          <strong>
            {customer.transactions} transaction
            {customer.transactions === 1 ? "" : "s"}
          </strong>
          . This action cannot be undone.
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

function BlockDialog({
  customer,
  onDone,
}: {
  customer: Customer;
  onDone: () => void;
}) {
  const blocking = !customer.blocked;
  const [reason, setReason] = useState("");
  const [pending, startTransition] = useTransition();

  const submit = () => {
    startTransition(async () => {
      const res = await setCustomerBlocked({
        id: customer.id,
        blocked: blocking,
        reason: blocking ? reason.trim() || undefined : undefined,
      });
      if (res.ok) {
        toast.success(
          blocking
            ? "Customer blocked. They've been notified by email."
            : "Customer reinstated. They've been notified by email.",
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
        <DialogTitle>
          {blocking ? "Block this customer?" : "Reinstate this customer?"}
        </DialogTitle>
        <DialogDescription>
          <strong>{customer.name ?? customer.email}</strong> · {customer.email}
          <br />
          {blocking
            ? "They will be signed out, unable to sign in, and emailed about the suspension."
            : "They will be able to sign in again and will be emailed that their account is reinstated."}
        </DialogDescription>
      </DialogHeader>

      {blocking && (
        <div className="space-y-2">
          <label className="text-sm font-medium">
            Reason (optional — shown to the customer)
          </label>
          <Textarea
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. Suspected fraudulent activity on the account."
          />
        </div>
      )}

      <DialogFooter>
        <Button variant="outline" onClick={onDone}>
          <X /> Cancel
        </Button>
        <Button
          variant={blocking ? "destructive" : "success"}
          onClick={submit}
          disabled={pending}
        >
          {pending && <Loader2 className="animate-spin" />}
          {blocking ? (
            <>
              <Ban className="h-4 w-4" /> Block account
            </>
          ) : (
            <>
              <ShieldCheck className="h-4 w-4" /> Reinstate account
            </>
          )}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}
