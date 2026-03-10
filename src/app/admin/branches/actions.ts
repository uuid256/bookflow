"use server";

import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { requireAdmin, getBusinessId } from "@/lib/auth-guard";
import { revalidatePath } from "next/cache";

const branchSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  address: z.string().max(255).optional().default(""),
  phone: z.string().max(30).optional().default(""),
  isActive: z.boolean().default(true),
});

export type BranchFormData = z.infer<typeof branchSchema>;

export async function createBranch(data: BranchFormData) {
  const session = await requireAdmin();
  const businessId = getBusinessId(session);

  const parsed = branchSchema.safeParse(data);
  if (!parsed.success) {
    return { error: parsed.error.errors[0].message };
  }

  const branch = await prisma.branch.create({
    data: {
      name: parsed.data.name,
      address: parsed.data.address || null,
      phone: parsed.data.phone || null,
      isActive: parsed.data.isActive,
      businessId,
    },
  });

  revalidatePath("/admin/branches");
  return { success: true, branch };
}

export async function updateBranch(id: string, data: BranchFormData) {
  const session = await requireAdmin();
  const businessId = getBusinessId(session);

  const parsed = branchSchema.safeParse(data);
  if (!parsed.success) {
    return { error: parsed.error.errors[0].message };
  }

  const existing = await prisma.branch.findFirst({
    where: { id, businessId },
  });

  if (!existing) {
    return { error: "Branch not found" };
  }

  const branch = await prisma.branch.update({
    where: { id },
    data: {
      name: parsed.data.name,
      address: parsed.data.address || null,
      phone: parsed.data.phone || null,
      isActive: parsed.data.isActive,
    },
  });

  revalidatePath("/admin/branches");
  return { success: true, branch };
}

export async function deleteBranch(id: string) {
  const session = await requireAdmin();
  const businessId = getBusinessId(session);

  const existing = await prisma.branch.findFirst({
    where: { id, businessId },
  });

  if (!existing) {
    return { error: "Branch not found" };
  }

  await prisma.branch.delete({
    where: { id },
  });

  revalidatePath("/admin/branches");
  return { success: true };
}
