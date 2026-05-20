"use client";

import Link from "next/link";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

function range(start: number, end: number) {
  const out: number[] = [];
  for (let i = start; i <= end; i++) out.push(i);
  return out;
}

function pageWindow(page: number, total: number) {
  if (total <= 7) return range(1, total);
  if (page <= 4) return [1, 2, 3, 4, 5, -1, total];
  if (page >= total - 3) return [1, -1, total - 4, total - 3, total - 2, total - 1, total];
  return [1, -1, page - 1, page, page + 1, -1, total];
}

export function Pagination({
  page,
  totalPages,
  hrefFor,
}: {
  page: number;
  totalPages: number;
  hrefFor: (page: number) => string;
}) {
  if (totalPages <= 1) return null;
  const items = pageWindow(page, totalPages);
  const prevDisabled = page <= 1;
  const nextDisabled = page >= totalPages;

  return (
    <nav className="flex items-center justify-center gap-1" aria-label="Pagination">
      <Link
        href={hrefFor(Math.max(1, page - 1))}
        aria-disabled={prevDisabled}
        tabIndex={prevDisabled ? -1 : 0}
        className={cn(
          "inline-flex h-9 w-9 items-center justify-center rounded-md border text-sm transition-colors",
          prevDisabled
            ? "pointer-events-none opacity-40"
            : "hover:bg-accent hover:text-accent-foreground",
        )}
        aria-label="Previous page"
      >
        <ChevronLeft className="h-4 w-4" />
      </Link>
      {items.map((it, i) =>
        it === -1 ? (
          <span
            key={`gap-${i}`}
            className="px-2 text-sm text-muted-foreground"
            aria-hidden
          >
            …
          </span>
        ) : (
          <Link
            key={it}
            href={hrefFor(it)}
            aria-current={it === page ? "page" : undefined}
            className={cn(
              "inline-flex h-9 min-w-9 items-center justify-center rounded-md border px-2 text-sm transition-colors",
              it === page
                ? "border-primary/40 bg-primary/10 font-medium text-primary"
                : "hover:bg-accent hover:text-accent-foreground",
            )}
          >
            {it}
          </Link>
        ),
      )}
      <Link
        href={hrefFor(Math.min(totalPages, page + 1))}
        aria-disabled={nextDisabled}
        tabIndex={nextDisabled ? -1 : 0}
        className={cn(
          "inline-flex h-9 w-9 items-center justify-center rounded-md border text-sm transition-colors",
          nextDisabled
            ? "pointer-events-none opacity-40"
            : "hover:bg-accent hover:text-accent-foreground",
        )}
        aria-label="Next page"
      >
        <ChevronRight className="h-4 w-4" />
      </Link>
    </nav>
  );
}
