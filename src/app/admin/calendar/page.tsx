import { requireAuth } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";
import { CalendarView } from "./calendar-view";

export default async function CalendarPage() {
  const session = await requireAuth();
  const businessId = session.user.businessId;

  const today = new Date().toISOString().split("T")[0];

  const [bookings, staff, businessHours] = await Promise.all([
    prisma.booking.findMany({
      where: {
        businessId,
        status: { in: ["PENDING", "CONFIRMED", "IN_PROGRESS"] },
      },
      include: {
        service: true,
        customer: true,
        staff: true,
      },
      orderBy: [{ date: "asc" }, { startTime: "asc" }],
    }),
    prisma.user.findMany({
      where: { businessId, isActive: true },
      orderBy: { name: "asc" },
    }),
    prisma.businessHours.findMany({
      where: { businessId },
      orderBy: { dayOfWeek: "asc" },
    }),
  ]);

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold">Calendar</h1>
      <CalendarView
        bookings={bookings.map((b) => ({
          id: b.id,
          date: b.date,
          startTime: b.startTime,
          endTime: b.endTime,
          status: b.status,
          serviceName: b.service.name,
          customerName: b.customer.name,
          staffName: b.staff?.name || "Unassigned",
        }))}
        staff={staff.map((s) => ({ id: s.id, name: s.name }))}
        today={today}
      />
    </div>
  );
}
