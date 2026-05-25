"use client";

import { Pagination } from "@/components/ui/pagination";
import { DEFAULT_PAGE_SIZE, type PageSize } from "@/lib/page-size";

/**
 * Client wrapper that builds the page-link href on the client. Needed because
 * `Pagination` is a client component and cannot receive an `hrefFor` function
 * prop from a server component.
 */
export function SignInsPagination({
  page,
  totalPages,
  pageSize,
  q,
  loc,
}: {
  page: number;
  totalPages: number;
  pageSize: PageSize;
  q?: string;
  loc?: string;
}) {
  const hrefFor = (p: number) => {
    const params = new URLSearchParams();
    if (q) params.set("q", q);
    if (loc) params.set("loc", loc);
    if (p > 1) params.set("page", String(p));
    if (pageSize !== DEFAULT_PAGE_SIZE) {
      params.set("pageSize", String(pageSize));
    }
    const qs = params.toString();
    return qs ? `/admin/sign-ins?${qs}` : "/admin/sign-ins";
  };
  return <Pagination page={page} totalPages={totalPages} hrefFor={hrefFor} />;
}
