import type { Announcement } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth-guards";
import { AnnouncementsClient } from "./announcements-client";

export const metadata = { title: "Announcements" };

export default async function AdminAnnouncementsPage() {
  await requireAdmin();

  const customers = await prisma.user.findMany({
    where: { role: "CUSTOMER", blocked: false },
    orderBy: { createdAt: "desc" },
    select: { id: true, email: true, name: true },
  });

  // History of previously sent announcements. Resilient: if the table hasn't
  // been migrated yet, fall back to an empty list rather than crashing.
  let announcements: Announcement[] = [];
  try {
    announcements = await prisma.announcement.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
    });
  } catch (err) {
    console.error(
      "[announcements] history query failed — is the database migrated?",
      err,
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold tracking-tight">
          Announcements
        </h1>
        <p className="mt-1 text-muted-foreground">
          Email customers about a new feature or scheduled maintenance — all of
          them, or a specific selection. Blocked accounts are always skipped.
        </p>
      </div>
      <AnnouncementsClient customers={customers} announcements={announcements} />
    </div>
  );
}
