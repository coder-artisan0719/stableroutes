import { PageSkeleton } from "@/components/page-skeleton";

// Shown while any /dashboard page fetches its server data.
export default function DashboardLoading() {
  return <PageSkeleton />;
}
