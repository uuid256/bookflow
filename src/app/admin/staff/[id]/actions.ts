"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin, getBusinessId } from "@/lib/auth-guard";
import { z } from "zod";

const staffHoursSchema = z.object({
  userId: z.string().min(1),
  dayOfWeek: z.coerce.number().min(0).max(6),
  startTime: z.string().regex(/^\d{2}:\d{2}$/, "Invalid time format"),
  endTime: z.string().regex(/^\d{2}:\d{2}$/, "Invalid time format"),
  isActive: z.boolean(),
});

export async function updateStaffHours(formData: FormData) {
  const session = await requireAdmin();
  const businessId = getBusinessId(session);

  const raw = {
    userId: formData.get("userId") as string,
    dayOfWeek: formData.get("dayOfWeek") as string,
    startTime: formData.get("startTime") as string,
    endTime: formData.get("endTime") as string,
    isActive: formData.get("isActive") === "true",
  };

  const parsed = staffHoursSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.errors[0].message };
  }

  // Verify user belongs to this business
  const user = await prisma.user.findFirst({
    where: { id: parsed.data.userId, businessId },
  });
  if (!user) {
    return { error: "Staff member not found" };
  }

  // Validate that start time is before end time
  if (parsed.data.startTime >= parsed.data.endTime) {
    return { error: "Start time must be before end time" };
  }

  await prisma.staffHours.upsert({
    where: {
      userId_dayOfWeek: {
        userId: parsed.data.userId,
        dayOfWeek: parsed.data.dayOfWeek,
      },
    },
    create: {
      userId: parsed.data.userId,
      dayOfWeek: parsed.data.dayOfWeek,
      startTime: parsed.data.startTime,
      endTime: parsed.data.endTime,
      isActive: parsed.data.isActive,
    },
    update: {
      startTime: parsed.data.startTime,
      endTime: parsed.data.endTime,
      isActive: parsed.data.isActive,
    },
  });

  revalidatePath(`/admin/staff/${parsed.data.userId}`);
  return { success: true };
}

export async function toggleStaffService(userId: string, serviceId: string) {
  const session = await requireAdmin();
  const businessId = getBusinessId(session);

  // Verify user belongs to this business
  const user = await prisma.user.findFirst({
    where: { id: userId, businessId },
  });
  if (!user) {
    return { error: "Staff member not found" };
  }

  // Verify service belongs to this business
  const service = await prisma.service.findFirst({
    where: { id: serviceId, businessId },
  });
  if (!service) {
    return { error: "Service not found" };
  }

  // Check if assignment exists
  const existing = await prisma.staffService.findUnique({
    where: {
      userId_serviceId: { userId, serviceId },
    },
  });

  if (existing) {
    await prisma.staffService.delete({
      where: { id: existing.id },
    });
  } else {
    await prisma.staffService.create({
      data: { userId, serviceId },
    });
  }

  revalidatePath(`/admin/staff/${userId}`);
  return { success: true };
}
