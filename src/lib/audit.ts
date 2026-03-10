import { prisma } from "@/lib/prisma";

/**
 * Write an immutable audit log entry for an admin operation.
 * Failures are logged to stderr but do NOT throw — audit logging
 * must never break the primary operation.
 */
export async function logAudit(params: {
  businessId: string;
  userId: string;
  action: string;
  resourceType: string;
  resourceId: string;
  details?: Record<string, unknown>;
}): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        businessId: params.businessId,
        userId: params.userId,
        action: params.action,
        resourceType: params.resourceType,
        resourceId: params.resourceId,
        details: params.details ? JSON.stringify(params.details) : undefined,
      },
    });
  } catch (err) {
    console.error("[audit] Failed to write audit log:", err);
  }
}
