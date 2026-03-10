import { describe, it, expect, vi, beforeEach } from "vitest";
import "../../__mocks__/prisma";
import "../../__mocks__/auth";
import { prismaMock } from "../../__mocks__/prisma";
import { BUSINESS_ID, STAFF_ID, SERVICE_ID, makeStaff, makeStaffHours, makeService } from "../../fixtures";

const { updateStaffHours, toggleStaffService } = await import(
  "@/app/admin/staff/[id]/actions"
);

function makeFormData(data: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [k, v] of Object.entries(data)) fd.append(k, v);
  return fd;
}

const validHoursFields = {
  userId: STAFF_ID,
  dayOfWeek: "1",
  startTime: "09:00",
  endTime: "17:00",
  isActive: "true",
};

describe("updateStaffHours", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.user.findFirst.mockResolvedValue(makeStaff());
    prismaMock.staffHours.upsert.mockResolvedValue(makeStaffHours(1));
  });

  it("upserts staff hours successfully", async () => {
    const result = await updateStaffHours(makeFormData(validHoursFields));
    expect(result.success).toBe(true);
    expect(prismaMock.staffHours.upsert).toHaveBeenCalledOnce();
  });

  it("verifies user belongs to the business", async () => {
    await updateStaffHours(makeFormData(validHoursFields));
    expect(prismaMock.user.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ id: STAFF_ID, businessId: BUSINESS_ID }),
      })
    );
  });

  it("upserts using the userId_dayOfWeek composite key", async () => {
    await updateStaffHours(makeFormData(validHoursFields));
    expect(prismaMock.staffHours.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          userId_dayOfWeek: { userId: STAFF_ID, dayOfWeek: 1 },
        },
      })
    );
  });

  it("coerces dayOfWeek string to number", async () => {
    await updateStaffHours(makeFormData({ ...validHoursFields, dayOfWeek: "5" }));
    expect(prismaMock.staffHours.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          userId_dayOfWeek: { userId: STAFF_ID, dayOfWeek: 5 },
        },
      })
    );
  });

  it("stores the correct times in the upsert create/update", async () => {
    await updateStaffHours(makeFormData(validHoursFields));
    expect(prismaMock.staffHours.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({ startTime: "09:00", endTime: "17:00" }),
        update: expect.objectContaining({ startTime: "09:00", endTime: "17:00" }),
      })
    );
  });

  it("returns error when staff member not found", async () => {
    prismaMock.user.findFirst.mockResolvedValue(null);
    const result = await updateStaffHours(makeFormData(validHoursFields));
    expect(result.error).toBeDefined();
    expect(prismaMock.staffHours.upsert).not.toHaveBeenCalled();
  });

  it("returns error when startTime is not before endTime", async () => {
    const result = await updateStaffHours(
      makeFormData({ ...validHoursFields, startTime: "17:00", endTime: "09:00" })
    );
    expect(result.error).toBeDefined();
    expect(result.error).toMatch(/start time/i);
    expect(prismaMock.staffHours.upsert).not.toHaveBeenCalled();
  });

  it("returns error when startTime equals endTime", async () => {
    const result = await updateStaffHours(
      makeFormData({ ...validHoursFields, startTime: "09:00", endTime: "09:00" })
    );
    expect(result.error).toBeDefined();
    expect(prismaMock.staffHours.upsert).not.toHaveBeenCalled();
  });

  it("returns error for invalid time format", async () => {
    const result = await updateStaffHours(
      makeFormData({ ...validHoursFields, startTime: "9am" })
    );
    expect(result.error).toBeDefined();
    expect(prismaMock.staffHours.upsert).not.toHaveBeenCalled();
  });

  it("returns error for dayOfWeek out of range", async () => {
    const result = await updateStaffHours(
      makeFormData({ ...validHoursFields, dayOfWeek: "7" })
    );
    expect(result.error).toBeDefined();
    expect(prismaMock.staffHours.upsert).not.toHaveBeenCalled();
  });
});

describe("toggleStaffService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.user.findFirst.mockResolvedValue(makeStaff());
    prismaMock.service.findFirst.mockResolvedValue(makeService());
    prismaMock.staffService.findUnique.mockResolvedValue(null); // not assigned yet
    prismaMock.staffService.create.mockResolvedValue({ id: "ss-1", userId: STAFF_ID, serviceId: SERVICE_ID });
  });

  it("assigns a service to staff when not yet assigned", async () => {
    const result = await toggleStaffService(STAFF_ID, SERVICE_ID);
    expect(result.success).toBe(true);
    expect(prismaMock.staffService.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { userId: STAFF_ID, serviceId: SERVICE_ID },
      })
    );
    expect(prismaMock.staffService.delete).not.toHaveBeenCalled();
  });

  it("removes a service from staff when already assigned", async () => {
    prismaMock.staffService.findUnique.mockResolvedValue({ id: "ss-1", userId: STAFF_ID, serviceId: SERVICE_ID });
    prismaMock.staffService.delete.mockResolvedValue({ id: "ss-1" });

    const result = await toggleStaffService(STAFF_ID, SERVICE_ID);
    expect(result.success).toBe(true);
    expect(prismaMock.staffService.delete).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: "ss-1" } })
    );
    expect(prismaMock.staffService.create).not.toHaveBeenCalled();
  });

  it("looks up assignment using userId_serviceId composite key", async () => {
    await toggleStaffService(STAFF_ID, SERVICE_ID);
    expect(prismaMock.staffService.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId_serviceId: { userId: STAFF_ID, serviceId: SERVICE_ID } },
      })
    );
  });

  it("verifies user belongs to the business", async () => {
    await toggleStaffService(STAFF_ID, SERVICE_ID);
    expect(prismaMock.user.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ id: STAFF_ID, businessId: BUSINESS_ID }),
      })
    );
  });

  it("verifies service belongs to the business", async () => {
    await toggleStaffService(STAFF_ID, SERVICE_ID);
    expect(prismaMock.service.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ id: SERVICE_ID, businessId: BUSINESS_ID }),
      })
    );
  });

  it("returns error when staff member not found", async () => {
    prismaMock.user.findFirst.mockResolvedValue(null);
    const result = await toggleStaffService(STAFF_ID, SERVICE_ID);
    expect(result.error).toBeDefined();
    expect(prismaMock.staffService.create).not.toHaveBeenCalled();
    expect(prismaMock.staffService.delete).not.toHaveBeenCalled();
  });

  it("returns error when service not found", async () => {
    prismaMock.service.findFirst.mockResolvedValue(null);
    const result = await toggleStaffService(STAFF_ID, SERVICE_ID);
    expect(result.error).toBeDefined();
    expect(prismaMock.staffService.create).not.toHaveBeenCalled();
    expect(prismaMock.staffService.delete).not.toHaveBeenCalled();
  });
});
