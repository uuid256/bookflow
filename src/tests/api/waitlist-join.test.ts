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
} from "../fixtures";

const { POST } = await import("@/app/api/waitlist/join/route");

function makeRequest(body: object) {
  return new NextRequest("http://localhost/api/waitlist/join", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "Content-Type": "application/json" },
  });
}

const validBody = {
  businessSlug: "bookflow-demo",
  email: "john@example.com",
  name: "John Smith",
  serviceId: SERVICE_ID,
  preferredDate: "2026-06-01",
};

describe("POST /api/waitlist/join", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.business.findFirst.mockResolvedValue({
      id: BUSINESS_ID,
      slug: "bookflow-demo",
    });
    prismaMock.service.findFirst.mockResolvedValue(makeService());
    prismaMock.customer.findFirst.mockResolvedValue(makeCustomer());
    prismaMock.waitlistEntry.create.mockResolvedValue({
      id: "wl-1",
      businessId: BUSINESS_ID,
      customerId: CUSTOMER_ID,
      serviceId: SERVICE_ID,
      preferredDate: "2026-06-01",
      preferredTime: null,
      status: "WAITING",
    });
  });

  it("returns 400 for invalid input (missing email)", async () => {
    const { email: _email, ...bodyWithoutEmail } = validBody;
    const res = await POST(makeRequest(bodyWithoutEmail));
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

  it("creates waitlist entry successfully", async () => {
    const res = await POST(makeRequest(validBody));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.success).toBe(true);
    expect(body.waitlistEntryId).toBe("wl-1");
    expect(prismaMock.waitlistEntry.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          businessId: BUSINESS_ID,
          serviceId: SERVICE_ID,
          preferredDate: "2026-06-01",
          status: "WAITING",
        }),
      })
    );
  });

  it("creates customer if not found", async () => {
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
});
