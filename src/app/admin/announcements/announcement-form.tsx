"use client";

import { useState, useTransition } from "react";
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
import { sendAnnouncement } from "../actions";

type AnnouncementType = "FEATURE" | "MAINTENANCE" | "GENERAL";

const TYPE_OPTIONS: { value: AnnouncementType; label: string }[] = [
  { value: "FEATURE", label: "New feature" },
  { value: "MAINTENANCE", label: "Scheduled maintenance" },
  { value: "GENERAL", label: "General announcement" },
];

export function AnnouncementForm({
  recipientCount,
}: {
  recipientCount: number;
}) {
  const [type, setType] = useState<AnnouncementType>("FEATURE");
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [when, setWhen] = useState("");
  const [pending, startTransition] = useTransition();

  const canSend =
    subject.trim().length >= 3 && message.trim().length >= 10 && !pending;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (recipientCount === 0) {
      toast.error("There are no customers to email yet.");
      return;
    }
    if (
      !confirm(
        `Send this announcement by email to all ${recipientCount} customer${
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
      } else {
        toast.error(res.error);
      }
    });
  };

  return (
    <Card>
      <CardContent className="pt-6">
        <form onSubmit={submit} className="space-y-5">
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
              Send to all customers
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
