import { describe, it, expect, vi, beforeEach } from "vitest";
import "../../../tests/__mocks__/prisma";
import { prismaMock } from "../../../tests/__mocks__/prisma";
import {
  canTransition,
  getStatusColor,
  addMinutes,
  subtractMinutes,
  generateTimeSlots,
  checkSlotAvailability,
  VALID_TRANSITIONS,
  BOOKING_STATUSES,
} from "@/lib/booking-utils";
import {
  BUSINESS_ID,
  makeBusinessHours,
  makeStaffHours,
  makeBooking,
  makeService,
} from "../../fixtures";

// ─── canTransition ────────────────────────────────────────────────────────────

describe("canTransition", () => {
  it("allows PENDING → CONFIRMED", () => {
    expect(canTransition("PENDING", "CONFIRMED")).toBe(true);
  });

  it("allows PENDING → CANCELLED", () => {
    expect(canTransition("PENDING", "CANCELLED")).toBe(true);
  });

  it("allows CONFIRMED → IN_PROGRESS", () => {
    expect(canTransition("CONFIRMED", "IN_PROGRESS")).toBe(true);
  });

  it("allows CONFIRMED → CANCELLED", () => {
    expect(canTransition("CONFIRMED", "CANCELLED")).toBe(true);
  });

  it("allows CONFIRMED → NO_SHOW", () => {
    expect(canTransition("CONFIRMED", "NO_SHOW")).toBe(true);
  });

  it("allows IN_PROGRESS → COMPLETED", () => {
    expect(canTransition("IN_PROGRESS", "COMPLETED")).toBe(true);
  });

  it("blocks PENDING → COMPLETED (skipping steps)", () => {
    expect(canTransition("PENDING", "COMPLETED")).toBe(false);
  });

  it("blocks PENDING → IN_PROGRESS (skipping steps)", () => {
    expect(canTransition("PENDING", "IN_PROGRESS")).toBe(false);
  });

  it("blocks COMPLETED → any status (terminal)", () => {
    for (const status of BOOKING_STATUSES) {
      expect(canTransition("COMPLETED", status)).toBe(false);
    }
  });

  it("blocks CANCELLED → any status (terminal)", () => {
    for (const status of BOOKING_STATUSES) {
      expect(canTransition("CANCELLED", status)).toBe(false);
    }
  });

  it("blocks NO_SHOW → any status (terminal)", () => {
    for (const status of BOOKING_STATUSES) {
      expect(canTransition("NO_SHOW", status)).toBe(false);
    }
  });

  it("returns false for unknown status", () => {
    expect(canTransition("UNKNOWN", "CONFIRMED")).toBe(false);
  });

  it("all defined transitions are valid paths", () => {
    for (const [from, tos] of Object.entries(VALID_TRANSITIONS)) {
      for (const to of tos) {
        expect(canTransition(from, to)).toBe(true);
      }
    }
  });
});

// ─── getStatusColor ───────────────────────────────────────────────────────────

describe("getStatusColor", () => {
  it("returns warning for PENDING", () => {
    expect(getStatusColor("PENDING")).toBe("warning");
  });

  it("returns default for CONFIRMED", () => {
    expect(getStatusColor("CONFIRMED")).toBe("default");
  });

  it("returns default for IN_PROGRESS", () => {
    expect(getStatusColor("IN_PROGRESS")).toBe("default");
  });

  it("returns success for COMPLETED", () => {
    expect(getStatusColor("COMPLETED")).toBe("success");
  });

  it("returns destructive for CANCELLED", () => {
    expect(getStatusColor("CANCELLED")).toBe("destructive");
  });

  it("returns destructive for NO_SHOW", () => {
    expect(getStatusColor("NO_SHOW")).toBe("destructive");
  });

  it("returns secondary for unknown status", () => {
    expect(getStatusColor("UNKNOWN")).toBe("secondary");
    expect(getStatusColor("")).toBe("secondary");
  });
});

// ─── addMinutes ───────────────────────────────────────────────────────────────

