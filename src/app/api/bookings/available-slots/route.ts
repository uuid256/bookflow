import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { checkSlotAvailability, generateTimeSlots, addMinutes } from "@/lib/booking-utils";

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const businessSlug = searchParams.get("business") || "bookflow-demo";
  const serviceId = searchParams.get("serviceId");
  const date = searchParams.get("date");
  const staffId = searchParams.get("staffId");

  if (!serviceId || !date) {
    return NextResponse.json({ error: "serviceId and date are required" }, { status: 400 });
  }

  const business = await prisma.business.findFirst({
    where: { slug: businessSlug },
  });
  if (!business) {
    return NextResponse.json({ error: "Business not found" }, { status: 404 });
  }

  const service = await prisma.service.findFirst({
    where: { id: serviceId, businessId: business.id, isActive: true },
  });
  if (!service) {
    return NextResponse.json({ error: "Service not found" }, { status: 404 });
  }

  const dayOfWeek = new Date(date + "T12:00:00").getDay();
  const businessHours = await prisma.businessHours.findFirst({
    where: { businessId: business.id, dayOfWeek },
  });

  if (!businessHours || businessHours.isClosed) {
    return NextResponse.json({ slots: [] });
  }

  // Check if it's a holiday
  const holiday = await prisma.holiday.findFirst({
    where: { businessId: business.id, date, isClosed: true },
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
    const endTime = addMinutes(slot, service.durationMinutes);
    if (endTime > businessHours.endTime) continue;

    const result = await checkSlotAvailability({
      businessId: business.id,
      date,
      startTime: slot,
      endTime,
      staffId: staffId || undefined,
      bufferBefore: service.bufferBefore,
      bufferAfter: service.bufferAfter,
    });

    if (result.available) {
      availableSlots.push(slot);
    }
  }

  return NextResponse.json({ slots: availableSlots });
}
