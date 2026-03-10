import { prisma } from "@/lib/prisma";

export const BOOKING_STATUSES = [
  "PENDING",
  "CONFIRMED",
  "IN_PROGRESS",
  "COMPLETED",
  "CANCELLED",
  "NO_SHOW",
] as const;

export type BookingStatus = (typeof BOOKING_STATUSES)[number];

export const VALID_TRANSITIONS: Record<BookingStatus, BookingStatus[]> = {
  PENDING: ["CONFIRMED", "CANCELLED"],
  CONFIRMED: ["IN_PROGRESS", "CANCELLED", "NO_SHOW"],
  IN_PROGRESS: ["COMPLETED"],
  COMPLETED: [],
  CANCELLED: [],
  NO_SHOW: [],
};

export function canTransition(from: string, to: string): boolean {
  const allowed = VALID_TRANSITIONS[from as BookingStatus];
  return allowed?.includes(to as BookingStatus) ?? false;
}

export function getStatusColor(status: string) {
  switch (status) {
    case "PENDING": return "warning";
    case "CONFIRMED": return "default";
    case "IN_PROGRESS": return "default";
    case "COMPLETED": return "success";
    case "CANCELLED": return "destructive";
    case "NO_SHOW": return "destructive";
    default: return "secondary";
  }
}

export async function checkSlotAvailability(params: {
  businessId: string;
  date: string;
  startTime: string;
  endTime: string;
  staffId?: string | null;
  excludeBookingId?: string;
  bufferBefore?: number;
  bufferAfter?: number;
}): Promise<{ available: boolean; reason?: string }> {
  const { businessId, date, startTime, endTime, staffId, excludeBookingId, bufferBefore = 0, bufferAfter = 0 } = params;

  // Check business hours
  const dayOfWeek = new Date(date + "T12:00:00").getDay();
  const businessHours = await prisma.businessHours.findFirst({
    where: { businessId, dayOfWeek },
  });

  if (!businessHours || businessHours.isClosed) {
    return { available: false, reason: "Business is closed on this day" };
  }

  if (startTime < businessHours.startTime || endTime > businessHours.endTime) {
    return { available: false, reason: "Outside business hours" };
  }

  // Check holidays
  const holiday = await prisma.holiday.findFirst({
    where: { businessId, date, isClosed: true },
  });

  if (holiday) {
    return { available: false, reason: `Closed for ${holiday.name}` };
  }

  // Check staff hours if staff assigned
  if (staffId) {
    const staffHours = await prisma.staffHours.findFirst({
      where: { userId: staffId, dayOfWeek, isActive: true },
    });

    if (!staffHours) {
      return { available: false, reason: "Staff is not available on this day" };
    }

    if (startTime < staffHours.startTime || endTime > staffHours.endTime) {
      return { available: false, reason: "Outside staff working hours" };
    }
  }

  // Calculate buffered time range
  const bufferedStart = subtractMinutes(startTime, bufferBefore);
  const bufferedEnd = addMinutes(endTime, bufferAfter);

  // Check overlapping bookings
  const whereClause: any = {
    businessId,
    date,
    status: { in: ["PENDING", "CONFIRMED", "IN_PROGRESS"] },
  };

  if (excludeBookingId) {
    whereClause.id = { not: excludeBookingId };
  }

  if (staffId) {
    whereClause.staffId = staffId;
  }

  const conflicting = await prisma.booking.findMany({
    where: whereClause,
    include: { service: true },
  });

  for (const booking of conflicting) {
    const existingBufferedStart = subtractMinutes(booking.startTime, booking.service.bufferBefore);
    const existingBufferedEnd = addMinutes(booking.endTime, booking.service.bufferAfter);

    // Check overlap including buffers
    if (bufferedStart < existingBufferedEnd && bufferedEnd > existingBufferedStart) {
      return {
        available: false,
        reason: staffId
          ? "Staff has a conflicting booking at this time"
          : "There is a conflicting booking at this time",
      };
    }
  }

  return { available: true };
}

export function addMinutes(time: string, minutes: number): string {
  const [h, m] = time.split(":").map(Number);
  const totalMinutes = h * 60 + m + minutes;
  const newH = Math.floor(totalMinutes / 60) % 24;
  const newM = totalMinutes % 60;
  return `${String(newH).padStart(2, "0")}:${String(newM).padStart(2, "0")}`;
}

export function subtractMinutes(time: string, minutes: number): string {
  return addMinutes(time, -minutes);
}

export function generateTimeSlots(
  startTime: string,
  endTime: string,
  intervalMinutes: number
): string[] {
  const slots: string[] = [];
  let current = startTime;
  while (current < endTime) {
    slots.push(current);
    current = addMinutes(current, intervalMinutes);
  }
  return slots;
}
