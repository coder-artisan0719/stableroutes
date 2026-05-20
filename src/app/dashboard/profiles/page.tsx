import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireCustomer } from "@/lib/auth-guards";
import { parsePageSize } from "@/lib/page-size";
import { ProfilesClient } from "./profiles-client";

export const metadata = { title: "Profiles" };

const ALLOWED_STATUS = ["PENDING", "APPROVED"] as const;
const ALLOWED_SORT = ["newest", "oldest", "name"] as const;
const ALLOWED_VIEW = ["grid", "table"] as const;

type ProfilesSearch = {
  q?: string;
  status?: string;
  sort?: string;
  view?: string;
  page?: string;
  pageSize?: string;
};

export default async function ProfilesPage({
  searchParams,
}: {
  searchParams: ProfilesSearch;
}) {
  const session = await requireCustomer();
  const userId = session.user.id;

  const q = (searchParams.q ?? "").trim();
  const status = (ALLOWED_STATUS as readonly string[]).includes(searchParams.status ?? "")
    ? (searchParams.status as (typeof ALLOWED_STATUS)[number])
    : undefined;
  const sort = (ALLOWED_SORT as readonly string[]).includes(searchParams.sort ?? "")
    ? (searchParams.sort as (typeof ALLOWED_SORT)[number])
    : "newest";
  const view = (ALLOWED_VIEW as readonly string[]).includes(searchParams.view ?? "")
    ? (searchParams.view as (typeof ALLOWED_VIEW)[number])
    : "grid";
  const pageSize = parsePageSize(searchParams.pageSize);
  const page = Math.max(1, parseInt(searchParams.page ?? "1", 10) || 1);

  const where: Prisma.CustomerProfileWhereInput = {
    userId,
    ...(status ? { status } : {}),
    ...(q
      ? {
          OR: [
            { firstName: { contains: q, mode: "insensitive" } },
            { lastName: { contains: q, mode: "insensitive" } },
            { senderName: { contains: q, mode: "insensitive" } },
            { withdrawalAddress: { contains: q, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const orderBy: Prisma.CustomerProfileOrderByWithRelationInput =
    sort === "oldest"
      ? { createdAt: "asc" }
      : sort === "name"
        ? { firstName: "asc" }
        : { createdAt: "desc" };

  const [profiles, total, statusCounts] = await Promise.all([
    prisma.customerProfile.findMany({
      where,
      orderBy,
      take: pageSize,
      skip: (page - 1) * pageSize,
    }),
    prisma.customerProfile.count({ where }),
    prisma.customerProfile.groupBy({
      by: ["status"],
      where: { userId },
      _count: true,
    }),
  ]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const counts = {
    all: statusCounts.reduce((sum, c) => sum + c._count, 0),
    pending: statusCounts.find((c) => c.status === "PENDING")?._count ?? 0,
    approved: statusCounts.find((c) => c.status === "APPROVED")?._count ?? 0,
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold tracking-tight">Profiles</h1>
        <p className="mt-1 text-muted-foreground">
          Each profile carries its own sender name and USDC (Base) withdrawal address.
          You can create as many as you need.
        </p>
      </div>
      <ProfilesClient
        profiles={profiles}
        total={total}
        page={page}
        totalPages={totalPages}
        pageSize={pageSize}
        counts={counts}
        query={{ q, status, sort, view }}
      />
    </div>
  );
}
