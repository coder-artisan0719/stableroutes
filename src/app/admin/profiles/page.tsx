import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth-guards";
import { parsePageSize } from "@/lib/page-size";
import { AdminProfilesClient } from "./profiles-client";

export const metadata = { title: "Profile reviews" };

const ALLOWED_STATUS = ["PENDING", "APPROVED", "REJECTED"] as const;
const ALLOWED_VIEW = ["grid", "table"] as const;

export default async function AdminProfilesPage({
  searchParams,
}: {
  searchParams: {
    status?: string;
    page?: string;
    pageSize?: string;
    view?: string;
    q?: string;
  };
}) {
  await requireAdmin();

  const status = (ALLOWED_STATUS as readonly string[]).includes(searchParams.status ?? "")
    ? (searchParams.status as (typeof ALLOWED_STATUS)[number])
    : "PENDING";
  const view = (ALLOWED_VIEW as readonly string[]).includes(searchParams.view ?? "")
    ? (searchParams.view as (typeof ALLOWED_VIEW)[number])
    : "table";
  const pageSize = parsePageSize(searchParams.pageSize);
  const page = Math.max(1, parseInt(searchParams.page ?? "1", 10) || 1);
  const q = (searchParams.q ?? "").trim();

  // Status is the primary filter; q is an additional contains-match across
  // name / sender / bank / withdrawal address / customer email.
  const where = q
    ? {
        status,
        OR: [
          { firstName: { contains: q, mode: "insensitive" as const } },
          { lastName: { contains: q, mode: "insensitive" as const } },
          { senderName: { contains: q, mode: "insensitive" as const } },
          { bankName: { contains: q, mode: "insensitive" as const } },
          { withdrawalAddress: { contains: q, mode: "insensitive" as const } },
          {
            user: {
              email: { contains: q, mode: "insensitive" as const },
            },
          },
        ],
      }
    : { status };

  const [profiles, total, counts] = await Promise.all([
    prisma.customerProfile.findMany({
      where,
      orderBy: status === "PENDING" ? { createdAt: "asc" } : { createdAt: "desc" },
      take: pageSize,
      skip: (page - 1) * pageSize,
      include: { user: { select: { email: true, name: true } } },
    }),
    prisma.customerProfile.count({ where }),
    prisma.customerProfile.groupBy({ by: ["status"], _count: true }),
  ]);

  const pendingCount = counts.find((c) => c.status === "PENDING")?._count ?? 0;
  const approvedCount = counts.find((c) => c.status === "APPROVED")?._count ?? 0;
  const rejectedCount = counts.find((c) => c.status === "REJECTED")?._count ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold tracking-tight">
          Profile reviews
        </h1>
        <p className="mt-1 text-muted-foreground">
          Approve or hold customer profiles before they can receive transfers.
        </p>
      </div>
      <AdminProfilesClient
        profiles={profiles.map((p) => ({
          ...p,
          userEmail: p.user.email,
          userName: p.user.name,
        }))}
        active={status}
        view={view}
        pendingCount={pendingCount}
        approvedCount={approvedCount}
        rejectedCount={rejectedCount}
        page={page}
        totalPages={totalPages}
        pageSize={pageSize}
        total={total}
        query={q}
      />
    </div>
  );
}