describe("addMinutes", () => {
  it("adds 30 minutes", () => {
    expect(addMinutes("09:00", 30)).toBe("09:30");
  });

  it("adds minutes crossing the hour", () => {
    expect(addMinutes("09:45", 30)).toBe("10:15");
  });

  it("adds minutes crossing midnight (wraps)", () => {
    expect(addMinutes("23:45", 30)).toBe("00:15");
  });

  it("adds 0 minutes (no change)", () => {
    expect(addMinutes("10:30", 0)).toBe("10:30");
  });

  it("adds 60 minutes = +1 hour", () => {
    expect(addMinutes("09:00", 60)).toBe("10:00");
  });

  it("adds 90 minutes = +1.5 hours", () => {
    expect(addMinutes("10:00", 90)).toBe("11:30");
  });

  it("subtracts minutes (negative)", () => {
    expect(addMinutes("10:30", -30)).toBe("10:00");
  });

  it("preserves zero-padded output", () => {
    expect(addMinutes("08:05", 5)).toBe("08:10");
  });

  it("handles end of day", () => {
    expect(addMinutes("17:00", 60)).toBe("18:00");
  });
});

// ─── subtractMinutes ──────────────────────────────────────────────────────────

describe("subtractMinutes", () => {
  it("subtracts 10 minutes", () => {
    expect(subtractMinutes("10:30", 10)).toBe("10:20");
  });

  it("subtracts minutes crossing the hour", () => {
    expect(subtractMinutes("10:00", 30)).toBe("09:30");
  });

  it("is inverse of addMinutes", () => {
    const base = "14:00";
    expect(subtractMinutes(addMinutes(base, 45), 45)).toBe(base);
  });
});

// ─── generateTimeSlots ────────────────────────────────────────────────────────

describe("generateTimeSlots", () => {
  it("generates 30-minute slots for a 2-hour window", () => {
    const slots = generateTimeSlots("09:00", "11:00", 30);
    expect(slots).toEqual(["09:00", "09:30", "10:00", "10:30"]);
  });

  it("generates 15-minute slots", () => {
    const slots = generateTimeSlots("09:00", "10:00", 15);
    expect(slots).toEqual(["09:00", "09:15", "09:30", "09:45"]);
  });

  it("excludes the end time itself", () => {
    const slots = generateTimeSlots("09:00", "09:30", 30);
    expect(slots).toEqual(["09:00"]);
    expect(slots).not.toContain("09:30");
  });

  it("returns empty array when start >= end", () => {
    expect(generateTimeSlots("10:00", "10:00", 30)).toEqual([]);
    expect(generateTimeSlots("10:30", "10:00", 30)).toEqual([]);
  });

  it("generates 60-minute slots for full working day", () => {
    const slots = generateTimeSlots("09:00", "18:00", 60);
    expect(slots).toHaveLength(9);
    expect(slots[0]).toBe("09:00");
    expect(slots[slots.length - 1]).toBe("17:00");
  });

  it("handles 1-minute interval", () => {
    const slots = generateTimeSlots("09:00", "09:03", 1);
    expect(slots).toEqual(["09:00", "09:01", "09:02"]);
  });
});

// ─── checkSlotAvailability ───────────────────────────────────────────────────

