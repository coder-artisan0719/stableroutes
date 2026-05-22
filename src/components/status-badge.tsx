import { Badge } from "@/components/ui/badge";
import {
  CalendarClock,
  Check,
  Clock,
  Undo2,
  ShieldCheck,
  ShieldAlert,
  XCircle,
} from "lucide-react";
import type { TransactionStatus, ProfileStatus } from "@prisma/client";

export function TransactionStatusBadge({ status }: { status: TransactionStatus }) {
  if (status === "COMPLETED") {
    return (
      <Badge variant="success">
        <Check className="h-3 w-3" /> Completed
      </Badge>
    );
  }
  if (status === "REFUNDED") {
    return (
      <Badge variant="destructive">
        <Undo2 className="h-3 w-3" /> Refunded
      </Badge>
    );
  }
  if (status === "SCHEDULED") {
    return (
      <Badge variant="default">
        <CalendarClock className="h-3 w-3" /> Scheduled
      </Badge>
    );
  }
  if (status === "CANCELLED") {
    return (
      <Badge variant="outline">
        <XCircle className="h-3 w-3" /> Cancelled
      </Badge>
    );
  }
  return (
    <Badge variant="warning">
      <Clock className="h-3 w-3" /> Pending
    </Badge>
  );
}

export function ProfileStatusBadge({
  status,
  pendingKind,
}: {
  status: ProfileStatus;
  /**
   * For PENDING profiles, whether this is a brand-new profile awaiting first
   * approval ("new") or a previously-approved profile whose withdrawal address
   * was changed and now needs re-approval ("update").
   */
  pendingKind?: "new" | "update";
}) {
  if (status === "APPROVED") {
    return (
      <Badge variant="success">
        <ShieldCheck className="h-3 w-3" /> Approved
      </Badge>
    );
  }
  if (status === "REJECTED") {
    return (
      <Badge variant="destructive">
        <ShieldAlert className="h-3 w-3" /> Rejected
      </Badge>
    );
  }
  return (
    <Badge variant="warning">
      <Clock className="h-3 w-3" />
      {pendingKind === "update" ? "Address update" : "Pending"}
    </Badge>
  );
}
