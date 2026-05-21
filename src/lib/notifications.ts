import { prisma } from "@/lib/prisma";

/**
 * Loads a user's in-app notifications for the header bell. Resilient by design:
 * if the query fails (e.g. the IN_APP columns haven't been migrated yet) it
 * returns an empty result instead of throwing, so a pending migration can
 * never take down the dashboard or admin layout.
 */
export async function getInAppNotifications(userId: string) {
  try {
    const [rows, unreadCount] = await Promise.all([
      prisma.notification.findMany({
        where: { userId, channel: "IN_APP" },
        orderBy: { createdAt: "desc" },
        take: 15,
        select: {
          id: true,
          subject: true,
          body: true,
          url: true,
          readAt: true,
          createdAt: true,
        },
      }),
      prisma.notification.count({
        where: { userId, channel: "IN_APP", readAt: null },
      }),
    ]);
    return {
      items: rows.map((n) => ({
        id: n.id,
        title: n.subject,
        message: n.body,
        url: n.url,
        read: n.readAt !== null,
        createdAt: n.createdAt,
      })),
      unreadCount,
    };
  } catch (err) {
    console.error(
      "[notifications] in-app query failed — is the database migrated?",
      err,
    );
    return { items: [], unreadCount: 0 };
  }
}

/**
 * Records an in-app notification for a customer (shown in the dashboard
 * notification bell). Errors are swallowed and logged so a notification
 * hiccup never breaks the admin action that triggered it.
 */
export async function createCustomerNotification(args: {
  userId: string;
  title: string;
  message: string;
  url?: string;
}) {
  try {
    await prisma.notification.create({
      data: {
        userId: args.userId,
        channel: "IN_APP",
        subject: args.title,
        body: args.message,
        url: args.url ?? null,
      },
    });
  } catch (err) {
    console.error("[notification] failed to create in-app notification:", err);
  }
}

/**
 * Records an in-app notification for every admin user (e.g. a new profile
 * submission or a withdrawal-address change request). Errors are swallowed.
 */
export async function createAdminNotification(args: {
  title: string;
  message: string;
  url?: string;
}) {
  try {
    const admins = await prisma.user.findMany({
      where: { role: "ADMIN" },
      select: { id: true },
    });
    if (admins.length === 0) return;
    await prisma.notification.createMany({
      data: admins.map((admin) => ({
        userId: admin.id,
        channel: "IN_APP" as const,
        subject: args.title,
        body: args.message,
        url: args.url ?? null,
      })),
    });
  } catch (err) {
    console.error("[notification] failed to create admin notifications:", err);
  }
}
