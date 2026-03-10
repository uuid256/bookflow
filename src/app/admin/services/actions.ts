"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAuth, getBusinessId } from "@/lib/auth-guard";
import { revalidatePath } from "next/cache";

const serviceSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  description: z.string().max(500).optional().default(""),
  durationMinutes: z.number().int().min(5, "Duration must be at least 5 minutes").max(480),
  price: z.number().int().min(0, "Price must be non-negative"),
  depositAmount: z.number().int().min(0).default(0),
  depositPercent: z.number().int().min(0).max(100).nullable().optional(),
  bufferBefore: z.number().int().min(0).max(120).default(0),
  bufferAfter: z.number().int().min(0).max(120).default(0),
  isActive: z.boolean().default(true),
});

export type ServiceFormData = z.infer<typeof serviceSchema>;

export async function createService(data: ServiceFormData) {
  const session = await requireAuth();
  const businessId = getBusinessId(session);

  const parsed = serviceSchema.safeParse(data);
  if (!parsed.success) {
    return { error: parsed.error.errors[0].message };
  }

  const maxSort = await prisma.service.aggregate({
    where: { businessId },
    _max: { sortOrder: true },
  });

  const service = await prisma.service.create({
    data: {
      ...parsed.data,
      description: parsed.data.description || null,
      depositPercent: parsed.data.depositPercent ?? null,
      businessId,
      sortOrder: (maxSort._max.sortOrder ?? 0) + 1,
    },
  });

  revalidatePath("/admin/services");
  return { success: true, service };
}

export async function updateService(id: string, data: ServiceFormData) {
  const session = await requireAuth();
  const businessId = getBusinessId(session);

  const parsed = serviceSchema.safeParse(data);
  if (!parsed.success) {
    return { error: parsed.error.errors[0].message };
  }

  const existing = await prisma.service.findFirst({
    where: { id, businessId },
  });

  if (!existing) {
    return { error: "Service not found" };
  }

  const service = await prisma.service.update({
    where: { id },
    data: {
      ...parsed.data,
      description: parsed.data.description || null,
      depositPercent: parsed.data.depositPercent ?? null,
    },
  });

  revalidatePath("/admin/services");
  return { success: true, service };
}

export async function deleteService(id: string) {
  const session = await requireAuth();
  const businessId = getBusinessId(session);

  const existing = await prisma.service.findFirst({
    where: { id, businessId },
  });

  if (!existing) {
    return { error: "Service not found" };
  }

  await prisma.service.delete({
    where: { id },
  });

  revalidatePath("/admin/services");
  return { success: true };
}
