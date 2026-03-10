import { describe, it, expect, vi, beforeEach } from "vitest";
import "../../__mocks__/prisma";
import "../../__mocks__/auth";
import { prismaMock } from "../../__mocks__/prisma";
import {
  BUSINESS_ID, BRANCH_ID, SERVICE_ID, CUSTOMER_ID, STAFF_ID, BOOKING_ID,
  makeService, makeCustomer, makeBooking, makeSettings, makeBranch,
} from "../../fixtures";

// Import after mocks are set up
const { createBooking, updateBookingStatus, deleteBooking } = await import(
  "@/app/admin/bookings/actions"
);

describe("createBooking", () => {
  const validInput = {
    serviceId: SERVICE_ID,
    customerId: CUSTOMER_ID,
    staffId: STAFF_ID,
    date: "2026-04-14",
    startTime: "10:00",
  };

  beforeEach(() => {
    vi.clearAllMocks();

    // Default happy-path mocks
    prismaMock.service.findFirst.mockResolvedValue(makeService());
    prismaMock.businessHours.findFirst.mockResolvedValue({
      id: "bh-1", businessId: BUSINESS_ID, branchId: BRANCH_ID,
      dayOfWeek: 2, startTime: "09:00", endTime: "18:00", isClosed: false,
    });
    prismaMock.holiday.findFirst.mockResolvedValue(null);
    prismaMock.staffHours.findFirst.mockResolvedValue({
      id: "sh-1", userId: STAFF_ID, dayOfWeek: 2,
      startTime: "09:00", endTime: "18:00", isActive: true,
    });
    prismaMock.booking.findMany.mockResolvedValue([]);
    prismaMock.settings.findUnique.mockResolvedValue(makeSettings());
    prismaMock.branch.findFirst.mockResolvedValue(makeBranch());
    prismaMock.booking.create.mockResolvedValue(
      makeBooking({ status: "PENDING" })
    );
    prismaMock.notification.create.mockResolvedValue({ id: "notif-1" });
  });

  it("creates a booking successfully", async () => {
    const result = await createBooking(validInput);
    expect(result.success).toBe(true);
    expect(result.bookingId).toBeDefined();
    expect(prismaMock.booking.create).toHaveBeenCalledOnce();
  });

  it("throws when service does not exist", async () => {
    prismaMock.service.findFirst.mockResolvedValue(null);

    await expect(createBooking(validInput)).rejects.toThrow("Service not found");
  });

  it("throws when slot is outside business hours", async () => {
    prismaMock.businessHours.findFirst.mockResolvedValue({
      id: "bh-1", businessId: BUSINESS_ID, branchId: null,
      dayOfWeek: 2, startTime: "11:00", endTime: "18:00", isClosed: false,
    });

    await expect(createBooking(validInput)).rejects.toThrow();
    expect(prismaMock.booking.create).not.toHaveBeenCalled();
  });

  it("throws when slot has a conflicting booking", async () => {
    prismaMock.booking.findMany.mockResolvedValue([
      makeBooking({ startTime: "10:00", endTime: "10:30" }),
    ]);

    await expect(createBooking(validInput)).rejects.toThrow();
    expect(prismaMock.booking.create).not.toHaveBeenCalled();
  });

  it("creates booking with CONFIRMED status when auto-confirm is enabled", async () => {
    prismaMock.settings.findUnique.mockResolvedValue(
      makeSettings({ autoConfirmBookings: true })
    );
    prismaMock.booking.create.mockResolvedValue(
      makeBooking({ status: "CONFIRMED" })
    );

    const result = await createBooking(validInput);
    expect(result.success).toBe(true);
    expect(prismaMock.booking.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: "CONFIRMED" }),
      })
    );
  });

  it("auto-assigns staff when staffId is not provided", async () => {
    prismaMock.staffService.findMany.mockResolvedValue([
      { userId: STAFF_ID, serviceId: SERVICE_ID, user: { id: STAFF_ID, isActive: true } },
    ]);

    const result = await createBooking({ ...validInput, staffId: null });
    expect(result.success).toBe(true);
  });

  it("creates a notification record on booking creation", async () => {
    await createBooking(validInput);
    expect(prismaMock.notification.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ type: "CONFIRMATION" }),
      })
    );
  });

  it("sets deposit fields correctly for services with deposit", async () => {
    prismaMock.service.findFirst.mockResolvedValue(
      makeService({ depositAmount: 2000, price: 8000 })
    );

    await createBooking(validInput);

    expect(prismaMock.booking.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          depositAmount: 2000,
          depositStatus: "PENDING",
          totalAmount: 8000,
        }),
      })
    );
  });

  it("sets depositStatus to NONE for services without deposit", async () => {
    prismaMock.service.findFirst.mockResolvedValue(
      makeService({ depositAmount: 0 })
    );

    await createBooking(validInput);

    expect(prismaMock.booking.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          depositStatus: "NONE",
        }),
      })
    );
  });
});

