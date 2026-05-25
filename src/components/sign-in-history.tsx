import { prisma } from "@/lib/prisma";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { formatDateTime } from "@/lib/utils";
import { formatLocation } from "@/lib/login-events";

/**
 * Lists recent successful sign-ins for a user with device + location. Used
 * on both customer and admin settings pages so each user can audit their
 * own account access.
 */
export async function SignInHistory({
  userId,
  limit = 10,
}: {
  userId: string;
  limit?: number;
}) {
  const events = await prisma.loginEvent.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: limit,
  });

  if (events.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No sign-ins recorded yet — your next login will appear here.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>When</TableHead>
            <TableHead>Device</TableHead>
            <TableHead>Location</TableHead>
            <TableHead>IP</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {events.map((e) => (
            <TableRow key={e.id}>
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
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
