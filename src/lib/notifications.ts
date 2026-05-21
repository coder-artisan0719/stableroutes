import { prisma } from "@/lib/prisma";

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
