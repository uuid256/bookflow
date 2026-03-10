import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkSlotAvailability, generateTimeSlots, addMinutes } from "@/lib/booking-utils";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const date = request.nextUrl.searchParams.get("date");

  if (!date) {
    return NextResponse.json({ error: "date is required" }, { status: 400 });
  }

  const booking = await prisma.booking.findUnique({
    where: { id },
    include: { service: true },
  });

  if (!booking) {
    return NextResponse.json({ error: "Booking not found" }, { status: 404 });
  }

  const dayOfWeek = new Date(date + "T12:00:00").getDay();
  const businessHours = await prisma.businessHours.findFirst({
    where: { businessId: booking.businessId, dayOfWeek },
  });

  if (!businessHours || businessHours.isClosed) {
    return NextResponse.json({ slots: [] });
  }

  const holiday = await prisma.holiday.findFirst({
    where: { businessId: booking.businessId, date, isClosed: true },
  });
  if (holiday) {
    return NextResponse.json({ slots: [] });
  }

  const allSlots = generateTimeSlots(
    businessHours.startTime,
    businessHours.endTime,
    15
  );

  const availableSlots: string[] = [];

  for (const slot of allSlots) {
    const endTime = addMinutes(slot, booking.service.durationMinutes);
    if (endTime > businessHours.endTime) continue;

    const result = await checkSlotAvailability({
      businessId: booking.businessId,
      date,
      startTime: slot,
      endTime,
      staffId: booking.staffId,
      excludeBookingId: booking.id,
      bufferBefore: booking.service.bufferBefore,
      bufferAfter: booking.service.bufferAfter,
    });

    if (result.available) {
      availableSlots.push(slot);
    }
  }

  return NextResponse.json({ slots: availableSlots });
}
