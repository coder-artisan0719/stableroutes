"use client";

import { useState } from "react";
import { Check, Copy } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

/** Read-only referral link with a copy-to-clipboard button. */
export function ReferralLinkBox({
  link,
  code,
}: {
  link: string;
  code: string;
}) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    await navigator.clipboard.writeText(link);
    setCopied(true);
    toast.success("Referral link copied");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-2">
      <div className="flex flex-col gap-2 sm:flex-row">
        <Input
          value={link}
          readOnly
          onFocus={(e) => e.currentTarget.select()}
          className="font-mono text-xs"
          aria-label="Your referral link"
        />
        <Button onClick={copy} className="shrink-0">
          {copied ? (
            <Check className="h-4 w-4" />
          ) : (
            <Copy className="h-4 w-4" />
          )}
          {copied ? "Copied" : "Copy link"}
        </Button>
      </div>
      <p className="text-xs text-muted-foreground">
        Referral code:{" "}
        <span className="font-mono font-medium text-foreground">{code}</span>
      </p>
    </div>
  );
}
