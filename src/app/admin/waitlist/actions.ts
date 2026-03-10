"use server";

import { revalidatePath } from "next/cache";
import { requireAuth } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";

const VALID_STATUSES = ["WAITING", "NOTIFIED", "BOOKED", "CANCELLED"] as const;
type WaitlistStatus = (typeof VALID_STATUSES)[number];

export type WaitlistActionState = {
  success: boolean;
  error?: string;
};

export async function updateWaitlistStatus(
  entryId: string,
  status: WaitlistStatus
): Promise<WaitlistActionState> {
  const session = await requireAuth();
  const businessId = session.user.businessId;

  if (!VALID_STATUSES.includes(status)) {
    return { success: false, error: "Invalid status." };
  }

  const entry = await prisma.waitlistEntry.findFirst({
    where: { id: entryId, businessId },
  });

  if (!entry) {
    return { success: false, error: "Waitlist entry not found." };
  }

  await prisma.waitlistEntry.update({
    where: { id: entryId },
    data: { status },
  });

  revalidatePath("/admin/waitlist");
  return { success: true };
}

export async function deleteWaitlistEntry(
  entryId: string
): Promise<WaitlistActionState> {
  const session = await requireAuth();
  const businessId = session.user.businessId;

  const entry = await prisma.waitlistEntry.findFirst({
    where: { id: entryId, businessId },
  });

  if (!entry) {
    return { success: false, error: "Waitlist entry not found." };
  }

  await prisma.waitlistEntry.delete({
    where: { id: entryId },
  });

  revalidatePath("/admin/waitlist");
  return { success: true };
}
