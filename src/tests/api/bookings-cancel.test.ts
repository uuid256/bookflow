import { describe, it, expect, vi, beforeEach } from "vitest";
import "../__mocks__/prisma";
import { prismaMock } from "../__mocks__/prisma";
import { NextRequest } from "next/server";
import { BOOKING_ID, BUSINESS_ID, SERVICE_ID, makeBooking, makeSettings } from "../fixtures";

const { POST } = await import("@/app/api/bookings/[id]/cancel/route");

const CUSTOMER_EMAIL = "jane@example.com"; // matches makeCustomer().email

function makeRequest(email?: string) {
  return new NextRequest("http://localhost/api/bookings/booking-001/cancel", {
    method: "POST",
    body: email !== undefined ? JSON.stringify({ email }) : undefined,
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

describe("POST /api/bookings/[id]/cancel", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.settings.findUnique.mockResolvedValue(makeSettings());
    prismaMock.$transaction.mockImplementation(async (ops: any[]) => Promise.all(ops));
    prismaMock.booking.update.mockResolvedValue({});
    prismaMock.notification.create.mockResolvedValue({});
    prismaMock.waitlistEntry.updateMany.mockResolvedValue({ count: 0 });
  });

  it("returns 400 when email is missing", async () => {
    const res = await POST(
      new NextRequest("http://localhost/api/bookings/booking-001/cancel", { method: "POST" }),
      { params: makeParams() }
    );
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/email/i);
  });

  it("returns 404 when booking not found", async () => {
    prismaMock.booking.findUnique.mockResolvedValue(null);

    const res = await POST(makeRequest(CUSTOMER_EMAIL), { params: makeParams() });
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toBe("Booking not found");
  });

  it("returns 404 when email does not match booking owner", async () => {
    prismaMock.booking.findUnique.mockResolvedValue(
      makeBooking({ status: "CONFIRMED", ...futureDateStr(48) })
    );

    const res = await POST(makeRequest("wrong@example.com"), { params: makeParams() });
    expect(res.status).toBe(404);
  });

  it("returns 400 when booking is already cancelled", async () => {
    prismaMock.booking.findUnique.mockResolvedValue(
      makeBooking({ status: "CANCELLED", ...futureDateStr(48) })
    );

    const res = await POST(makeRequest(CUSTOMER_EMAIL), { params: makeParams() });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toContain("cannot be cancelled");
  });

  it("returns 400 when booking is completed", async () => {
    prismaMock.booking.findUnique.mockResolvedValue(
      makeBooking({ status: "COMPLETED", ...futureDateStr(48) })
    );

    const res = await POST(makeRequest(CUSTOMER_EMAIL), { params: makeParams() });
    expect(res.status).toBe(400);
  });

  it("returns 400 when inside cancellation window (< 24h)", async () => {
    prismaMock.booking.findUnique.mockResolvedValue(
      makeBooking({ status: "CONFIRMED", ...futureDateStr(12) })
    );

    const res = await POST(makeRequest(CUSTOMER_EMAIL), { params: makeParams() });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/24 hours/);
  });

  it("returns 200 and cancels booking when outside cancellation window", async () => {
    prismaMock.booking.findUnique.mockResolvedValue(
      makeBooking({ status: "CONFIRMED", ...futureDateStr(48) })
    );

    const res = await POST(makeRequest(CUSTOMER_EMAIL), { params: makeParams() });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
  });

  it("marks deposit as REFUNDED when deposit was PAID", async () => {
    prismaMock.booking.findUnique.mockResolvedValue(
      makeBooking({
        status: "CONFIRMED",
        depositStatus: "PAID",
        depositAmount: 2000,
        ...futureDateStr(48),
      })
    );

    await POST(makeRequest(CUSTOMER_EMAIL), { params: makeParams() });

    expect(prismaMock.booking.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ depositStatus: "REFUNDED" }),
      })
    );
  });

  it("notifies waitlist entries after cancellation", async () => {
    prismaMock.booking.findUnique.mockResolvedValue(
      makeBooking({ status: "CONFIRMED", ...futureDateStr(48) })
    );

    await POST(makeRequest(CUSTOMER_EMAIL), { params: makeParams() });

    expect(prismaMock.waitlistEntry.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          businessId: BUSINESS_ID,
          serviceId: SERVICE_ID,
          status: "WAITING",
        }),
        data: { status: "NOTIFIED" },
      })
    );
  });

  it("creates a CANCELLATION notification record", async () => {
    prismaMock.booking.findUnique.mockResolvedValue(
      makeBooking({ status: "CONFIRMED", ...futureDateStr(48) })
    );

    await POST(makeRequest(CUSTOMER_EMAIL), { params: makeParams() });

    expect(prismaMock.notification.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ type: "CANCELLATION" }),
      })
    );
  });

  it("uses custom cancellation window from settings", async () => {
    prismaMock.settings.findUnique.mockResolvedValue(
      makeSettings({ cancellationWindowHours: 48 })
    );
    prismaMock.booking.findUnique.mockResolvedValue(
      makeBooking({ status: "CONFIRMED", ...futureDateStr(36) })
    );

    const res = await POST(makeRequest(CUSTOMER_EMAIL), { params: makeParams() });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toMatch(/48 hours/);
  });
});
