"use client";

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { PAGE_SIZE_OPTIONS, type PageSize } from "@/lib/page-size";

export function PageSizeSelector({
  value,
  onChange,
}: {
  value: PageSize;
  onChange: (v: PageSize) => void;
}) {
  return (
    <div className="inline-flex items-center gap-2 text-sm text-muted-foreground">
      <span className="hidden sm:inline">Show</span>
      <Select value={String(value)} onValueChange={(v) => onChange(Number(v) as PageSize)}>
        <SelectTrigger className="h-9 w-[80px]">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {PAGE_SIZE_OPTIONS.map((n) => (
            <SelectItem key={n} value={String(n)}>
              {n}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <span>per page</span>
    </div>
  );
}
