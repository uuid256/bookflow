"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAuth, getBusinessId } from "@/lib/auth-guard";
import { revalidatePath } from "next/cache";

const packageSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  description: z.string().max(500).optional().default(""),
  totalSessions: z.number().int().min(1, "Must have at least 1 session"),
  price: z.number().int().min(0, "Price must be non-negative"),
  validDays: z.number().int().min(1, "Must be at least 1 day").max(3650),
  serviceIds: z.array(z.string()).default([]),
  isActive: z.boolean().default(true),
});

export type PackageFormData = z.infer<typeof packageSchema>;

const assignSchema = z.object({
  packageId: z.string().min(1, "Package is required"),
  customerId: z.string().min(1, "Customer is required"),
});

export type AssignFormData = z.infer<typeof assignSchema>;

export async function createPackage(data: PackageFormData) {
  const session = await requireAuth();
  const businessId = getBusinessId(session);

  const parsed = packageSchema.safeParse(data);
  if (!parsed.success) {
    return { error: parsed.error.errors[0].message };
  }

  const { serviceIds, ...packageData } = parsed.data;

  const pkg = await prisma.package.create({
    data: {
      ...packageData,
      description: packageData.description || null,
      businessId,
      packageServices: {
        create: serviceIds.map((serviceId) => ({ serviceId })),
      },
    },
  });

  revalidatePath("/admin/packages");
  return { success: true, package: pkg };
}

export async function updatePackage(id: string, data: PackageFormData) {
  const session = await requireAuth();
  const businessId = getBusinessId(session);

  const parsed = packageSchema.safeParse(data);
  if (!parsed.success) {
    return { error: parsed.error.errors[0].message };
  }

  const existing = await prisma.package.findFirst({
    where: { id, businessId },
  });

  if (!existing) {
    return { error: "Package not found" };
  }

  const { serviceIds, ...packageData } = parsed.data;

  const pkg = await prisma.package.update({
    where: { id },
    data: {
      ...packageData,
      description: packageData.description || null,
      packageServices: {
        deleteMany: {},
        create: serviceIds.map((serviceId) => ({ serviceId })),
      },
    },
  });

  revalidatePath("/admin/packages");
  return { success: true, package: pkg };
}

export async function deletePackage(id: string) {
  const session = await requireAuth();
  const businessId = getBusinessId(session);

  const existing = await prisma.package.findFirst({
    where: { id, businessId },
  });

  if (!existing) {
    return { error: "Package not found" };
  }

  await prisma.package.delete({
    where: { id },
  });

  revalidatePath("/admin/packages");
  return { success: true };
}

export async function assignPackageToCustomer(data: AssignFormData) {
  const session = await requireAuth();
  const businessId = getBusinessId(session);

  const parsed = assignSchema.safeParse(data);
  if (!parsed.success) {
    return { error: parsed.error.errors[0].message };
  }

  const pkg = await prisma.package.findFirst({
    where: { id: parsed.data.packageId, businessId, isActive: true },
  });

  if (!pkg) {
    return { error: "Package not found or inactive" };
  }

  const customer = await prisma.customer.findFirst({
    where: { id: parsed.data.customerId, businessId },
  });

  if (!customer) {
    return { error: "Customer not found" };
  }

  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + pkg.validDays);

  const customerPackage = await prisma.customerPackage.create({
    data: {
      customerId: parsed.data.customerId,
      packageId: parsed.data.packageId,
      remainingSessions: pkg.totalSessions,
      expiresAt,
    },
  });

  revalidatePath("/admin/packages");
  return { success: true, customerPackage };
}
