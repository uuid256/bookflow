"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireAuth } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";

const customerSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  email: z.string().email("Invalid email address"),
  phone: z.string().max(30).optional().or(z.literal("")),
  notes: z.string().max(1000).optional().or(z.literal("")),
});

export type CustomerFormState = {
  success: boolean;
  error?: string;
  fieldErrors?: Record<string, string[]>;
};

export async function createCustomer(
  formData: FormData
): Promise<CustomerFormState> {
  const session = await requireAuth();
  const businessId = session.user.businessId;

  const raw = {
    name: formData.get("name") as string,
    email: formData.get("email") as string,
    phone: formData.get("phone") as string,
    notes: formData.get("notes") as string,
  };

  const parsed = customerSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      success: false,
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  const { name, email, phone, notes } = parsed.data;

  const existing = await prisma.customer.findUnique({
    where: { businessId_email: { businessId, email } },
  });

  if (existing) {
    return {
      success: false,
      error: "A customer with this email already exists.",
    };
  }

  await prisma.customer.create({
    data: {
      businessId,
      name,
      email,
      phone: phone || null,
      notes: notes || null,
    },
  });

  revalidatePath("/admin/customers");
  return { success: true };
}

export async function updateCustomer(
  customerId: string,
  formData: FormData
): Promise<CustomerFormState> {
  const session = await requireAuth();
  const businessId = session.user.businessId;

  const customer = await prisma.customer.findFirst({
    where: { id: customerId, businessId },
  });

  if (!customer) {
    return { success: false, error: "Customer not found." };
  }

  const raw = {
    name: formData.get("name") as string,
    email: formData.get("email") as string,
    phone: formData.get("phone") as string,
    notes: formData.get("notes") as string,
  };

  const parsed = customerSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      success: false,
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  const { name, email, phone, notes } = parsed.data;

  if (email !== customer.email) {
    const existing = await prisma.customer.findUnique({
      where: { businessId_email: { businessId, email } },
    });
    if (existing) {
      return {
        success: false,
        error: "A customer with this email already exists.",
      };
    }
  }

  await prisma.customer.update({
    where: { id: customerId },
    data: {
      name,
      email,
      phone: phone || null,
      notes: notes || null,
    },
  });

  revalidatePath("/admin/customers");
  return { success: true };
}

export async function deleteCustomer(
  customerId: string
): Promise<CustomerFormState> {
  const session = await requireAuth();
  const businessId = session.user.businessId;

  const customer = await prisma.customer.findFirst({
    where: { id: customerId, businessId },
  });

  if (!customer) {
    return { success: false, error: "Customer not found." };
  }

  await prisma.customer.delete({
    where: { id: customerId },
  });

  revalidatePath("/admin/customers");
  return { success: true };
}
