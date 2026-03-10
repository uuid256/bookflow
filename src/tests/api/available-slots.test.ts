import { describe, it, expect, vi, beforeEach } from "vitest";
import "../__mocks__/prisma";
import { prismaMock } from "../__mocks__/prisma";
import { NextRequest } from "next/server";
import { BUSINESS_ID, SERVICE_ID, makeService } from "../fixtures";

const { GET } = await import("@/app/api/bookings/available-slots/route");

function makeRequest(params: Record<string, string>) {
  const url = new URL("http://localhost/api/bookings/available-slots");
  for (const [k, v] of Object.entries(params)) url.searchParams.set(k, v);
  return new NextRequest(url);
}

const TUESDAY = "2026-04-14"; // day 2

describe("GET /api/bookings/available-slots", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.business.findFirst.mockResolvedValue({
      id: BUSINESS_ID, slug: "bookflow-demo",
    });
    prismaMock.service.findFirst.mockResolvedValue(makeService());
    prismaMock.businessHours.findFirst.mockResolvedValue({
      id: "bh-1", businessId: BUSINESS_ID, branchId: null,
      dayOfWeek: 2, startTime: "09:00", endTime: "11:00", isClosed: false,
    });
    prismaMock.holiday.findFirst.mockResolvedValue(null);
    prismaMock.staffHours.findFirst.mockResolvedValue(null);
    prismaMock.booking.findMany.mockResolvedValue([]);
  });

  it("returns 400 when serviceId is missing", async () => {
    const res = await GET(makeRequest({ date: TUESDAY }));
    expect(res.status).toBe(400);
  });

  it("returns 400 when date is missing", async () => {
    const res = await GET(makeRequest({ serviceId: SERVICE_ID }));
    expect(res.status).toBe(400);
  });

  it("returns 404 when business not found", async () => {
    prismaMock.business.findFirst.mockResolvedValue(null);
    const res = await GET(makeRequest({ serviceId: SERVICE_ID, date: TUESDAY }));
    expect(res.status).toBe(404);
  });

  it("returns 404 when service not found", async () => {
    prismaMock.service.findFirst.mockResolvedValue(null);
    const res = await GET(makeRequest({ serviceId: SERVICE_ID, date: TUESDAY }));
    expect(res.status).toBe(404);
  });

  it("returns empty slots when business is closed", async () => {
    prismaMock.businessHours.findFirst.mockResolvedValue({
      id: "bh-1", businessId: BUSINESS_ID, branchId: null,
      dayOfWeek: 2, startTime: "09:00", endTime: "18:00", isClosed: true,
    });

    const res = await GET(makeRequest({ serviceId: SERVICE_ID, date: TUESDAY }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.slots).toEqual([]);
  });

  it("returns empty slots on a holiday", async () => {
    prismaMock.holiday.findFirst.mockResolvedValue({
      id: "h-1", name: "Holiday", date: TUESDAY, isClosed: true,
    });

    const res = await GET(makeRequest({ serviceId: SERVICE_ID, date: TUESDAY }));
    const body = await res.json();
    expect(body.slots).toEqual([]);
  });

  it("returns available 15-minute slots for open business hours", async () => {
    // Business: 09:00-11:00, service: 30 min. Slots: 09:00, 09:15, 09:30, 10:00, 10:15, 10:30
    // But 09:45 would end at 10:15 ✓, 10:30 would end at 11:00 ✓
    const res = await GET(makeRequest({ serviceId: SERVICE_ID, date: TUESDAY }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.slots).toBeInstanceOf(Array);
    expect(body.slots.length).toBeGreaterThan(0);
    // All slots should be within business hours
    for (const slot of body.slots) {
      expect(slot >= "09:00" && slot < "11:00").toBe(true);
    }
  });

  it("excludes slots that would run past closing time", async () => {
    // Business 09:00-09:45, service 30 min. Only 09:00 and 09:15 fit.
    prismaMock.businessHours.findFirst.mockResolvedValue({
      id: "bh-1", businessId: BUSINESS_ID, branchId: null,
      dayOfWeek: 2, startTime: "09:00", endTime: "09:45", isClosed: false,
    });

    const res = await GET(makeRequest({ serviceId: SERVICE_ID, date: TUESDAY }));
    const body = await res.json();
    // 09:00 → 09:30 ✓, 09:15 → 09:45 ✓, 09:30 → 10:00 ✗
    expect(body.slots).toContain("09:00");
    expect(body.slots).toContain("09:15");
    expect(body.slots).not.toContain("09:30");
  });

  it("excludes slots occupied by existing bookings", async () => {
    prismaMock.booking.findMany.mockResolvedValue([
      {
        id: "b-1", startTime: "09:00", endTime: "09:30", status: "CONFIRMED",
        service: makeService({ bufferBefore: 0, bufferAfter: 0 }),
      },
    ]);

    const res = await GET(makeRequest({ serviceId: SERVICE_ID, date: TUESDAY }));
    const body = await res.json();
    expect(body.slots).not.toContain("09:00");
    expect(body.slots).not.toContain("09:15"); // overlaps with 09:00-09:30
  });
});
