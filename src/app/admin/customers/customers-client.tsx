"use client";

import { useState, useTransition } from "react";
import { toast } from "sonner";
import {
  Ban,
  CheckCircle2,
  Loader2,
  ShieldCheck,
  Trash2,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
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
import { adminDeleteCustomer, setCustomerBlocked } from "../actions";

type Customer = {
  id: string;
  email: string;
  name: string | null;
  createdAt: Date;
  blocked: boolean;
  blockedReason: string | null;
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
    </>
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
