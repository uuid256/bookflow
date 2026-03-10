import { describe, it, expect, vi, beforeEach } from "vitest";
import "../__mocks__/prisma";
import { prismaMock } from "../__mocks__/prisma";
import { NextRequest } from "next/server";
import { BOOKING_ID, BUSINESS_ID, STAFF_ID, makeBooking, makeSettings, makeService } from "../fixtures";

const { POST } = await import("@/app/api/bookings/[id]/reschedule/route");

function makeRequest(body: object) {
  return new NextRequest("http://localhost/api/bookings/booking-001/reschedule", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

function makeParams(id = BOOKING_ID) {
  return Promise.resolve({ id });
}

function futureDateStr(hoursFromNow: number) {
  const d = new Date();
  d.setHours(d.getHours() + hoursFromNow);
  return {
    date: d.toISOString().split("T")[0],
    startTime: `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`,
  };
}

describe("POST /api/bookings/[id]/reschedule", () => {
  const newDateTime = { date: "2026-05-01", startTime: "14:00" };

  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.settings.findUnique.mockResolvedValue(makeSettings());
    prismaMock.businessHours.findFirst.mockResolvedValue({
      id: "bh-1", businessId: BUSINESS_ID, branchId: null,
      dayOfWeek: 4, startTime: "09:00", endTime: "18:00", isClosed: false,
    });
    prismaMock.holiday.findFirst.mockResolvedValue(null);
    prismaMock.staffHours.findFirst.mockResolvedValue({
      id: "sh-4", userId: STAFF_ID, dayOfWeek: 4,
      startTime: "09:00", endTime: "18:00", isActive: true,
    });
    prismaMock.booking.findMany.mockResolvedValue([]);
    prismaMock.$transaction.mockImplementation(async (ops: any[]) => Promise.all(ops));
    prismaMock.booking.update.mockResolvedValue({});
    prismaMock.notification.create.mockResolvedValue({});
  });

  it("returns 400 for invalid date format", async () => {
    prismaMock.booking.findUnique.mockResolvedValue(
      makeBooking({ status: "CONFIRMED", ...futureDateStr(48) })
    );

    const res = await POST(
      makeRequest({ date: "not-a-date", startTime: "10:00" }),
      { params: makeParams() }
    );
    expect(res.status).toBe(400);
  });

  it("returns 400 for invalid time format", async () => {
    prismaMock.booking.findUnique.mockResolvedValue(
      makeBooking({ status: "CONFIRMED", ...futureDateStr(48) })
    );

    const res = await POST(
      makeRequest({ date: "2026-05-01", startTime: "bad-time" }),
      { params: makeParams() }
    );
    expect(res.status).toBe(400);
  });

  it("returns 404 when booking not found", async () => {
    prismaMock.booking.findUnique.mockResolvedValue(null);

    const res = await POST(makeRequest(newDateTime), { params: makeParams() });
    expect(res.status).toBe(404);
  });

  it("returns 400 for non-reschedulable status (COMPLETED)", async () => {
    prismaMock.booking.findUnique.mockResolvedValue(
      makeBooking({ status: "COMPLETED", ...futureDateStr(48) })
    );

    const res = await POST(makeRequest(newDateTime), { params: makeParams() });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("cannot be rescheduled");
  });

  it("returns 400 when inside reschedule window", async () => {
    prismaMock.booking.findUnique.mockResolvedValue(
      makeBooking({ status: "CONFIRMED", ...futureDateStr(10) })
    );

    const res = await POST(makeRequest(newDateTime), { params: makeParams() });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/24 hours/);
  });

  it("returns 409 when new slot is not available", async () => {
    prismaMock.booking.findUnique.mockResolvedValue(
      makeBooking({ status: "CONFIRMED", ...futureDateStr(48), service: makeService() })
    );
    // Slot is outside business hours for 2026-05-01 (Thursday, day 4)
    prismaMock.businessHours.findFirst.mockResolvedValue({
      id: "bh-1", businessId: BUSINESS_ID, branchId: null,
      dayOfWeek: 4, startTime: "09:00", endTime: "14:00", isClosed: false,
    });

    const res = await POST(
      makeRequest({ date: "2026-05-01", startTime: "14:00" }), // exactly at closing
      { params: makeParams() }
    );
    expect(res.status).toBe(409);
  });

  it("reschedules successfully and returns 200", async () => {
    prismaMock.booking.findUnique.mockResolvedValue(
      makeBooking({ status: "CONFIRMED", ...futureDateStr(48), service: makeService() })
    );

    const res = await POST(makeRequest(newDateTime), { params: makeParams() });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
  });

  it("updates booking with new date and time", async () => {
    prismaMock.booking.findUnique.mockResolvedValue(
      makeBooking({ status: "CONFIRMED", ...futureDateStr(48), service: makeService() })
    );

    await POST(makeRequest({ date: "2026-05-01", startTime: "10:00" }), { params: makeParams() });

    expect(prismaMock.booking.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          date: "2026-05-01",
          startTime: "10:00",
          endTime: "10:30", // 30-min service
        }),
      })
    );
  });

  it("creates a RESCHEDULE notification", async () => {
    prismaMock.booking.findUnique.mockResolvedValue(
      makeBooking({ status: "CONFIRMED", ...futureDateStr(48), service: makeService() })
    );

    await POST(makeRequest(newDateTime), { params: makeParams() });

    expect(prismaMock.notification.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ type: "RESCHEDULE" }),
      })
    );
  });

  it("excludes self from conflict check during reschedule", async () => {
    prismaMock.booking.findUnique.mockResolvedValue(
      makeBooking({ status: "CONFIRMED", ...futureDateStr(48), service: makeService() })
    );

    await POST(makeRequest({ date: "2026-05-01", startTime: "10:00" }), { params: makeParams() });

    expect(prismaMock.booking.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: { not: BOOKING_ID },
        }),
      })
    );
  });
});
