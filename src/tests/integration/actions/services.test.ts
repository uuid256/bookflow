import { describe, it, expect, vi, beforeEach } from "vitest";
import "../../__mocks__/prisma";
import "../../__mocks__/auth";
import { prismaMock } from "../../__mocks__/prisma";
import { BUSINESS_ID, SERVICE_ID, makeService } from "../../fixtures";

const { createService, updateService, deleteService } = await import(
  "@/app/admin/services/actions"
);

const validServiceInput = {
  name: "Deep Tissue Massage",
  description: "60-minute session",
  durationMinutes: 60,
  price: 8000,
  depositAmount: 0,
  bufferBefore: 5,
  bufferAfter: 10,
  isActive: true,
};

describe("createService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.service.aggregate.mockResolvedValue({ _max: { sortOrder: 2 } });
    prismaMock.service.create.mockResolvedValue(makeService());
  });

  it("creates a service successfully", async () => {
    const result = await createService(validServiceInput);
    expect(result.success).toBe(true);
    expect(prismaMock.service.create).toHaveBeenCalledOnce();
  });

  it("scopes service to businessId from session", async () => {
    await createService(validServiceInput);
    expect(prismaMock.service.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ businessId: BUSINESS_ID }),
      })
    );
  });

  it("auto-increments sortOrder", async () => {
    await createService(validServiceInput);
    expect(prismaMock.service.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ sortOrder: 3 }),
      })
    );
  });

  it("defaults sortOrder to 1 when no services exist", async () => {
    prismaMock.service.aggregate.mockResolvedValue({ _max: { sortOrder: null } });
    await createService(validServiceInput);
    expect(prismaMock.service.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ sortOrder: 1 }),
      })
    );
  });

  it("rejects invalid input (name too short)", async () => {
    const result = await createService({ ...validServiceInput, name: "" });
    expect(result.error).toBeDefined();
  });

  it("rejects negative price", async () => {
    const result = await createService({ ...validServiceInput, price: -100 });
    expect(result.error).toBeDefined();
  });

  it("rejects zero or negative duration", async () => {
    const result = await createService({ ...validServiceInput, durationMinutes: 0 });
    expect(result.error).toBeDefined();
  });
});

describe("updateService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.service.findFirst.mockResolvedValue(makeService());
    prismaMock.service.update.mockResolvedValue(makeService({ name: "Updated" }));
  });

  it("updates a service successfully", async () => {
    const result = await updateService(SERVICE_ID, { ...validServiceInput, name: "Updated" });
    expect(result.success).toBe(true);
    expect(prismaMock.service.update).toHaveBeenCalledOnce();
  });

  it("returns error when service not found", async () => {
    prismaMock.service.findFirst.mockResolvedValue(null);
    const result = await updateService(SERVICE_ID, validServiceInput);
    expect(result.error).toBeDefined();
  });

  it("verifies business ownership before updating", async () => {
    await updateService(SERVICE_ID, validServiceInput);
    expect(prismaMock.service.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ businessId: BUSINESS_ID }),
      })
    );
  });
});

describe("deleteService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.service.findFirst.mockResolvedValue(makeService());
    prismaMock.service.delete.mockResolvedValue(makeService());
  });

  it("deletes a service successfully", async () => {
    const result = await deleteService(SERVICE_ID);
    expect(result.success).toBe(true);
  });

  it("returns error when service not found", async () => {
    prismaMock.service.findFirst.mockResolvedValue(null);
    const result = await deleteService(SERVICE_ID);
    expect(result.error).toBeDefined();
  });
});
