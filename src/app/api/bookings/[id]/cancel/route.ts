import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const booking = await prisma.booking.findUnique({
    where: { id },
    include: { service: true },
  });

  if (!booking) {
    return NextResponse.json({ error: "Booking not found" }, { status: 404 });
  }

  if (!["PENDING", "CONFIRMED"].includes(booking.status)) {
    return NextResponse.json(
      { error: "This booking cannot be cancelled" },
      { status: 400 }
    );
  }

  const settings = await prisma.settings.findUnique({
    where: { businessId: booking.businessId },
  });

  const cancellationWindowHours = settings?.cancellationWindowHours ?? 24;
  const bookingDateTime = new Date(`${booking.date}T${booking.startTime}:00`);
  const hoursUntil = (bookingDateTime.getTime() - Date.now()) / (1000 * 60 * 60);

  if (hoursUntil < cancellationWindowHours) {
    return NextResponse.json(
      { error: `Cancellation must be at least ${cancellationWindowHours} hours in advance` },
      { status: 400 }
    );
  }

  await prisma.$transaction([
    prisma.booking.update({
      where: { id },
      data: {
        status: "CANCELLED",
        cancellationReason: "Cancelled by customer",
        depositStatus: booking.depositStatus === "PAID" ? "REFUNDED" : booking.depositStatus,
      },
    }),
    prisma.notification.create({
      data: {
        bookingId: id,
        type: "CANCELLATION",
        channel: "EMAIL",
        status: "PENDING",
      },
    }),
  ]);

  // Notify waitlist
  await prisma.waitlistEntry.updateMany({
    where: {
      businessId: booking.businessId,
      serviceId: booking.serviceId,
      preferredDate: booking.date,
      status: "WAITING",
    },
    data: { status: "NOTIFIED" },
  });

  return NextResponse.json({ success: true });
}
