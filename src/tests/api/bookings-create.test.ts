import { describe, it, expect, vi, beforeEach } from "vitest";
import "../__mocks__/prisma";
import { prismaMock } from "../__mocks__/prisma";
import { NextRequest } from "next/server";
import {
  BUSINESS_ID,
  SERVICE_ID,
  CUSTOMER_ID,
  makeService,
  makeCustomer,
  makeSettings,
  makeBranch,
} from "../fixtures";

const { POST } = await import("@/app/api/bookings/create/route");

const THURSDAY = "2026-05-01"; // day 4

function makeRequest(body: object) {
  return new NextRequest("http://localhost/api/bookings/create", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

const validBody = {
  businessSlug: "bookflow-demo",
  serviceId: SERVICE_ID,
  date: THURSDAY,
  startTime: "10:00",
  customerName: "John Smith",
  customerEmail: "john@example.com",
};

describe("POST /api/bookings/create", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.business.findFirst.mockResolvedValue({
      id: BUSINESS_ID,
      slug: "bookflow-demo",
    });
    prismaMock.service.findFirst.mockResolvedValue(makeService());
    prismaMock.businessHours.findFirst.mockResolvedValue({
      id: "bh-4",
      businessId: BUSINESS_ID,
      branchId: null,
      dayOfWeek: 4,
      startTime: "09:00",
      endTime: "18:00",
      isClosed: false,
    });
    prismaMock.holiday.findFirst.mockResolvedValue(null);
    prismaMock.staffHours.findFirst.mockResolvedValue(null);
    prismaMock.staffService.findMany.mockResolvedValue([]);
    prismaMock.booking.findMany.mockResolvedValue([]);
    prismaMock.customer.findFirst.mockResolvedValue(makeCustomer());
    prismaMock.settings.findUnique.mockResolvedValue(makeSettings());
    prismaMock.branch.findFirst.mockResolvedValue(makeBranch());
    prismaMock.booking.create.mockResolvedValue({
      id: "new-booking",
      status: "PENDING",
      depositAmount: 0,
    });
    prismaMock.notification.create.mockResolvedValue({});
    prismaMock.intakeAnswer.create.mockResolvedValue({});
    prismaMock.$transaction.mockImplementation(async (fn: any) => {
      if (typeof fn === "function") return fn(prismaMock);
      return Promise.all(fn);
    });
  });

  it("returns 400 for missing required fields", async () => {
    const res = await POST(makeRequest({}));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Invalid request");
  });

  it("returns 404 when business not found", async () => {
    prismaMock.business.findFirst.mockResolvedValue(null);

    const res = await POST(makeRequest(validBody));
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toBe("Business not found");
  });

  it("returns 404 when service not found", async () => {
    prismaMock.service.findFirst.mockResolvedValue(null);

    const res = await POST(makeRequest(validBody));
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body.error).toBe("Service not found");
  });

  it("returns 409 when slot not available (business closed)", async () => {
    prismaMock.businessHours.findFirst.mockResolvedValue({
      id: "bh-4",
      businessId: BUSINESS_ID,
      branchId: null,
      dayOfWeek: 4,
      startTime: "09:00",
      endTime: "18:00",
      isClosed: true,
    });

    const res = await POST(makeRequest(validBody));
    expect(res.status).toBe(409);
    const body = await res.json();
    expect(body.error).toBeDefined();
  });

  it("creates booking successfully and returns 200", async () => {
    const res = await POST(makeRequest(validBody));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.bookingId).toBe("new-booking");
    expect(body.status).toBe("PENDING");
    expect(body.depositRequired).toBe(false);
    expect(body.depositAmount).toBe(0);
  });

  it("creates new customer when not found", async () => {
    prismaMock.customer.findFirst.mockResolvedValue(null);
    prismaMock.customer.create.mockResolvedValue({
      id: "new-customer",
      businessId: BUSINESS_ID,
      email: "john@example.com",
      name: "John Smith",
      phone: null,
    });

    const res = await POST(makeRequest(validBody));
    expect(res.status).toBe(200);
    expect(prismaMock.customer.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          email: "john@example.com",
          name: "John Smith",
          businessId: BUSINESS_ID,
        }),
      })
    );
  });

  it("returns CONFIRMED status when autoConfirm enabled", async () => {
    prismaMock.settings.findUnique.mockResolvedValue(
      makeSettings({ autoConfirmBookings: true })
    );
    prismaMock.booking.create.mockResolvedValue({
      id: "new-booking",
      status: "CONFIRMED",
      depositAmount: 0,
    });

    const res = await POST(makeRequest(validBody));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.status).toBe("CONFIRMED");
  });
});
