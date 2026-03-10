"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireAdmin, getBusinessId } from "@/lib/auth-guard";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { logAudit } from "@/lib/audit";

const createStaffSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email address"),
  password: z.string()
    .min(10, "Password must be at least 10 characters")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[0-9]/, "Password must contain at least one number")
    .regex(/[^A-Za-z0-9]/, "Password must contain at least one special character"),
  phone: z.string().optional(),
  role: z.enum(["ADMIN", "STAFF"]),
  isActive: z.boolean().default(true),
});

const updateStaffSchema = z.object({
  id: z.string().min(1),
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email address"),
  phone: z.string().optional(),
  role: z.enum(["ADMIN", "STAFF"]),
  isActive: z.boolean(),
});

export async function createStaff(formData: FormData) {
  const session = await requireAdmin();
  const businessId = getBusinessId(session);

  const raw = {
    name: formData.get("name") as string,
    email: formData.get("email") as string,
    password: formData.get("password") as string,
    phone: (formData.get("phone") as string) || undefined,
    role: formData.get("role") as string,
    isActive: formData.get("isActive") === "true",
  };

  const parsed = createStaffSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.errors[0].message };
  }

  const existing = await prisma.user.findUnique({
    where: { email: parsed.data.email },
  });
  if (existing) {
    return { error: "A user with this email already exists" };
  }

  const passwordHash = await bcrypt.hash(parsed.data.password, 10);

  const newUser = await prisma.user.create({
    data: {
      businessId,
      name: parsed.data.name,
      email: parsed.data.email,
      passwordHash,
      phone: parsed.data.phone || null,
      role: parsed.data.role,
      isActive: parsed.data.isActive,
    },
  });

  await logAudit({
    businessId,
    userId: session.user.id as string,
    action: "staff.created",
    resourceType: "User",
    resourceId: newUser.id,
    details: { name: parsed.data.name, email: parsed.data.email, role: parsed.data.role },
  });

  revalidatePath("/admin/staff");
  return { success: true };
}

export async function updateStaff(formData: FormData) {
  const session = await requireAdmin();
  const businessId = getBusinessId(session);

  const raw = {
    id: formData.get("id") as string,
    name: formData.get("name") as string,
    email: formData.get("email") as string,
    phone: (formData.get("phone") as string) || undefined,
    role: formData.get("role") as string,
    isActive: formData.get("isActive") === "true",
  };

  const parsed = updateStaffSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.errors[0].message };
  }

  // Verify user belongs to this business
  const user = await prisma.user.findFirst({
    where: { id: parsed.data.id, businessId },
  });
  if (!user) {
    return { error: "Staff member not found" };
  }

  // Check email uniqueness (excluding current user)
  const existing = await prisma.user.findFirst({
    where: {
      email: parsed.data.email,
      id: { not: parsed.data.id },
    },
  });
  if (existing) {
    return { error: "A user with this email already exists" };
  }

  await prisma.user.update({
    where: { id: parsed.data.id },
    data: {
      name: parsed.data.name,
      email: parsed.data.email,
      phone: parsed.data.phone || null,
      role: parsed.data.role,
      isActive: parsed.data.isActive,
    },
  });

  revalidatePath("/admin/staff");
  return { success: true };
}

export async function deleteStaff(id: string) {
  const session = await requireAdmin();
  const businessId = getBusinessId(session);

  const user = await prisma.user.findFirst({
    where: { id, businessId },
  });
  if (!user) {
    return { error: "Staff member not found" };
  }

  // Prevent deleting yourself
  if (user.id === session.user.id) {
    return { error: "You cannot delete your own account" };
  }

  await prisma.user.delete({ where: { id } });

  await logAudit({
    businessId,
    userId: session.user.id as string,
    action: "staff.deleted",
    resourceType: "User",
    resourceId: id,
    details: { name: user.name, email: user.email },
  });

  revalidatePath("/admin/staff");
  return { success: true };
}
