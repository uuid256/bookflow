import { describe, it, expect, vi, beforeEach } from "vitest";
import "../../__mocks__/prisma";
import "../../__mocks__/auth";
import { prismaMock } from "../../__mocks__/prisma";
import { BUSINESS_ID, SERVICE_ID, CUSTOMER_ID } from "../../fixtures";

const { updateWaitlistStatus, deleteWaitlistEntry } = await import(
  "@/app/admin/waitlist/actions"
);

const ENTRY_ID = "waitlist-entry-1";

function makeWaitlistEntry(overrides = {}) {
  return {
    id: ENTRY_ID,
    businessId: BUSINESS_ID,
    serviceId: SERVICE_ID,
    customerId: CUSTOMER_ID,
    status: "WAITING",
    createdAt: new Date("2026-01-01"),
    updatedAt: new Date("2026-01-01"),
    ...overrides,
  };
}

describe("updateWaitlistStatus", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.waitlistEntry.findFirst.mockResolvedValue(makeWaitlistEntry());
    prismaMock.waitlistEntry.update.mockResolvedValue(
      makeWaitlistEntry({ status: "NOTIFIED" })
    );
  });

  it("updates status to NOTIFIED successfully", async () => {
    const result = await updateWaitlistStatus(ENTRY_ID, "NOTIFIED");
    expect(result.success).toBe(true);
    expect(prismaMock.waitlistEntry.update).toHaveBeenCalledOnce();
  });

  it("updates status to BOOKED successfully", async () => {
    prismaMock.waitlistEntry.update.mockResolvedValue(
      makeWaitlistEntry({ status: "BOOKED" })
    );
    const result = await updateWaitlistStatus(ENTRY_ID, "BOOKED");
    expect(result.success).toBe(true);
  });

  it("updates status to CANCELLED successfully", async () => {
    prismaMock.waitlistEntry.update.mockResolvedValue(
      makeWaitlistEntry({ status: "CANCELLED" })
    );
    const result = await updateWaitlistStatus(ENTRY_ID, "CANCELLED");
    expect(result.success).toBe(true);
  });

  it("verifies ownership by scoping findFirst to businessId", async () => {
    await updateWaitlistStatus(ENTRY_ID, "NOTIFIED");
    expect(prismaMock.waitlistEntry.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ id: ENTRY_ID, businessId: BUSINESS_ID }),
      })
    );
  });

  it("returns error when entry not found", async () => {
    prismaMock.waitlistEntry.findFirst.mockResolvedValue(null);
    const result = await updateWaitlistStatus(ENTRY_ID, "NOTIFIED");
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/not found/i);
    expect(prismaMock.waitlistEntry.update).not.toHaveBeenCalled();
  });

  it("updates with the correct entryId and new status", async () => {
    await updateWaitlistStatus(ENTRY_ID, "NOTIFIED");
    expect(prismaMock.waitlistEntry.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: ENTRY_ID },
        data: { status: "NOTIFIED" },
      })
    );
  });

  it("returns error for an invalid status value", async () => {
    // Cast to bypass TypeScript so we can test the runtime guard
    const result = await updateWaitlistStatus(ENTRY_ID, "INVALID" as any);
    expect(result.success).toBe(false);
    expect(result.error).toBeDefined();
    expect(prismaMock.waitlistEntry.findFirst).not.toHaveBeenCalled();
    expect(prismaMock.waitlistEntry.update).not.toHaveBeenCalled();
  });
});

describe("deleteWaitlistEntry", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.waitlistEntry.findFirst.mockResolvedValue(makeWaitlistEntry());
    prismaMock.waitlistEntry.delete.mockResolvedValue(makeWaitlistEntry());
  });

  it("deletes a waitlist entry successfully", async () => {
    const result = await deleteWaitlistEntry(ENTRY_ID);
    expect(result.success).toBe(true);
    expect(prismaMock.waitlistEntry.delete).toHaveBeenCalledOnce();
  });

  it("verifies ownership before deleting", async () => {
    await deleteWaitlistEntry(ENTRY_ID);
    expect(prismaMock.waitlistEntry.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ id: ENTRY_ID, businessId: BUSINESS_ID }),
      })
    );
  });

  it("returns error when entry not found", async () => {
    prismaMock.waitlistEntry.findFirst.mockResolvedValue(null);
    const result = await deleteWaitlistEntry(ENTRY_ID);
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/not found/i);
    expect(prismaMock.waitlistEntry.delete).not.toHaveBeenCalled();
  });

  it("deletes by the correct entryId", async () => {
    await deleteWaitlistEntry(ENTRY_ID);
    expect(prismaMock.waitlistEntry.delete).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: ENTRY_ID } })
    );
  });
});
