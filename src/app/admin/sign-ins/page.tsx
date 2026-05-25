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
import { formatLocation } from "@/lib/login-events";
import { SignInsPagination } from "./sign-ins-pagination";

export const metadata = { title: "Sign-in activity" };

/** A user is considered "active" if their most recent login was within this window. */
const ACTIVE_WINDOW_MS = 24 * 60 * 60 * 1000;

export default async function AdminSignInsPage({
  searchParams,
}: {
  searchParams: { page?: string; pageSize?: string };
}) {
  await requireAdmin();

  const pageSize = parsePageSize(searchParams.pageSize);
  const page = Math.max(1, parseInt(searchParams.page ?? "1", 10) || 1);
  const activeSince = new Date(Date.now() - ACTIVE_WINDOW_MS);

  const [events, total, activeRows] = await Promise.all([
    prisma.loginEvent.findMany({
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
    prisma.loginEvent.count(),
    prisma.loginEvent.groupBy({
      by: ["userId"],
      where: { createdAt: { gte: activeSince } },
    }),
  ]);

  const activeUserIds = new Set(activeRows.map((r) => r.userId));
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

      <Card>
        <CardContent className="p-0">
          {events.length === 0 ? (
            <div className="px-6 py-12 text-center text-sm text-muted-foreground">
              No sign-ins recorded yet.
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
                        <TableCell className="font-mono text-xs text-muted-foreground">
                          {e.ip ?? "—"}
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
          />
        </div>
      )}
    </div>
  );
}
