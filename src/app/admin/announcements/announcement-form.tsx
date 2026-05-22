"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Loader2, Send, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { sendAnnouncement } from "../actions";

type AnnouncementType = "FEATURE" | "MAINTENANCE" | "GENERAL";
type Customer = { id: string; email: string; name: string | null };

export type AnnouncementPrefill = {
  type: AnnouncementType;
  subject: string;
  message: string;
};

const TYPE_OPTIONS: { value: AnnouncementType; label: string }[] = [
  { value: "FEATURE", label: "New feature" },
  { value: "MAINTENANCE", label: "Scheduled maintenance" },
  { value: "GENERAL", label: "General announcement" },
];

export function AnnouncementForm({
  customers,
  prefill,
}: {
  customers: Customer[];
  prefill?: AnnouncementPrefill | null;
}) {
  const router = useRouter();
  const [type, setType] = useState<AnnouncementType>(
    prefill?.type ?? "FEATURE",
  );
  const [subject, setSubject] = useState(prefill?.subject ?? "");
  const [message, setMessage] = useState(prefill?.message ?? "");
  const [when, setWhen] = useState("");
  const [recipientMode, setRecipientMode] = useState<"all" | "selected">("all");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState("");
  const [pending, startTransition] = useTransition();

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return customers;
    return customers.filter(
      (c) =>
        c.email.toLowerCase().includes(q) ||
        (c.name ?? "").toLowerCase().includes(q),
    );
  }, [customers, search]);

  const recipientCount =
    recipientMode === "all" ? customers.length : selectedIds.size;

  const canSend =
    subject.trim().length >= 3 &&
    message.trim().length >= 10 &&
    recipientCount > 0 &&
    !pending;

  const toggle = (id: string) =>
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (recipientCount === 0) {
      toast.error(
        recipientMode === "selected"
          ? "Select at least one customer."
          : "There are no customers to email yet.",
      );
      return;
    }
    if (
      !confirm(
        `Send this announcement by email to ${recipientCount} customer${
          recipientCount === 1 ? "" : "s"
        }? This can't be undone.`,
      )
    )
      return;

    const scheduledLabel = when
      ? new Date(when).toLocaleString(undefined, {
          dateStyle: "long",
          timeStyle: "short",
        })
      : undefined;

    startTransition(async () => {
      const res = await sendAnnouncement({
        type,
        subject: subject.trim(),
        message: message.trim(),
        scheduledLabel,
        recipientIds:
          recipientMode === "selected" ? [...selectedIds] : undefined,
      });
      if (res.ok) {
        toast.success(
          `Announcement sent to ${res.sent} customer${
            res.sent === 1 ? "" : "s"
          }.`,
        );
        setSubject("");
        setMessage("");
        setWhen("");
        setSelectedIds(new Set());
        setRecipientMode("all");
        setSearch("");
        router.refresh();
      } else {
        toast.error(res.error);
      }
    });
  };

  return (
    <Card>
      <CardContent className="pt-6">
        <form onSubmit={submit} className="space-y-5">
          {prefill && (
            <p className="rounded-lg border border-primary/30 bg-primary/5 p-3 text-xs text-muted-foreground">
              Loaded from a previous announcement — review the content and
              choose recipients before sending.
            </p>
          )}
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="type">Announcement type</Label>
              <Select
                value={type}
                onValueChange={(v) => setType(v as AnnouncementType)}
              >
                <SelectTrigger id="type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TYPE_OPTIONS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="when">Date &amp; time (optional)</Label>
              <Input
                id="when"
                type="datetime-local"
                value={when}
                onChange={(e) => setWhen(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Add a maintenance window or feature launch time.
              </p>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="subject">Subject</Label>
            <Input
              id="subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              maxLength={160}
              placeholder="e.g. Scheduled maintenance this weekend"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="message">Message</Label>
            <Textarea
              id="message"
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              rows={8}
              maxLength={4000}
              placeholder="Write the announcement customers will receive. Blank lines start a new paragraph."
            />
            <p className="text-xs text-muted-foreground">
              {message.trim().length}/4000 characters
            </p>
          </div>

          <div className="space-y-2">
            <Label>Recipients</Label>
            <div className="inline-flex rounded-lg border bg-card p-0.5">
              {(["all", "selected"] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setRecipientMode(m)}
                  className={cn(
                    "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                    recipientMode === m
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:bg-accent",
                  )}
                >
                  {m === "all"
                    ? `All customers (${customers.length})`
                    : "Specific customers"}
                </button>
              ))}
            </div>

            {recipientMode === "selected" && (
              <div className="rounded-lg border">
                <div className="border-b p-2">
                  <Input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search customers by name or email…"
                    className="h-9"
                  />
                </div>
                <ul className="max-h-56 overflow-y-auto p-1">
                  {filtered.length === 0 ? (
                    <li className="px-2 py-4 text-center text-sm text-muted-foreground">
                      No customers match.
                    </li>
                  ) : (
                    filtered.map((c) => (
                      <li key={c.id}>
                        <label className="flex cursor-pointer items-center gap-2.5 rounded-md px-2 py-1.5 hover:bg-accent">
                          <input
                            type="checkbox"
                            checked={selectedIds.has(c.id)}
                            onChange={() => toggle(c.id)}
                            className="h-4 w-4 cursor-pointer accent-primary"
                          />
                          <span className="min-w-0">
                            <span className="block truncate text-sm font-medium">
                              {c.name ?? c.email.split("@")[0]}
                            </span>
                            <span className="block truncate text-xs text-muted-foreground">
                              {c.email}
                            </span>
                          </span>
                        </label>
                      </li>
                    ))
                  )}
                </ul>
                <div className="border-t px-3 py-1.5 text-xs text-muted-foreground">
                  {selectedIds.size} selected
                </div>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-3 border-t pt-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="inline-flex items-center gap-1.5 text-sm text-muted-foreground">
              <Users className="h-4 w-4" />
              Sends to{" "}
              <strong className="text-foreground">
                {recipientCount} customer{recipientCount === 1 ? "" : "s"}
              </strong>
            </p>
            <Button type="submit" disabled={!canSend}>
              {pending ? (
                <Loader2 className="animate-spin" />
              ) : (
                <Send className="h-4 w-4" />
              )}
              Send announcement
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
