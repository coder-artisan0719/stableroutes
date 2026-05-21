import { Skeleton } from "@/components/ui/skeleton";

/**
 * Generic route-level loading placeholder, shown by `loading.tsx` while a
 * dashboard or admin page fetches its data. Renders inside the panel shell, so
 * the sidebar and header stay put and only the content area animates.
 */
export function PageSkeleton() {
  return (
    <div className="space-y-6">
      {/* Page title + description */}
      <div className="space-y-2.5">
        <Skeleton className="h-8 w-52" />
        <Skeleton className="h-4 w-72" />
      </div>

      {/* Stat-card row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton key={i} className="h-24 w-full rounded-xl" />
        ))}
      </div>

      {/* Main content block (table / cards / form) */}
      <Skeleton className="h-80 w-full rounded-xl" />
    </div>
  );
}
