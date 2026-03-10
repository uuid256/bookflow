import { describe, it, expect, vi, beforeEach } from "vitest";
import "../__mocks__/prisma";
import { prismaMock } from "../__mocks__/prisma";
import { NextRequest } from "next/server";
import { BUSINESS_ID, CUSTOMER_ID, makeCustomer, makeSettings } from "../fixtures";

const { GET } = await import("@/app/api/bookings/lookup/route");

function makeRequest(params: Record<string, string>) {
  const url = new URL("http://localhost/api/bookings/lookup");
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  return new NextRequest(url);
}

const FAR_FUTURE = "2030-01-01"; // far future so canCancel/canReschedule are true

function makeBookingWithRelations(overrides: Record<string, unknown> = {}) {
  return {
    id: "b-1",
    date: FAR_FUTURE,
    startTime: "10:00",
    endTime: "10:30",
    status: "CONFIRMED",
    totalAmount: 3500,
    depositAmount: 0,
    depositStatus: "NONE",
    service: { name: "Haircut", durationMinutes: 30 },
    staff: { name: "Alice" },
    ...overrides,
  };
}

describe("GET /api/bookings/lookup", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.customer.findFirst.mockResolvedValue(makeCustomer());
    prismaMock.settings.findUnique.mockResolvedValue(makeSettings());
    prismaMock.booking.findMany.mockResolvedValue([makeBookingWithRelations()]);
  });

  it("returns 400 when email is missing", async () => {
    const res = await GET(makeRequest({}));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Email is required");
  });

  it("returns 400 for invalid email format", async () => {
    const res = await GET(makeRequest({ email: "not-an-email" }));
    expect(res.status).toBe(400);
  });

  it("does not expose financial fields in response", async () => {
    const res = await GET(makeRequest({ email: "jane@example.com" }));
    const body = await res.json();
    const booking = body.bookings[0];
    expect(booking.totalAmount).toBeUndefined();
    expect(booking.depositAmount).toBeUndefined();
    expect(booking.depositStatus).toBeUndefined();
  });

  it("returns empty bookings when customer not found", async () => {
    prismaMock.customer.findFirst.mockResolvedValue(null);

    const res = await GET(makeRequest({ email: "unknown@example.com" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.bookings).toEqual([]);
  });

  it("returns bookings for known customer", async () => {
    const res = await GET(makeRequest({ email: "jane@example.com" }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.bookings).toHaveLength(1);
    expect(body.bookings[0].id).toBe("b-1");
    expect(body.bookings[0].service).toEqual({ name: "Haircut", durationMinutes: 30 });
    expect(body.bookings[0].staff).toEqual({ name: "Alice" });
  });

  it("sets canCancel=true for future CONFIRMED bookings outside window", async () => {
    prismaMock.booking.findMany.mockResolvedValue([
      makeBookingWithRelations({ date: FAR_FUTURE, status: "CONFIRMED" }),
    ]);

    const res = await GET(makeRequest({ email: "jane@example.com" }));
    const body = await res.json();
    expect(body.bookings[0].canCancel).toBe(true);
    expect(body.bookings[0].canReschedule).toBe(true);
  });

  it("sets canCancel=false for past bookings", async () => {
    prismaMock.booking.findMany.mockResolvedValue([
      makeBookingWithRelations({ date: "2020-01-01", startTime: "10:00", status: "CONFIRMED" }),
    ]);

    const res = await GET(makeRequest({ email: "jane@example.com" }));
    const body = await res.json();
    expect(body.bookings[0].canCancel).toBe(false);
    expect(body.bookings[0].canReschedule).toBe(false);
  });
});
