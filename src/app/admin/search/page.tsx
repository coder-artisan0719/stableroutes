import { requireAdmin } from "@/lib/auth-guards";
import { SmartSearchClient } from "./search-client";

export const metadata = { title: "Search" };

export default async function AdminSearchPage() {
  await requireAdmin();
  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold tracking-tight">
          Smart search
        </h1>
        <p className="mt-1 text-muted-foreground">
          Search across transactions, customers, profiles and tasks in plain
          English. The query is parsed by AI into structured filters — you can
          combine amounts, statuses and time windows in one sentence.
        </p>
      </div>
      <SmartSearchClient />
    </div>
  );
}
