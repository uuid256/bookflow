import { describe, it, expect, vi, beforeEach } from "vitest";
import "../../__mocks__/prisma";
import "../../__mocks__/auth";
import { prismaMock } from "../../__mocks__/prisma";
import { BUSINESS_ID, CUSTOMER_ID, makeCustomer } from "../../fixtures";

const { createCustomer, updateCustomer, deleteCustomer } = await import(
  "@/app/admin/customers/actions"
);

function makeFormData(data: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [k, v] of Object.entries(data)) fd.append(k, v);
  return fd;
}

const validFields = {
  name: "John Smith",
  email: "john@example.com",
  phone: "+1-555-9999",
  notes: "",
};

describe("createCustomer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.customer.findUnique.mockResolvedValue(null); // no duplicate
    prismaMock.customer.create.mockResolvedValue(makeCustomer());
  });

  it("creates a customer successfully", async () => {
    const result = await createCustomer(makeFormData(validFields));
    expect(result.success).toBe(true);
    expect(prismaMock.customer.create).toHaveBeenCalledOnce();
  });

  it("scopes customer to businessId", async () => {
    await createCustomer(makeFormData(validFields));
    expect(prismaMock.customer.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ businessId: BUSINESS_ID }),
      })
    );
  });

  it("returns error when email already exists in business", async () => {
    prismaMock.customer.findUnique.mockResolvedValue(makeCustomer());
    const result = await createCustomer(makeFormData(validFields));
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/email/i);
  });

  it("returns error for empty name", async () => {
    const result = await createCustomer(makeFormData({ ...validFields, name: "" }));
    expect(result.success).toBe(false);
    expect(result.fieldErrors).toBeDefined();
  });

  it("returns error for invalid email", async () => {
    const result = await createCustomer(
      makeFormData({ ...validFields, email: "not-an-email" })
    );
    expect(result.success).toBe(false);
    expect(result.fieldErrors).toBeDefined();
  });
});

describe("updateCustomer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.customer.findFirst.mockResolvedValue(makeCustomer()); // ownership check
    prismaMock.customer.findUnique.mockResolvedValue(null);           // no duplicate email
    prismaMock.customer.update.mockResolvedValue(makeCustomer({ name: "Updated" }));
  });

  it("updates a customer successfully", async () => {
    const result = await updateCustomer(
      CUSTOMER_ID,
      makeFormData({ ...validFields, name: "Updated Name" })
    );
    expect(result.success).toBe(true);
  });

  it("returns error when customer not found", async () => {
    prismaMock.customer.findFirst.mockResolvedValue(null);
    const result = await updateCustomer(CUSTOMER_ID, makeFormData(validFields));
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/not found/i);
  });

  it("returns error when new email is taken by another customer", async () => {
    const otherCustomer = makeCustomer({ id: "other-customer-id", email: "other@example.com" });
    prismaMock.customer.findFirst.mockResolvedValue(makeCustomer()); // ownership check passes
    prismaMock.customer.findUnique.mockResolvedValue(otherCustomer); // email conflict
    const result = await updateCustomer(
      CUSTOMER_ID,
      makeFormData({ ...validFields, email: "other@example.com" })
    );
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/email/i);
  });
});

describe("deleteCustomer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.customer.findFirst.mockResolvedValue(makeCustomer());
    prismaMock.customer.delete.mockResolvedValue(makeCustomer());
  });

  it("deletes a customer successfully", async () => {
    const result = await deleteCustomer(CUSTOMER_ID);
    expect(result.success).toBe(true);
  });

  it("returns error when customer not found", async () => {
    prismaMock.customer.findFirst.mockResolvedValue(null);
    const result = await deleteCustomer(CUSTOMER_ID);
    expect(result.success).toBe(false);
  });
});
