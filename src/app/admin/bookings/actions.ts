"use server";

import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-guard";
import { revalidatePath } from "next/cache";
import { canTransition, checkSlotAvailability } from "@/lib/booking-utils";
import { z } from "zod";

const bookingSchema = z.object({
  serviceId: z.string().min(1),
  customerId: z.string().min(1),
  staffId: z.string().optional().nullable(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
});

export async function createBooking(data: z.infer<typeof bookingSchema>) {
  const session = await requireAuth();
  const businessId = session.user.businessId;
  const parsed = bookingSchema.parse(data);

  const service = await prisma.service.findFirst({
    where: { id: parsed.serviceId, businessId },
  });
  if (!service) throw new Error("Service not found");

  const endTime = addMinutesToTime(parsed.startTime, service.durationMinutes);

  // Auto-assign staff if not selected
  let staffId = parsed.staffId || null;
  if (!staffId) {
    staffId = await findAvailableStaff(businessId, parsed.serviceId, parsed.date, parsed.startTime, endTime, service.bufferBefore, service.bufferAfter);
  }

  // Check availability
  const availability = await checkSlotAvailability({
    businessId,
    date: parsed.date,
    startTime: parsed.startTime,
    endTime,
    staffId,
    bufferBefore: service.bufferBefore,
    bufferAfter: service.bufferAfter,
  });

  if (!availability.available) {
    throw new Error(availability.reason || "Slot not available");
  }

  const settings = await prisma.settings.findUnique({ where: { businessId } });
  const branch = await prisma.branch.findFirst({ where: { businessId } });

  const booking = await prisma.booking.create({
    data: {
      businessId,
      branchId: branch?.id || null,
      serviceId: parsed.serviceId,
      customerId: parsed.customerId,
      staffId,
      date: parsed.date,
      startTime: parsed.startTime,
      endTime,
      status: settings?.autoConfirmBookings ? "CONFIRMED" : "PENDING",
      totalAmount: service.price,
      depositAmount: service.depositAmount,
      depositStatus: service.depositAmount > 0 ? "PENDING" : "NONE",
    },
  });

  // Create confirmation notification
  await prisma.notification.create({
    data: {
      bookingId: booking.id,
      type: "CONFIRMATION",
      channel: "EMAIL",
      status: "PENDING",
    },
  });

  revalidatePath("/admin/bookings");
  revalidatePath("/admin/calendar");
  return { success: true, bookingId: booking.id };
}

export async function updateBookingStatus(bookingId: string, newStatus: string) {
  const session = await requireAuth();
  const businessId = session.user.businessId;

  const booking = await prisma.booking.findFirst({
    where: { id: bookingId, businessId },
    include: { service: true },
  });

  if (!booking) throw new Error("Booking not found");
  if (!canTransition(booking.status, newStatus)) {
    throw new Error(`Cannot transition from ${booking.status} to ${newStatus}`);
  }

  await prisma.booking.update({
    where: { id: bookingId },
    data: {
      status: newStatus,
      ...(newStatus === "CANCELLED" ? { depositStatus: booking.depositStatus === "PAID" ? "REFUNDED" : booking.depositStatus } : {}),
    },
  });

  // If completed, check for package usage
  if (newStatus === "COMPLETED") {
    await deductPackageSession(booking.customerId, booking.serviceId, bookingId);
  }

  // Create notification
  const notifType = newStatus === "CANCELLED" ? "CANCELLATION" : newStatus === "CONFIRMED" ? "CONFIRMATION" : null;
  if (notifType) {
    await prisma.notification.create({
      data: {
        bookingId,
        type: notifType,
        channel: "EMAIL",
        status: "PENDING",
      },
    });
  }

  // If cancelled, check waitlist
  if (newStatus === "CANCELLED") {
    await notifyWaitlist(businessId, booking.serviceId, booking.date);
  }

  revalidatePath("/admin/bookings");
  revalidatePath("/admin/calendar");
  return { success: true };
}

export async function deleteBooking(bookingId: string) {
  const session = await requireAuth();
  const businessId = session.user.businessId;

  await prisma.booking.deleteMany({
    where: { id: bookingId, businessId, status: { in: ["CANCELLED", "NO_SHOW"] } },
  });

  revalidatePath("/admin/bookings");
  return { success: true };
}

async function findAvailableStaff(
  businessId: string,
  serviceId: string,
  date: string,
  startTime: string,
  endTime: string,
  bufferBefore: number,
  bufferAfter: number,
): Promise<string | null> {
  // Find staff who can do this service
  const staffServices = await prisma.staffService.findMany({
    where: { serviceId },
    include: { user: true },
    take: 100,
  });

  const dayOfWeek = new Date(date + "T12:00:00").getDay();

  for (const ss of staffServices) {
    if (!ss.user.isActive) continue;

    const availability = await checkSlotAvailability({
      businessId,
      date,
      startTime,
      endTime,
      staffId: ss.userId,
      bufferBefore,
      bufferAfter,
    });

    if (availability.available) {
      return ss.userId;
    }
  }

  return null;
}

async function deductPackageSession(customerId: string, serviceId: string, bookingId: string) {
  const activePackage = await prisma.customerPackage.findFirst({
    where: {
      customerId,
      status: "ACTIVE",
      remainingSessions: { gt: 0 },
      expiresAt: { gt: new Date() },
      package: {
        packageServices: { some: { serviceId } },
      },
    },
    orderBy: { expiresAt: "asc" },
  });

  if (activePackage) {
    await prisma.$transaction([
      prisma.customerPackage.update({
        where: { id: activePackage.id },
        data: {
          remainingSessions: activePackage.remainingSessions - 1,
          status: activePackage.remainingSessions - 1 === 0 ? "EXHAUSTED" : "ACTIVE",
        },
      }),
      prisma.packageUsage.create({
        data: {
          customerPackageId: activePackage.id,
          bookingId,
        },
      }),
    ]);
  }
}

async function notifyWaitlist(businessId: string, serviceId: string, date: string) {
  const entries = await prisma.waitlistEntry.findMany({
    where: {
      businessId,
      serviceId,
      preferredDate: date,
      status: "WAITING",
    },
    take: 100,
  });

  for (const entry of entries) {
    await prisma.waitlistEntry.update({
      where: { id: entry.id },
      data: { status: "NOTIFIED" },
    });
  }
}

function addMinutesToTime(time: string, minutes: number): string {
  const [h, m] = time.split(":").map(Number);
  const totalMinutes = h * 60 + m + minutes;
  const newH = Math.floor(totalMinutes / 60) % 24;
  const newM = totalMinutes % 60;
  return `${String(newH).padStart(2, "0")}:${String(newM).padStart(2, "0")}`;
}
