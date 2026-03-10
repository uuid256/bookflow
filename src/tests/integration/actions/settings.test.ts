import { describe, it, expect, vi, beforeEach } from "vitest";
import "../../__mocks__/prisma";
import "../../__mocks__/auth";
import { prismaMock } from "../../__mocks__/prisma";
import { BUSINESS_ID, BRANCH_ID, makeBranch, makeSettings } from "../../fixtures";

const { updateBusinessHours, updateSettings, addHoliday, deleteHoliday } = await import(
  "@/app/admin/settings/actions"
);

describe("updateBusinessHours", () => {
  const validInput = {
    dayOfWeek: 1,
    startTime: "09:00",
    endTime: "17:00",
    isClosed: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.branch.findFirst.mockResolvedValue(makeBranch());
    prismaMock.businessHours.upsert.mockResolvedValue({
      id: "bh-1",
      businessId: BUSINESS_ID,
      branchId: BRANCH_ID,
      dayOfWeek: 1,
      startTime: "09:00",
      endTime: "17:00",
      isClosed: false,
    });
  });

  it("upserts business hours successfully", async () => {
    const result = await updateBusinessHours(validInput);
    expect(result.success).toBe(true);
    expect(prismaMock.businessHours.upsert).toHaveBeenCalledOnce();
  });

  it("looks up branch for the business", async () => {
    await updateBusinessHours(validInput);
    expect(prismaMock.branch.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ businessId: BUSINESS_ID }),
      })
    );
  });

  it("upserts with correct dayOfWeek and times", async () => {
    await updateBusinessHours(validInput);
    expect(prismaMock.businessHours.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: expect.objectContaining({
          startTime: "09:00",
          endTime: "17:00",
          isClosed: false,
        }),
        create: expect.objectContaining({
          dayOfWeek: 1,
          startTime: "09:00",
          endTime: "17:00",
        }),
      })
    );
  });

  it("marks the day as closed when isClosed is true", async () => {
    await updateBusinessHours({ ...validInput, isClosed: true });
    expect(prismaMock.businessHours.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: expect.objectContaining({ isClosed: true }),
      })
    );
  });

  it("uses null branchId when no branch exists", async () => {
    prismaMock.branch.findFirst.mockResolvedValue(null);
    await updateBusinessHours(validInput);
    expect(prismaMock.businessHours.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({ branchId: null }),
      })
    );
  });

  it("throws when time format is invalid", async () => {
    await expect(
      updateBusinessHours({ ...validInput, startTime: "9:00" })
    ).rejects.toThrow();
    expect(prismaMock.businessHours.upsert).not.toHaveBeenCalled();
  });

  it("throws when dayOfWeek is out of range", async () => {
    await expect(
      updateBusinessHours({ ...validInput, dayOfWeek: 7 })
    ).rejects.toThrow();
    expect(prismaMock.businessHours.upsert).not.toHaveBeenCalled();
  });
});

describe("updateSettings", () => {
  const validInput = {
    cancellationWindowHours: 24,
    rescheduleWindowHours: 12,
    autoConfirmBookings: false,
    maxAdvanceBookingDays: 60,
    minAdvanceBookingHours: 2,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.settings.upsert.mockResolvedValue(makeSettings(validInput));
  });

  it("upserts settings successfully", async () => {
    const result = await updateSettings(validInput);
    expect(result.success).toBe(true);
    expect(prismaMock.settings.upsert).toHaveBeenCalledOnce();
  });

  it("upserts scoped to businessId", async () => {
    await updateSettings(validInput);
    expect(prismaMock.settings.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { businessId: BUSINESS_ID },
        create: expect.objectContaining({ businessId: BUSINESS_ID }),
      })
    );
  });

  it("persists autoConfirmBookings when true", async () => {
    await updateSettings({ ...validInput, autoConfirmBookings: true });
    expect(prismaMock.settings.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        update: expect.objectContaining({ autoConfirmBookings: true }),
      })
    );
  });

  it("throws when cancellationWindowHours is negative", async () => {
    await expect(
      updateSettings({ ...validInput, cancellationWindowHours: -1 })
    ).rejects.toThrow();
    expect(prismaMock.settings.upsert).not.toHaveBeenCalled();
  });

  it("throws when maxAdvanceBookingDays is zero", async () => {
    await expect(
      updateSettings({ ...validInput, maxAdvanceBookingDays: 0 })
    ).rejects.toThrow();
    expect(prismaMock.settings.upsert).not.toHaveBeenCalled();
  });
});

describe("addHoliday", () => {
  const validInput = {
    date: "2026-12-25",
    name: "Christmas Day",
  };

  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.branch.findFirst.mockResolvedValue(makeBranch());
    prismaMock.holiday.create.mockResolvedValue({
      id: "holiday-1",
      businessId: BUSINESS_ID,
      branchId: BRANCH_ID,
      date: "2026-12-25",
      name: "Christmas Day",
    });
  });

  it("creates a holiday successfully", async () => {
    const result = await addHoliday(validInput);
    expect(result.success).toBe(true);
    expect(prismaMock.holiday.create).toHaveBeenCalledOnce();
  });

  it("scopes holiday to businessId", async () => {
    await addHoliday(validInput);
    expect(prismaMock.holiday.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ businessId: BUSINESS_ID }),
      })
    );
  });

  it("associates holiday with the branch when one exists", async () => {
    await addHoliday(validInput);
    expect(prismaMock.holiday.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ branchId: BRANCH_ID }),
      })
    );
  });

  it("uses null branchId when no branch exists", async () => {
    prismaMock.branch.findFirst.mockResolvedValue(null);
    await addHoliday(validInput);
    expect(prismaMock.holiday.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ branchId: null }),
      })
    );
  });

  it("throws when date format is invalid", async () => {
    await expect(
      addHoliday({ ...validInput, date: "25-12-2026" })
    ).rejects.toThrow();
    expect(prismaMock.holiday.create).not.toHaveBeenCalled();
  });

  it("throws when name is empty", async () => {
    await expect(
      addHoliday({ ...validInput, name: "" })
    ).rejects.toThrow();
    expect(prismaMock.holiday.create).not.toHaveBeenCalled();
  });
});

describe("deleteHoliday", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.holiday.deleteMany.mockResolvedValue({ count: 1 });
  });

  it("deletes a holiday successfully", async () => {
    const result = await deleteHoliday("holiday-1");
    expect(result.success).toBe(true);
    expect(prismaMock.holiday.deleteMany).toHaveBeenCalledOnce();
  });

  it("scopes deletion to businessId for ownership safety", async () => {
    await deleteHoliday("holiday-1");
    expect(prismaMock.holiday.deleteMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ id: "holiday-1", businessId: BUSINESS_ID }),
      })
    );
  });

  it("returns success even when no matching holiday exists", async () => {
    prismaMock.holiday.deleteMany.mockResolvedValue({ count: 0 });
    const result = await deleteHoliday("nonexistent-id");
    expect(result.success).toBe(true);
  });
});