describe("checkSlotAvailability", () => {
  const baseParams = {
    businessId: BUSINESS_ID,
    date: "2026-04-14", // Tuesday
    startTime: "10:00",
    endTime: "10:30",
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns unavailable when business is closed on that day", async () => {
    prismaMock.businessHours.findFirst.mockResolvedValue(
      makeBusinessHours(2, { isClosed: true })
    );

    const result = await checkSlotAvailability(baseParams);
    expect(result.available).toBe(false);
    expect(result.reason).toBe("Business is closed on this day");
  });

  it("returns unavailable when no business hours exist for that day", async () => {
    prismaMock.businessHours.findFirst.mockResolvedValue(null);

    const result = await checkSlotAvailability(baseParams);
    expect(result.available).toBe(false);
    expect(result.reason).toBe("Business is closed on this day");
  });

  it("returns unavailable when slot starts before business opens", async () => {
    prismaMock.businessHours.findFirst.mockResolvedValue(
      makeBusinessHours(2, { startTime: "10:30", endTime: "18:00" })
    );

    const result = await checkSlotAvailability(baseParams);
    expect(result.available).toBe(false);
    expect(result.reason).toBe("Outside business hours");
  });

  it("returns unavailable when slot ends after business closes", async () => {
    prismaMock.businessHours.findFirst.mockResolvedValue(
      makeBusinessHours(2, { startTime: "09:00", endTime: "10:15" })
    );

    const result = await checkSlotAvailability(baseParams);
    expect(result.available).toBe(false);
    expect(result.reason).toBe("Outside business hours");
  });

  it("returns unavailable on a holiday", async () => {
    prismaMock.businessHours.findFirst.mockResolvedValue(makeBusinessHours(2));
    prismaMock.holiday.findFirst.mockResolvedValue({
      id: "holiday-1",
      name: "Christmas",
      date: "2026-04-14",
      isClosed: true,
      businessId: BUSINESS_ID,
      branchId: null,
    });

    const result = await checkSlotAvailability(baseParams);
    expect(result.available).toBe(false);
    expect(result.reason).toBe("Closed for Christmas");
  });

  it("returns unavailable when staff has no hours on that day", async () => {
    prismaMock.businessHours.findFirst.mockResolvedValue(makeBusinessHours(2));
    prismaMock.holiday.findFirst.mockResolvedValue(null);
    prismaMock.staffHours.findFirst.mockResolvedValue(null);

    const result = await checkSlotAvailability({
      ...baseParams,
      staffId: "staff-1",
    });
    expect(result.available).toBe(false);
    expect(result.reason).toBe("Staff is not available on this day");
  });

  it("returns unavailable when slot is outside staff hours", async () => {
    prismaMock.businessHours.findFirst.mockResolvedValue(makeBusinessHours(2));
    prismaMock.holiday.findFirst.mockResolvedValue(null);
    prismaMock.staffHours.findFirst.mockResolvedValue(
      makeStaffHours(2, { startTime: "11:00", endTime: "17:00" })
    );

    const result = await checkSlotAvailability({
      ...baseParams,
      staffId: "staff-1",
    });
    expect(result.available).toBe(false);
    expect(result.reason).toBe("Outside staff working hours");
  });

  it("returns available when slot is within business hours and no conflicts", async () => {
    prismaMock.businessHours.findFirst.mockResolvedValue(makeBusinessHours(2));
    prismaMock.holiday.findFirst.mockResolvedValue(null);
    prismaMock.booking.findMany.mockResolvedValue([]);

    const result = await checkSlotAvailability(baseParams);
    expect(result.available).toBe(true);
  });

  it("returns unavailable when a conflicting booking exists", async () => {
    prismaMock.businessHours.findFirst.mockResolvedValue(makeBusinessHours(2));
    prismaMock.holiday.findFirst.mockResolvedValue(null);
    // Existing booking 10:00-10:30 overlaps with our 10:00-10:30
    prismaMock.booking.findMany.mockResolvedValue([
      makeBooking({ startTime: "10:00", endTime: "10:30" }),
    ]);

    const result = await checkSlotAvailability(baseParams);
    expect(result.available).toBe(false);
    expect(result.reason).toContain("conflicting booking");
  });

  it("returns unavailable when new booking overlaps start of existing", async () => {
    prismaMock.businessHours.findFirst.mockResolvedValue(makeBusinessHours(2));
    prismaMock.holiday.findFirst.mockResolvedValue(null);
    // Existing: 10:15-10:45; New: 10:00-10:30 → overlap
    prismaMock.booking.findMany.mockResolvedValue([
      makeBooking({ startTime: "10:15", endTime: "10:45" }),
    ]);

    const result = await checkSlotAvailability(baseParams);
    expect(result.available).toBe(false);
  });

  it("returns available when new booking ends exactly when existing starts", async () => {
    prismaMock.businessHours.findFirst.mockResolvedValue(makeBusinessHours(2));
    prismaMock.holiday.findFirst.mockResolvedValue(null);
    // Existing: 10:30-11:00; New: 10:00-10:30 → back-to-back, no overlap
    prismaMock.booking.findMany.mockResolvedValue([
      makeBooking({
        startTime: "10:30",
        endTime: "11:00",
        service: makeService({ bufferBefore: 0, bufferAfter: 0 }),
      }),
    ]);

    const result = await checkSlotAvailability(baseParams);
    expect(result.available).toBe(true);
  });

  it("respects bufferAfter on existing booking", async () => {
    prismaMock.businessHours.findFirst.mockResolvedValue(makeBusinessHours(2));
    prismaMock.holiday.findFirst.mockResolvedValue(null);
    // Existing: 09:00-09:30 with 10 min buffer after → effective end 09:40
    // New: 10:00-10:30 with bufferBefore:0 → buffered start 10:00
    // 10:00 >= 09:40 → no conflict
    prismaMock.booking.findMany.mockResolvedValue([
      makeBooking({
        startTime: "09:00",
        endTime: "09:30",
        service: makeService({ bufferBefore: 0, bufferAfter: 10 }),
      }),
    ]);

    const result = await checkSlotAvailability(baseParams);
    expect(result.available).toBe(true);
  });

  it("blocks when new booking violates existing booking bufferAfter", async () => {
    prismaMock.businessHours.findFirst.mockResolvedValue(makeBusinessHours(2));
    prismaMock.holiday.findFirst.mockResolvedValue(null);
    // Existing: 09:30-10:00 with 15 min bufferAfter → effective end 10:15
    // New: 10:00-10:30 → buffered start 10:00 < 10:15 → conflict
    prismaMock.booking.findMany.mockResolvedValue([
      makeBooking({
        startTime: "09:30",
        endTime: "10:00",
        service: makeService({ bufferBefore: 0, bufferAfter: 15 }),
      }),
    ]);

    const result = await checkSlotAvailability(baseParams);
    expect(result.available).toBe(false);
  });

  it("respects bufferBefore on new booking", async () => {
    prismaMock.businessHours.findFirst.mockResolvedValue(makeBusinessHours(2));
    prismaMock.holiday.findFirst.mockResolvedValue(null);
    // Existing: 09:30-10:00 (no buffer); new slot 10:00-10:30 with 10 min bufferBefore
    // → bufferedStart = 09:50, existing bufferedEnd = 10:00
    // 09:50 < 10:00 && 10:30 > 09:30 → overlap
    prismaMock.booking.findMany.mockResolvedValue([
      makeBooking({
        startTime: "09:30",
        endTime: "10:00",
        service: makeService({ bufferBefore: 0, bufferAfter: 0 }),
      }),
    ]);

    const result = await checkSlotAvailability({
      ...baseParams,
      bufferBefore: 10,
    });
    expect(result.available).toBe(false);
  });

  it("excludes the booking being rescheduled from conflict check", async () => {
    prismaMock.businessHours.findFirst.mockResolvedValue(makeBusinessHours(2));
    prismaMock.holiday.findFirst.mockResolvedValue(null);
    prismaMock.booking.findMany.mockResolvedValue([]); // excluded

    const result = await checkSlotAvailability({
      ...baseParams,
      excludeBookingId: "booking-001",
    });
    expect(result.available).toBe(true);
    // Confirm the where clause included the exclusion
    expect(prismaMock.booking.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: { not: "booking-001" },
        }),
      })
    );
  });

  it("filters conflicting bookings by staffId when provided", async () => {
    prismaMock.businessHours.findFirst.mockResolvedValue(makeBusinessHours(2));
    prismaMock.holiday.findFirst.mockResolvedValue(null);
    prismaMock.staffHours.findFirst.mockResolvedValue(makeStaffHours(2));
    prismaMock.booking.findMany.mockResolvedValue([]);

    await checkSlotAvailability({ ...baseParams, staffId: "staff-1" });

    expect(prismaMock.booking.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ staffId: "staff-1" }),
      })
    );
  });

  it("staff-scoped conflict message mentions staff", async () => {
    prismaMock.businessHours.findFirst.mockResolvedValue(makeBusinessHours(2));
    prismaMock.holiday.findFirst.mockResolvedValue(null);
    prismaMock.staffHours.findFirst.mockResolvedValue(makeStaffHours(2));
    prismaMock.booking.findMany.mockResolvedValue([
      makeBooking({ startTime: "10:00", endTime: "10:30" }),
    ]);

    const result = await checkSlotAvailability({
      ...baseParams,
      staffId: "staff-1",
    });
    expect(result.available).toBe(false);
    expect(result.reason).toContain("Staff has a conflicting booking");
  });
});
