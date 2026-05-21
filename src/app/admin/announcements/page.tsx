import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth-guards";
import { AnnouncementForm } from "./announcement-form";

export const metadata = { title: "Announcements" };

export default async function AdminAnnouncementsPage() {
  await requireAdmin();
  const recipientCount = await prisma.user.count({
    where: { role: "CUSTOMER", blocked: false },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold tracking-tight">
          Announcements
        </h1>
        <p className="mt-1 text-muted-foreground">
          Email every customer about a new feature or scheduled maintenance.
          Blocked accounts are skipped.
        </p>
      </div>
      <AnnouncementForm recipientCount={recipientCount} />
    </div>
  );
}