describe("updateBookingStatus", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.booking.findFirst.mockResolvedValue(
      makeBooking({ status: "PENDING", service: makeService() })
    );
    prismaMock.booking.update.mockResolvedValue(makeBooking({ status: "CONFIRMED" }));
    prismaMock.notification.create.mockResolvedValue({ id: "notif-1" });
    prismaMock.customerPackage.findFirst.mockResolvedValue(null);
    prismaMock.waitlistEntry.findMany.mockResolvedValue([]);
    prismaMock.waitlistEntry.updateMany.mockResolvedValue({ count: 0 });
  });

  it("transitions PENDING → CONFIRMED successfully", async () => {
    const result = await updateBookingStatus(BOOKING_ID, "CONFIRMED");
    expect(result.success).toBe(true);
    expect(prismaMock.booking.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: BOOKING_ID } })
    );
  });

  it("throws when booking not found", async () => {
    prismaMock.booking.findFirst.mockResolvedValue(null);
    await expect(updateBookingStatus(BOOKING_ID, "CONFIRMED")).rejects.toThrow(
      "Booking not found"
    );
  });

  it("throws on invalid transition", async () => {
    await expect(
      updateBookingStatus(BOOKING_ID, "COMPLETED")
    ).rejects.toThrow("Cannot transition from PENDING to COMPLETED");
  });

  it("creates a CONFIRMATION notification when confirming", async () => {
    await updateBookingStatus(BOOKING_ID, "CONFIRMED");
    expect(prismaMock.notification.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ type: "CONFIRMATION" }),
      })
    );
  });

  it("creates a CANCELLATION notification when cancelling", async () => {
    await updateBookingStatus(BOOKING_ID, "CANCELLED");
    expect(prismaMock.notification.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ type: "CANCELLATION" }),
      })
    );
  });

  it("sets deposit to REFUNDED when cancelling a PAID deposit booking", async () => {
    prismaMock.booking.findFirst.mockResolvedValue(
      makeBooking({ status: "PENDING", depositStatus: "PAID", service: makeService() })
    );

    await updateBookingStatus(BOOKING_ID, "CANCELLED");

    expect(prismaMock.booking.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ depositStatus: "REFUNDED" }),
      })
    );
  });

  it("notifies waitlist when booking is cancelled", async () => {
    prismaMock.booking.findFirst.mockResolvedValue(
      makeBooking({ status: "CONFIRMED", service: makeService() })
    );
    prismaMock.waitlistEntry.findMany.mockResolvedValue([
      { id: "wl-1", status: "WAITING" },
    ]);
    await updateBookingStatus(BOOKING_ID, "CANCELLED");
    expect(prismaMock.waitlistEntry.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "wl-1" },
        data: { status: "NOTIFIED" },
      })
    );
  });

  it("deducts package session when completing a booking", async () => {
    prismaMock.booking.findFirst.mockResolvedValue(
      makeBooking({ status: "IN_PROGRESS", service: makeService() })
    );
    prismaMock.customerPackage.findFirst.mockResolvedValue({
      id: "cp-1", remainingSessions: 3, status: "ACTIVE",
    });
    prismaMock.$transaction.mockImplementation(async (ops: any) => {
      if (Array.isArray(ops)) return Promise.all(ops);
      return ops(prismaMock);
    });
    prismaMock.customerPackage.update.mockResolvedValue({});
    prismaMock.packageUsage.create.mockResolvedValue({});

    await updateBookingStatus(BOOKING_ID, "COMPLETED");

    expect(prismaMock.customerPackage.findFirst).toHaveBeenCalled();
  });
});

describe("deleteBooking", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.booking.updateMany.mockResolvedValue({ count: 1 });
  });

  it("soft-deletes a cancelled booking by setting deletedAt", async () => {
    const result = await deleteBooking(BOOKING_ID);
    expect(result.success).toBe(true);
    expect(prismaMock.booking.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: BOOKING_ID,
          status: { in: ["CANCELLED", "NO_SHOW"] },
        }),
        data: expect.objectContaining({ deletedAt: expect.any(Date) }),
      })
    );
  });
});
