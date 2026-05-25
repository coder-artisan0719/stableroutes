"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

/**
 * Two text filters for the admin sign-ins table — name/email (matches the
 * user's name, email, or any of their customer profile names) and location
 * (matches city / region / country). State lives in the URL so pagination
 * preserves it.
 */
export function SignInsFilter({ q, loc }: { q?: string; loc?: string }) {
  const router = useRouter();
  const [name, setName] = useState(q ?? "");
  const [location, setLocation] = useState(loc ?? "");

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (name.trim()) params.set("q", name.trim());
    if (location.trim()) params.set("loc", location.trim());
    const qs = params.toString();
    router.replace(qs ? `/admin/sign-ins?${qs}` : "/admin/sign-ins");
  };

  const clear = () => {
    setName("");
    setLocation("");
    router.replace("/admin/sign-ins");
  };

  const hasFilter = Boolean(q || loc);

  return (
    <form
      onSubmit={submit}
      className="flex flex-wrap items-end gap-3 rounded-lg border bg-card p-3"
    >
      <div className="space-y-1.5">
        <label
          htmlFor="si-q"
          className="block text-xs font-medium text-muted-foreground"
        >
          Name or email
        </label>
        <Input
          id="si-q"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="e.g. John, john@…"
          className="h-9 w-[220px]"
        />
      </div>
      <div className="space-y-1.5">
        <label
          htmlFor="si-loc"
          className="block text-xs font-medium text-muted-foreground"
        >
          Location
        </label>
        <Input
          id="si-loc"
          value={location}
          onChange={(e) => setLocation(e.target.value)}
          placeholder="e.g. London, France"
          className="h-9 w-[200px]"
        />
      </div>
      <Button type="submit" size="sm">
        Apply
      </Button>
      {hasFilter && (
        <Button type="button" variant="ghost" size="sm" onClick={clear}>
          <X className="h-3.5 w-3.5" /> Clear
        </Button>
      )}
    </form>
  );
}
