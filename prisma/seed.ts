import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const adminEmail = (process.env.ADMIN_EMAIL ?? "admin@stableroute.io").toLowerCase();
  const adminPassword = process.env.ADMIN_PASSWORD ?? "Admin12345!";
  const passwordHash = await bcrypt.hash(adminPassword, 12);

  const admin = await prisma.user.upsert({
    where: { email: adminEmail },
    update: { passwordHash, role: "ADMIN" },
    create: {
      email: adminEmail,
      name: "StableRoute Admin",
      role: "ADMIN",
      passwordHash,
    },
  });

  console.log(`✓ Admin ready: ${admin.email}`);

  // Demo customer (only created if missing — safe to re-run).
  const demoEmail = "demo@stableroute.io";
  const existing = await prisma.user.findUnique({ where: { email: demoEmail } });
  if (!existing) {
    const demo = await prisma.user.create({
      data: {
        email: demoEmail,
        name: "Demo Customer",
        role: "CUSTOMER",
        passwordHash: await bcrypt.hash("Demo12345!", 12),
      },
    });

    const profile = await prisma.customerProfile.create({
      data: {
        userId: demo.id,
        firstName: "Acme",
        lastName: "Industries",
        senderName: "Acme Industries LLC",
        withdrawalAddress: "0x9F2c0a1e0f3b88b6F2d7A1c91E0aE3a4D2B5cE31",
        status: "APPROVED",
        approvedAt: new Date(),
        approvedById: admin.id,
      },
    });

    await prisma.transaction.createMany({
      data: [
        {
          userId: demo.id,
          profileId: profile.id,
          amountCents: 1_250_000,
          type: "WIRE",
          status: "COMPLETED",
          senderName: "Globex Corp",
          completedAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        },
        {
          userId: demo.id,
          profileId: profile.id,
          amountCents: 482_000,
          type: "ACH",
          status: "PENDING",
          senderName: "Initech",
        },
        {
          userId: demo.id,
          profileId: profile.id,
          amountCents: 89_900,
          type: "ACH",
          status: "REFUNDED",
          senderName: "Soylent Inc",
          refundReason: "Sender requested reversal — funds returned.",
          refundedAt: new Date(Date.now() - 12 * 60 * 60 * 1000),
        },
      ],
    });
    console.log(`✓ Demo customer ready: ${demo.email} / Demo12345!`);
  } else {
    console.log(`✓ Demo customer already exists: ${demoEmail}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
