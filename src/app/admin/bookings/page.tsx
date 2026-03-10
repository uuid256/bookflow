import { requireAuth } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";
import { formatCurrency } from "@/lib/utils";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { BookingForm } from "./booking-form";
import { BookingStatusBadge } from "./booking-status";

export default async function BookingsPage() {
  const session = await requireAuth();
  const businessId = session.user.businessId;

  const [bookings, services, customers, staff] = await Promise.all([
    prisma.booking.findMany({
      where: { businessId },
      include: {
        service: true,
        customer: true,
        staff: true,
      },
      orderBy: [{ date: "desc" }, { startTime: "desc" }],
      take: 100,
    }),
    prisma.service.findMany({
      where: { businessId, isActive: true },
      orderBy: { sortOrder: "asc" },
    }),
    prisma.customer.findMany({
      where: { businessId },
      orderBy: { name: "asc" },
    }),
    prisma.user.findMany({
      where: { businessId, isActive: true, role: { in: ["STAFF", "ADMIN"] } },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Bookings</h1>
        <BookingForm
          services={services.map((s) => ({
            id: s.id,
            name: s.name,
            durationMinutes: s.durationMinutes,
            price: s.price,
          }))}
          customers={customers.map((c) => ({
            id: c.id,
            name: c.name,
            email: c.email,
          }))}
          staff={staff.map((s) => ({
            id: s.id,
            name: s.name,
          }))}
        />
      </div>

      {bookings.length === 0 ? (
        <div className="rounded-lg border p-8 text-center text-muted-foreground">
          No bookings yet. Create your first booking above.
        </div>
      ) : (
        <div className="rounded-lg border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Time</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead>Service</TableHead>
                <TableHead>Staff</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Deposit</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {bookings.map((booking) => (
                <TableRow key={booking.id}>
                  <TableCell className="font-medium">{booking.date}</TableCell>
                  <TableCell>
                    {booking.startTime} - {booking.endTime}
                  </TableCell>
                  <TableCell>{booking.customer.name}</TableCell>
                  <TableCell>{booking.service.name}</TableCell>
                  <TableCell>{booking.staff?.name || "Unassigned"}</TableCell>
                  <TableCell>{formatCurrency(booking.totalAmount)}</TableCell>
                  <TableCell>
                    {booking.depositAmount > 0 ? (
                      <Badge variant={booking.depositStatus === "PAID" ? "success" : "warning"}>
                        {formatCurrency(booking.depositAmount)} ({booking.depositStatus})
                      </Badge>
                    ) : (
                      <span className="text-muted-foreground">-</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <BookingStatusBadge
                      bookingId={booking.id}
                      status={booking.status}
                    />
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
