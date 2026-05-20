"use client";

import { useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/ui/password-input";
import { Separator } from "@/components/ui/separator";
import { passwordUpdateSchema } from "@/lib/validators";
import { updateAccountName, updatePassword } from "../actions";
import type { z } from "zod";

type PasswordInput = z.infer<typeof passwordUpdateSchema>;

export function SettingsForms({
  user,
}: {
  user: { id: string; name: string | null; email: string };
}) {
  return (
    <div className="space-y-8">
      <NameForm user={user} />
      <Separator />
      <PasswordForm />
    </div>
  );
}

function NameForm({ user }: { user: { name: string | null; email: string } }) {
  const [name, setName] = useState(user.name ?? "");
  const [pending, startTransition] = useTransition();

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        startTransition(async () => {
          const res = await updateAccountName(name);
          if (res.ok) toast.success("Name updated");
          else toast.error(res.error);
        });
      }}
      className="grid gap-4 md:grid-cols-2"
    >
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input id="email" value={user.email} disabled />
      </div>
      <div className="space-y-2">
        <Label htmlFor="name">Display name</Label>
        <Input
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          minLength={2}
        />
      </div>
      <div className="md:col-span-2">
        <Button type="submit" disabled={pending || name.trim() === (user.name ?? "")}>
          {pending && <Loader2 className="animate-spin" />} Save
        </Button>
      </div>
    </form>
  );
}

function PasswordForm() {
  const [pending, startTransition] = useTransition();
  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<PasswordInput>({ resolver: zodResolver(passwordUpdateSchema) });

  const onSubmit = handleSubmit((data) => {
    startTransition(async () => {
      const res = await updatePassword(data);
      if (res.ok) {
        toast.success("Password updated");
        reset();
      } else {
        toast.error(res.error);
      }
    });
  });

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <h3 className="text-sm font-semibold">Password</h3>
      <div className="grid gap-4 md:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="current">Current</Label>
          <PasswordInput id="current" autoComplete="current-password" {...register("current")} />
          {errors.current && (
            <p className="text-xs text-destructive">{errors.current.message}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="next">New</Label>
          <PasswordInput id="next" autoComplete="new-password" {...register("next")} />
          {errors.next && (
            <p className="text-xs text-destructive">{errors.next.message}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="confirm">Confirm</Label>
          <PasswordInput id="confirm" autoComplete="new-password" {...register("confirm")} />
          {errors.confirm && (
            <p className="text-xs text-destructive">{errors.confirm.message}</p>
          )}
        </div>
      </div>
      <Button type="submit" disabled={pending}>
        {pending && <Loader2 className="animate-spin" />} Update password
      </Button>
    </form>
  );
}
