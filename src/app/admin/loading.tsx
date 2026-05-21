import { PageSkeleton } from "@/components/page-skeleton";

// Shown while any /admin page fetches its server data.
export default function AdminLoading() {
  return <PageSkeleton />;
}
