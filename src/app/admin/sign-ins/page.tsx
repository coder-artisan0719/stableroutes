import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireAdmin } from "@/lib/auth-guards";
import { parsePageSize } from "@/lib/page-size";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { formatDateTime } from "@/lib/utils";
import { formatLocation, geolocateIp } from "@/lib/login-events";
import { SignInsPagination } from "./sign-ins-pagination";
import { SignInsFilter } from "./sign-ins-filter";

export const metadata = { title: "Sign-in activity" };

/** A user is considered "active" if their most recent login was within this window. */
const ACTIVE_WINDOW_MS = 24 * 60 * 60 * 1000;

export default async function AdminSignInsPage({
  searchParams,
}: {
  searchParams: {
    page?: string;
    pageSize?: string;
    q?: string;
    loc?: string;
  };
}) {
  await requireAdmin();

  const pageSize = parsePageSize(searchParams.pageSize);
  const page = Math.max(1, parseInt(searchParams.page ?? "1", 10) || 1);
  const activeSince = new Date(Date.now() - ACTIVE_WINDOW_MS);

  const q = searchParams.q?.trim() || undefined;
  const loc = searchParams.loc?.trim() || undefined;
  const isFiltered = Boolean(q || loc);

  // Build the filter as an AND chain so name and location act as independent
  // constraints when both are set, each one OR-ing across the fields it spans.
  const conditions: Prisma.LoginEventWhereInput[] = [];
  if (q) {
    conditions.push({
      OR: [
        { user: { name: { contains: q, mode: "insensitive" } } },
        { user: { email: { contains: q, mode: "insensitive" } } },
        {
          user: {
            profiles: {
              some: { firstName: { contains: q, mode: "insensitive" } },
            },
          },
        },
        {
          user: {
            profiles: {
              some: { lastName: { contains: q, mode: "insensitive" } },
            },
          },
        },
      ],
    });
  }
  if (loc) {
    conditions.push({
      OR: [
        { city: { contains: loc, mode: "insensitive" } },
        { region: { contains: loc, mode: "insensitive" } },
        { country: { contains: loc, mode: "insensitive" } },
      ],
    });
  }
  const where: Prisma.LoginEventWhereInput = conditions.length
    ? { AND: conditions }
    : {};

  const [events, total, activeRows] = await Promise.all([
    prisma.loginEvent.findMany({
      where,
      orderBy: { createdAt: "desc" },
      take: pageSize,
      skip: (page - 1) * pageSize,
      include: {
        user: {
          select: {
            id: true,
            email: true,
            name: true,
            // Most-recent customer profile, used as a fallback display name
            // (and to surface the bank profile name the admin cares about).
            profiles: {
              select: { firstName: true, lastName: true },
              orderBy: { createdAt: "desc" },
              take: 1,
            },
          },
        },
      },
    }),
    prisma.loginEvent.count({ where }),
    prisma.loginEvent.groupBy({
      by: ["userId"],
      where: { createdAt: { gte: activeSince } },
    }),
  ]);

  const activeUserIds = new Set(activeRows.map((r) => r.userId));

  // Backfill: any rows on this page that have an IP but no country get
  // looked up now, deduped by IP and capped so a slow API can't stall the
  // page. The result is also persisted to the DB so future loads are
  // instant and the country never reverts to "Unknown".
  const ipsToResolve = Array.from(
    new Set(
      events
        .filter((e) => !e.country && e.ip)
        .map((e) => e.ip as string),
    ),
  ).slice(0, 10);

  if (ipsToResolve.length > 0) {
    const lookups = await Promise.all(
      ipsToResolve.map(async (ip) => ({ ip, geo: await geolocateIp(ip) })),
    );
    const byIp = new Map(lookups.map((l) => [l.ip, l.geo]));

    // Persist successful lookups: update every event with that IP that's
    // still missing a country, not just the rows currently visible.
    await Promise.all(
      lookups
        .filter((l) => l.geo.country)
        .map((l) =>
          prisma.loginEvent.updateMany({
            where: { ip: l.ip, country: null },
            data: {
              city: l.geo.city ?? null,
              region: l.geo.region ?? null,
              country: l.geo.country ?? null,
            },
          }),
        ),
    );

    // Mutate the events we'll render so the resolved location appears now.
    for (const e of events) {
      if (!e.country && e.ip) {
        const g = byIp.get(e.ip);
        if (g?.country) {
          e.city = g.city ?? null;
          e.region = g.region ?? null;
          e.country = g.country ?? null;
        }
      }
    }
  }

  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const startIdx = total === 0 ? 0 : (page - 1) * pageSize + 1;
  const endIdx = Math.min(page * pageSize, total);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-bold tracking-tight">
          Sign-in activity
        </h1>
        <p className="mt-1 text-muted-foreground">
          Every login across the platform, with IP, device, profile, and
          location. The <strong>Active</strong> badge marks users whose latest
          sign-in is within the last 24 hours.
        </p>
      </div>

      <SignInsFilter q={q} loc={loc} />

      <Card>
        <CardContent className="p-0">
          {events.length === 0 ? (
            <div className="px-6 py-12 text-center text-sm text-muted-foreground">
              {isFiltered
                ? "No sign-ins match the current filters."
                : "No sign-ins recorded yet."}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Account</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>When</TableHead>
                    <TableHead>Device</TableHead>
                    <TableHead>Location</TableHead>
                    <TableHead>IP</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {events.map((e) => {
                    const profile = e.user.profiles[0];
                    const profileName = profile
                      ? `${profile.firstName} ${profile.lastName}`
                      : null;
                    const displayName =
                      e.user.name ??
                      profileName ??
                      e.user.email.split("@")[0];
                    const isActive = activeUserIds.has(e.userId);
                    return (
                      <TableRow key={e.id}>
                        <TableCell>
                          <div className="font-medium">{displayName}</div>
                          <div className="text-xs text-muted-foreground">
                            {e.user.email}
                          </div>
                          {profileName && profileName !== displayName && (
                            <div className="text-xs text-muted-foreground">
                              Profile: {profileName}
                            </div>
                          )}
                        </TableCell>
                        <TableCell>
                          {isActive ? (
                            <Badge className="bg-success/15 text-success hover:bg-success/15">
                              <span className="mr-1.5 inline-block h-1.5 w-1.5 rounded-full bg-success" />
                              Active
                            </Badge>
                          ) : (
                            <Badge variant="secondary">Inactive</Badge>
                          )}
                        </TableCell>
                        <TableCell className="whitespace-nowrap">
                          {formatDateTime(e.createdAt)}
                        </TableCell>
                        <TableCell>
                          <div>{e.device}</div>
                          <div className="text-xs capitalize text-muted-foreground">
                            via {e.provider}
                          </div>
                        </TableCell>
                        <TableCell>
                          {formatLocation({
                            city: e.city,
                            region: e.region,
                            country: e.country,
                          })}
                        </TableCell>
                        <TableCell className="font-mono text-xs">
                          {e.ip ? (
                            <a
                              href={`https://whatismyipaddress.com/ip/${encodeURIComponent(e.ip)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              title="Look up this IP on whatismyipaddress.com"
                              className="text-primary hover:underline"
                            >
                              {e.ip}
                            </a>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      {total > 0 && (
        <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
          <div className="text-sm text-muted-foreground">
            {startIdx}–{endIdx} of {total}
          </div>
          <SignInsPagination
            page={page}
            totalPages={totalPages}
            pageSize={pageSize}
            q={q}
            loc={loc}
          />
        </div>
      )}
    </div>
  );
}
