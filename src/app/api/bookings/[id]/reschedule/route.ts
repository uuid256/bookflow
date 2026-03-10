import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { checkSlotAvailability, addMinutes } from "@/lib/booking-utils";
import { isAllowed, getClientIp } from "@/lib/rate-limit";
import { isValidOrigin } from "@/lib/csrf";

const rescheduleSchema = z.object({
  email: z.string().email(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
});

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  if (!isValidOrigin(request)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // 10 reschedule attempts per IP per 10 minutes
  if (!isAllowed(`reschedule:${getClientIp(request)}`, 10, 10 * 60_000)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  try {
    const body = await request.json();
    const parsed = rescheduleSchema.parse(body);

    const booking = await prisma.booking.findUnique({
      where: { id },
      include: { service: true, customer: true },
    });

    // Return 404 for both "not found" and "wrong email" so IDs can't be enumerated
    if (!booking || booking.customer.email.toLowerCase() !== parsed.email.toLowerCase()) {
      return NextResponse.json({ error: "Booking not found" }, { status: 404 });
    }

    if (!["PENDING", "CONFIRMED"].includes(booking.status)) {
      return NextResponse.json(
        { error: "This booking cannot be rescheduled" },
        { status: 400 }
      );
    }

    const settings = await prisma.settings.findUnique({
      where: { businessId: booking.businessId },
    });

    const rescheduleWindowHours = settings?.rescheduleWindowHours ?? 24;
    // TODO(med-6): Use settings.timezone to parse booking times correctly.
    // Currently assumes server local time matches the business timezone.
    const bookingDateTime = new Date(`${booking.date}T${booking.startTime}:00`);
    const hoursUntil = (bookingDateTime.getTime() - Date.now()) / (1000 * 60 * 60);

    if (hoursUntil < rescheduleWindowHours) {
      return NextResponse.json(
        { error: `Rescheduling must be at least ${rescheduleWindowHours} hours in advance` },
        { status: 400 }
      );
    }

    const endTime = addMinutes(parsed.startTime, booking.service.durationMinutes);

    const availability = await checkSlotAvailability({
      businessId: booking.businessId,
      date: parsed.date,
      startTime: parsed.startTime,
      endTime,
      staffId: booking.staffId,
      excludeBookingId: booking.id,
      bufferBefore: booking.service.bufferBefore,
      bufferAfter: booking.service.bufferAfter,
    });

    if (!availability.available) {
      return NextResponse.json(
        { error: availability.reason || "Slot not available" },
        { status: 409 }
      );
    }

    await prisma.$transaction([
      prisma.booking.update({
        where: { id },
        data: {
          date: parsed.date,
          startTime: parsed.startTime,
          endTime,
        },
      }),
      prisma.notification.create({
        data: {
          bookingId: id,
          type: "RESCHEDULE",
          channel: "EMAIL",
          status: "PENDING",
        },
      }),
    ]);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid input" }, { status: 400 });
    }
    console.error("[POST /api/bookings/reschedule]", error);
    return NextResponse.json({ error: "An internal error occurred" }, { status: 500 });
  }
}
