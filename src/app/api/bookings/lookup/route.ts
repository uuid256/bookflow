import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { isAllowed, getClientIp } from "@/lib/rate-limit";

// Limit how many bookings are returned per request
const MAX_BOOKINGS = 50;

export async function GET(request: NextRequest) {
  // 20 lookups per IP per 5 minutes
  if (!isAllowed(`lookup:${getClientIp(request)}`, 20, 5 * 60_000)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  const email = request.nextUrl.searchParams.get("email");
  if (!email) {
    return NextResponse.json({ error: "Email is required" }, { status: 400 });
  }

  // Basic email format guard before hitting the database
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json({ error: "Invalid email format" }, { status: 400 });
  }

  const customer = await prisma.customer.findFirst({
    where: { email: email.toLowerCase() },
  });

  if (!customer) {
    // Return empty list — do not confirm whether the email exists
    return NextResponse.json({ bookings: [] });
  }

  const settings = await prisma.settings.findUnique({
    where: { businessId: customer.businessId },
  });

  const cancellationWindowHours = settings?.cancellationWindowHours ?? 24;
  const rescheduleWindowHours = settings?.rescheduleWindowHours ?? 24;

  const bookings = await prisma.booking.findMany({
    where: { customerId: customer.id, deletedAt: null },
    include: {
      service: { select: { name: true, durationMinutes: true } },
      staff: { select: { name: true } },
    },
    orderBy: [{ date: "desc" }, { startTime: "desc" }],
    take: MAX_BOOKINGS,
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
      service: b.service,
      staff: b.staff ? { name: b.staff.name } : null,
      canCancel: isFutureAndActive && hoursUntilBooking >= cancellationWindowHours,
      canReschedule: isFutureAndActive && hoursUntilBooking >= rescheduleWindowHours,
      // Financial details omitted — not required for self-service portal
    };
  });

  return NextResponse.json({ bookings: enriched });
}
