"use server";

import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/auth-guard";
import { revalidatePath } from "next/cache";
import { z } from "zod";

const businessHoursSchema = z.object({
  dayOfWeek: z.number().min(0).max(6),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  endTime: z.string().regex(/^\d{2}:\d{2}$/),
  isClosed: z.boolean(),
});

const settingsSchema = z.object({
  cancellationWindowHours: z.number().min(0),
  rescheduleWindowHours: z.number().min(0),
  autoConfirmBookings: z.boolean(),
  maxAdvanceBookingDays: z.number().min(1),
  minAdvanceBookingHours: z.number().min(0),
});

const holidaySchema = z.object({
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  name: z.string().min(1),
});

export async function updateBusinessHours(data: z.infer<typeof businessHoursSchema>) {
  const session = await requireAuth();
  const businessId = session.user.businessId;
  const parsed = businessHoursSchema.parse(data);

  const branch = await prisma.branch.findFirst({ where: { businessId } });
  const branchId = branch?.id || null;

  await prisma.businessHours.upsert({
    where: {
      businessId_branchId_dayOfWeek: {
        businessId,
        branchId: branchId ?? "",
        dayOfWeek: parsed.dayOfWeek,
      },
    },
    update: {
      startTime: parsed.startTime,
      endTime: parsed.endTime,
      isClosed: parsed.isClosed,
    },
    create: {
      businessId,
      branchId,
      dayOfWeek: parsed.dayOfWeek,
      startTime: parsed.startTime,
      endTime: parsed.endTime,
      isClosed: parsed.isClosed,
    },
  });

  revalidatePath("/admin/settings");
  return { success: true };
}

export async function updateSettings(data: z.infer<typeof settingsSchema>) {
  const session = await requireAuth();
  const businessId = session.user.businessId;
  const parsed = settingsSchema.parse(data);

  await prisma.settings.upsert({
    where: { businessId },
    update: parsed,
    create: { businessId, ...parsed },
  });

  revalidatePath("/admin/settings");
  return { success: true };
}

export async function addHoliday(data: z.infer<typeof holidaySchema>) {
  const session = await requireAuth();
  const businessId = session.user.businessId;
  const parsed = holidaySchema.parse(data);

  const branch = await prisma.branch.findFirst({ where: { businessId } });

  await prisma.holiday.create({
    data: {
      businessId,
      branchId: branch?.id || null,
      date: parsed.date,
      name: parsed.name,
    },
  });

  revalidatePath("/admin/settings");
  return { success: true };
}

export async function deleteHoliday(id: string) {
  const session = await requireAuth();
  const businessId = session.user.businessId;

  await prisma.holiday.deleteMany({
    where: { id, businessId },
  });

  revalidatePath("/admin/settings");
  return { success: true };
}
