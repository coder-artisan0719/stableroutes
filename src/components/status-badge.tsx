import { Badge } from "@/components/ui/badge";
import {
  CalendarClock,
  Check,
  Clock,
  Undo2,
  ShieldCheck,
  ShieldAlert,
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
  return (
    <Badge variant="warning">
      <Clock className="h-3 w-3" /> Pending
    </Badge>
  );
}

export function ProfileStatusBadge({ status }: { status: ProfileStatus }) {
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
      <ShieldAlert className="h-3 w-3" /> Pending review
    </Badge>
  );
}
