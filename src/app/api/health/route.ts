import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * Lightweight DB ping. Point a free external uptime monitor (UptimeRobot,
 * cron-job.org, BetterStack, …) at this URL every ~4 minutes to keep the
 * Neon free-tier compute from auto-suspending — that suspension is what
 * causes the multi-second "cold start" on the first request after idle.
 */
export async function GET() {
  const startedAt = Date.now();
  try {
    await prisma.$queryRaw`SELECT 1`;
    return NextResponse.json({ ok: true, dbMs: Date.now() - startedAt });
  } catch {
    return NextResponse.json({ ok: false }, { status: 503 });
  }
}
