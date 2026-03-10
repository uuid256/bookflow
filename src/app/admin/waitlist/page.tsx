import { requireAuth } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { WaitlistStatusActions, DeleteWaitlistButton } from "./waitlist-actions";
import { ClipboardList } from "lucide-react";
import Link from "next/link";

const STATUS_VARIANTS: Record<string, "default" | "secondary" | "destructive" | "outline"> = {
  WAITING: "default",
  NOTIFIED: "secondary",
  BOOKED: "outline",
  CANCELLED: "destructive",
};

export default async function WaitlistPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const session = await requireAuth();
  const businessId = session.user.businessId;
  const { status: filterStatus } = await searchParams;

  const where: { businessId: string; status?: string } = { businessId };
  if (filterStatus && ["WAITING", "NOTIFIED", "BOOKED", "CANCELLED"].includes(filterStatus)) {
    where.status = filterStatus;
  }

  const entries = await prisma.waitlistEntry.findMany({
    where,
    include: {
      customer: true,
    },
    orderBy: { createdAt: "desc" },
  });

  // Fetch service names for all entries
  const serviceIds = [...new Set(entries.map((e) => e.serviceId))];
  const services = serviceIds.length > 0
    ? await prisma.service.findMany({
        where: { id: { in: serviceIds } },
        select: { id: true, name: true },
      })
    : [];
  const serviceMap = new Map(services.map((s) => [s.id, s.name]));

  const statuses = ["WAITING", "NOTIFIED", "BOOKED", "CANCELLED"];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Waitlist</h1>
        <p className="text-muted-foreground">
          Manage customers waiting for available slots
        </p>
      </div>

      <div className="flex items-center gap-2">
        <Link href="/admin/waitlist">
          <Button variant={!filterStatus ? "default" : "outline"} size="sm">
            All
          </Button>
        </Link>
        {statuses.map((s) => (
          <Link key={s} href={`/admin/waitlist?status=${s}`}>
            <Button
              variant={filterStatus === s ? "default" : "outline"}
              size="sm"
            >
              {s.charAt(0) + s.slice(1).toLowerCase()}
            </Button>
          </Link>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5" />
            Waitlist Entries
            <Badge variant="secondary">{entries.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {entries.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <ClipboardList className="mb-4 h-12 w-12 text-muted-foreground" />
              <h3 className="text-lg font-semibold">No waitlist entries</h3>
              <p className="text-sm text-muted-foreground">
                {filterStatus
                  ? "No entries match this filter."
                  : "The waitlist is currently empty."}
              </p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Customer</TableHead>
                  <TableHead>Service</TableHead>
                  <TableHead>Preferred Date</TableHead>
                  <TableHead>Preferred Time</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Added</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {entries.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell className="font-medium">
                      <div>
                        <div>{entry.customer.name}</div>
                        <div className="text-sm text-muted-foreground">
                          {entry.customer.email}
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      {serviceMap.get(entry.serviceId) ?? "Unknown"}
                    </TableCell>
                    <TableCell>{entry.preferredDate}</TableCell>
                    <TableCell>{entry.preferredTime ?? "-"}</TableCell>
                    <TableCell>
                      <Badge variant={STATUS_VARIANTS[entry.status] ?? "secondary"}>
                        {entry.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {new Date(entry.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-end gap-1">
                        <WaitlistStatusActions
                          entryId={entry.id}
                          currentStatus={entry.status}
                        />
                        <DeleteWaitlistButton entryId={entry.id} />
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
