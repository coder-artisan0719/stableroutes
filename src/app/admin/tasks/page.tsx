import type { AdminTaskCategory, Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth-guards";
import { adminTaskCategoryValues } from "@/lib/validators";
import { TasksClient } from "./tasks-client";

export const metadata = { title: "Tasks" };

const STATUS_VALUES = ["ALL", "OPEN", "SNOOZED", "RESOLVED", "OVERDUE"] as const;

export default async function AdminTasksPage({
  searchParams,
}: {
  searchParams: { status?: string; category?: string };
}) {
  await requireAdmin();

  const raw = (searchParams.status ?? "OPEN").toUpperCase();
  const status = (STATUS_VALUES as readonly string[]).includes(raw)
    ? (raw as (typeof STATUS_VALUES)[number])
    : "OPEN";

  const rawCategory = searchParams.category?.toUpperCase();
  const category = (adminTaskCategoryValues as readonly string[]).includes(
    rawCategory ?? "",
  )
    ? (rawCategory as AdminTaskCategory)
    : null;

  const statusWhere: Prisma.AdminTaskWhereInput =
    status === "ALL"
      ? {}
      : status === "OVERDUE"
        ? { status: "OPEN", dueAt: { lt: new Date() } }
        : { status: status as "OPEN" | "SNOOZED" | "RESOLVED" };
  const where: Prisma.AdminTaskWhereInput = category
    ? { ...statusWhere, category }
    : statusWhere;

  const [tasks, counts, customers, profiles, transactions] = await Promise.all([
    prisma.adminTask.findMany({
      where,
      orderBy: [
        // Open tasks: surface URGENT/HIGH first, then earliest due.
        { priority: "desc" },
        { dueAt: "asc" },
        { createdAt: "desc" },
      ],
      take: 300,
      include: {
        customer: { select: { id: true, email: true, blocked: true, telegramId: true } },
        profile: { select: { id: true, firstName: true, lastName: true } },
        transaction: {
          select: {
            id: true,
            amountCents: true,
            status: true,
            reference: true,
          },
        },
        createdBy: { select: { name: true, email: true } },
        resolvedBy: { select: { name: true, email: true } },
      },
    }),
    prisma.adminTask.groupBy({
      by: ["status"],
      _count: true,
    }),
    prisma.user.findMany({
      where: { role: "CUSTOMER" },
      orderBy: { email: "asc" },
      select: { id: true, email: true, name: true, blocked: true },
    }),
    prisma.customerProfile.findMany({
      orderBy: [{ user: { email: "asc" } }, { firstName: "asc" }],
      select: {
        id: true,
        firstName: true,
        lastName: true,
        userId: true,
        status: true,
      },
    }),
    prisma.transaction.findMany({
      where: { status: { in: ["PENDING", "SCHEDULED"] } },
      orderBy: { createdAt: "desc" },
      take: 200,
      select: {
        id: true,
        reference: true,
        amountCents: true,
        senderName: true,
        status: true,
        createdAt: true,
        userId: true,
        profileId: true,
        user: { select: { email: true } },
        profile: { select: { firstName: true, lastName: true } },
      },
    }),
  ]);

  const [overdueCount, categoryCounts] = await Promise.all([
    prisma.adminTask.count({
      where: { status: "OPEN", dueAt: { lt: new Date() } },
    }),
    // Uncompleted = OPEN or SNOOZED. Seeded with zero for every category so
    // the client can render a stable order even when a category has no tasks.
    prisma.adminTask.groupBy({
      by: ["category"],
      where: { status: { in: ["OPEN", "SNOOZED"] } },
      _count: { _all: true },
    }),
  ]);

  const map = Object.fromEntries(counts.map((c) => [c.status, c._count]));
  const total = counts.reduce((acc, c) => acc + c._count, 0);

  const categoryCountMap = Object.fromEntries(
    categoryCounts.map((c) => [c.category, c._count._all]),
  ) as Record<AdminTaskCategory, number>;
  const categoryCountsRecord = Object.fromEntries(
    adminTaskCategoryValues.map((k) => [k, categoryCountMap[k] ?? 0]),
  ) as Record<AdminTaskCategory, number>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold tracking-tight">
          Tasks
        </h1>
        <p className="mt-1 text-muted-foreground">
          The admin follow-up queue. Track payments held pending confirmation,
          restricted-account reviews, profile reviews and other reminders so
          nothing falls through the cracks.
        </p>
      </div>

      <TasksClient
        tasks={tasks.map((t) => ({
          id: t.id,
          title: t.title,
          category: t.category,
          status: t.status,
          priority: t.priority,
          customerId: t.customerId,
          profileId: t.profileId,
          transactionId: t.transactionId,
          customerEmail:
            t.customer?.email ?? t.customerEmail ?? null,
          customerBlocked: t.customer?.blocked ?? null,
          customerTelegramId: t.customer?.telegramId ?? null,
          profileName:
            t.profile
              ? `${t.profile.firstName} ${t.profile.lastName}`
              : t.profileName,
          transactionRef: t.transaction?.reference ?? null,
          amountCents: t.amountCents,
          paidAt: t.paidAt ? t.paidAt.toISOString() : null,
          dueAt: t.dueAt ? t.dueAt.toISOString() : null,
          snoozedUntil: t.snoozedUntil ? t.snoozedUntil.toISOString() : null,
          reason: t.reason,
          notes: t.notes,
          autoGenerated: t.autoGenerated,
          createdAt: t.createdAt.toISOString(),
          resolvedAt: t.resolvedAt ? t.resolvedAt.toISOString() : null,
          createdByLabel:
            t.createdBy?.name ?? t.createdBy?.email ?? null,
          resolvedByLabel:
            t.resolvedBy?.name ?? t.resolvedBy?.email ?? null,
        }))}
        customers={customers}
        profiles={profiles.map((p) => ({
          id: p.id,
          userId: p.userId,
          label: `${p.firstName} ${p.lastName}`,
          status: p.status,
        }))}
        transactions={transactions.map((t) => ({
          id: t.id,
          reference: t.reference,
          amountCents: t.amountCents,
          senderName: t.senderName,
          status: t.status,
          createdAt: t.createdAt.toISOString(),
          userId: t.userId,
          profileId: t.profileId,
          userEmail: t.user.email,
          profileLabel: `${t.profile.firstName} ${t.profile.lastName}`,
        }))}
        active={status}
        activeCategory={category}
        categoryCounts={categoryCountsRecord}
        counts={{
          ALL: total,
          OPEN: map.OPEN ?? 0,
          SNOOZED: map.SNOOZED ?? 0,
          RESOLVED: map.RESOLVED ?? 0,
          OVERDUE: overdueCount,
        }}
      />
    </div>
  );
}
