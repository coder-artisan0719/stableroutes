"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { Announcement, AnnouncementType } from "@prisma/client";
import { toast } from "sonner";
import { ListChecks, Loader2, RotateCcw, Trash2, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatDateTime } from "@/lib/utils";
import { adminDeleteAnnouncements } from "../actions";
import {
  AnnouncementForm,
  type AnnouncementPrefill,
} from "./announcement-form";

type Customer = { id: string; email: string; name: string | null };

const TYPE_META: Record<
  AnnouncementType,
  { label: string; variant: "default" | "warning" | "outline" }
> = {
  FEATURE: { label: "New feature", variant: "default" },
  MAINTENANCE: { label: "Maintenance", variant: "warning" },
  GENERAL: { label: "General", variant: "outline" },
};

export function AnnouncementsClient({
  customers,
  announcements,
}: {
  customers: Customer[];
  announcements: Announcement[];
}) {
  const router = useRouter();
  const [prefill, setPrefill] = useState<AnnouncementPrefill | null>(null);
  // Bumped on each Resend so the form remounts and re-initialises from prefill.
  const [formKey, setFormKey] = useState(0);
  const [selectionMode, setSelectionMode] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [deletePending, startDeleteTransition] = useTransition();

  const allSelected =
    announcements.length > 0 && announcements.every((a) => selected.has(a.id));

  const resend = (a: Announcement) => {
    setPrefill({ type: a.type, subject: a.subject, message: a.message });
    setFormKey((k) => k + 1);
    if (typeof window !== "undefined") {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const toggleRow = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const toggleAll = () =>
    setSelected(
      allSelected ? new Set() : new Set(announcements.map((a) => a.id)),
    );

  const exitSelection = () => {
    setSelectionMode(false);
    setSelected(new Set());
  };

  const deleteSelected = () => {
    startDeleteTransition(async () => {
      const res = await adminDeleteAnnouncements([...selected]);
      if (res.ok) {
        toast.success(
          `${res.deleted} announcement${res.deleted === 1 ? "" : "s"} deleted.`,
        );
        setConfirmDelete(false);
        exitSelection();
        router.refresh();
      } else {
        toast.error(res.error);
      }
    });
  };

  return (
    <div className="space-y-6">
      <AnnouncementForm key={formKey} customers={customers} prefill={prefill} />

      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3">
          <CardTitle>Sent announcements</CardTitle>
          {announcements.length > 0 &&
            (selectionMode ? (
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground">
                  {selected.size} selected
                </span>
                <Button
                  variant="destructive"
                  size="sm"
                  disabled={selected.size === 0}
                  onClick={() => setConfirmDelete(true)}
                >
                  <Trash2 className="h-4 w-4" /> Delete
                </Button>
                <Button variant="outline" size="sm" onClick={exitSelection}>
                  <X className="h-4 w-4" /> Cancel
                </Button>
              </div>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectionMode(true)}
              >
                <ListChecks className="h-4 w-4" /> Select
              </Button>
            ))}
        </CardHeader>
        <CardContent>
          {announcements.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No announcements have been sent yet.
            </p>
          ) : (
            <>
              {selectionMode && (
                <label className="mb-3 flex w-fit cursor-pointer items-center gap-2 text-sm text-muted-foreground">
                  <input
                    type="checkbox"
                    checked={allSelected}
                    onChange={toggleAll}
                    className="h-4 w-4 cursor-pointer accent-primary"
                  />
                  Select all
                </label>
              )}
              <ul className="space-y-3">
                {announcements.map((a) => {
                  const meta = TYPE_META[a.type];
                  return (
                    <li key={a.id} className="rounded-lg border p-4">
                      <div className="flex gap-3">
                        {selectionMode && (
                          <input
                            type="checkbox"
                            checked={selected.has(a.id)}
                            onChange={() => toggleRow(a.id)}
                            aria-label="Select announcement"
                            className="mt-1 h-4 w-4 cursor-pointer accent-primary"
                          />
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <p className="font-medium">{a.subject}</p>
                              <p className="text-xs text-muted-foreground">
                                {formatDateTime(a.createdAt)} · sent to{" "}
                                {a.recipientCount} customer
                                {a.recipientCount === 1 ? "" : "s"}
                                {a.scheduledLabel
                                  ? ` · ${a.scheduledLabel}`
                                  : ""}
                              </p>
                            </div>
                            <div className="flex shrink-0 items-center gap-2">
                              <Badge variant={meta.variant}>{meta.label}</Badge>
                              {!selectionMode && (
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => resend(a)}
                                >
                                  <RotateCcw className="h-3.5 w-3.5" /> Resend
                                </Button>
                              )}
                            </div>
                          </div>
                          <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">
                            {a.message}
                          </p>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </>
          )}
        </CardContent>
      </Card>

      <Dialog
        open={confirmDelete}
        onOpenChange={(v) => !v && setConfirmDelete(false)}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Delete {selected.size} announcement
              {selected.size === 1 ? "" : "s"}?
            </DialogTitle>
            <DialogDescription>
              This removes {selected.size === 1 ? "it" : "them"} from your
              announcement history. Emails that were already sent are not
              affected. This can&apos;t be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setConfirmDelete(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={deleteSelected}
              disabled={deletePending}
            >
              {deletePending && <Loader2 className="animate-spin" />}
              <Trash2 className="h-4 w-4" /> Delete permanently
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
