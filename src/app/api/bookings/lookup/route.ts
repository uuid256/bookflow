import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(request: NextRequest) {
  const email = request.nextUrl.searchParams.get("email");
  if (!email) {
    return NextResponse.json({ error: "Email is required" }, { status: 400 });
  }

  const customer = await prisma.customer.findFirst({
    where: { email },
  });

  if (!customer) {
    return NextResponse.json({ bookings: [] });
  }

  const settings = await prisma.settings.findUnique({
    where: { businessId: customer.businessId },
  });

  const cancellationWindowHours = settings?.cancellationWindowHours ?? 24;
  const rescheduleWindowHours = settings?.rescheduleWindowHours ?? 24;

  const bookings = await prisma.booking.findMany({
    where: { customerId: customer.id },
    include: {
      service: true,
      staff: { select: { name: true } },
    },
    orderBy: [{ date: "desc" }, { startTime: "desc" }],
  });

  const now = new Date();

  const enriched = bookings.map((b) => {
    const bookingDateTime = new Date(`${b.date}T${b.startTime}:00`);
    const hoursUntilBooking = (bookingDateTime.getTime() - now.getTime()) / (1000 * 60 * 60);
    const isFutureAndActive = hoursUntilBooking > 0 && ["PENDING", "CONFIRMED"].includes(b.status);

    return {
      id: b.id,
      date: b.date,
      startTime: b.startTime,
      endTime: b.endTime,
      status: b.status,
      totalAmount: b.totalAmount,
      depositAmount: b.depositAmount,
      depositStatus: b.depositStatus,
      service: { name: b.service.name, durationMinutes: b.service.durationMinutes },
      staff: b.staff ? { name: b.staff.name } : null,
      canCancel: isFutureAndActive && hoursUntilBooking >= cancellationWindowHours,
      canReschedule: isFutureAndActive && hoursUntilBooking >= rescheduleWindowHours,
    };
  });

  return NextResponse.json({ bookings: enriched });
}
