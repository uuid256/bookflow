import { describe, it, expect, vi, beforeEach } from "vitest";
import "../../__mocks__/prisma";
import "../../__mocks__/auth";
import { prismaMock } from "../../__mocks__/prisma";
import { BUSINESS_ID, CUSTOMER_ID } from "../../fixtures";

const { createPackage, updatePackage, deletePackage, assignPackageToCustomer } =
  await import("@/app/admin/packages/actions");

function makePackage(overrides = {}) {
  return {
    id: "package-1",
    businessId: BUSINESS_ID,
    name: "Monthly Package",
    description: null,
    totalSessions: 10,
    price: 50000,
    validDays: 30,
    isActive: true,
    ...overrides,
  };
}

function makeCustomerPackage(overrides = {}) {
  return {
    id: "cp-1",
    customerId: CUSTOMER_ID,
    packageId: "package-1",
    remainingSessions: 10,
    expiresAt: new Date("2026-04-09"),
    status: "ACTIVE",
    ...overrides,
  };
}

const validPackageInput = {
  name: "Monthly Package",
  description: "10 sessions",
  totalSessions: 10,
  price: 50000,
  validDays: 30,
  serviceIds: ["service-haircut"],
  isActive: true,
};

describe("createPackage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.package.create.mockResolvedValue(makePackage());
  });

  it("creates a package successfully", async () => {
    const result = await createPackage(validPackageInput);
    expect(result.success).toBe(true);
    expect(result.package).toBeDefined();
    expect(prismaMock.package.create).toHaveBeenCalledOnce();
  });

  it("scopes package to businessId from session", async () => {
    await createPackage(validPackageInput);
    expect(prismaMock.package.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ businessId: BUSINESS_ID }),
      })
    );
  });

  it("creates nested packageServices for each serviceId", async () => {
    await createPackage({ ...validPackageInput, serviceIds: ["service-haircut", "service-color"] });
    expect(prismaMock.package.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          packageServices: {
            create: [
              { serviceId: "service-haircut" },
              { serviceId: "service-color" },
            ],
          },
        }),
      })
    );
  });

  it("creates package with empty serviceIds", async () => {
    await createPackage({ ...validPackageInput, serviceIds: [] });
    expect(prismaMock.package.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          packageServices: { create: [] },
        }),
      })
    );
  });

  it("returns error for empty name", async () => {
    const result = await createPackage({ ...validPackageInput, name: "" });
    expect(result.error).toBeDefined();
    expect(prismaMock.package.create).not.toHaveBeenCalled();
  });

  it("returns error for zero totalSessions", async () => {
    const result = await createPackage({ ...validPackageInput, totalSessions: 0 });
    expect(result.error).toBeDefined();
    expect(prismaMock.package.create).not.toHaveBeenCalled();
  });

  it("returns error for negative price", async () => {
    const result = await createPackage({ ...validPackageInput, price: -1 });
    expect(result.error).toBeDefined();
    expect(prismaMock.package.create).not.toHaveBeenCalled();
  });

  it("returns error for zero validDays", async () => {
    const result = await createPackage({ ...validPackageInput, validDays: 0 });
    expect(result.error).toBeDefined();
    expect(prismaMock.package.create).not.toHaveBeenCalled();
  });
});

describe("updatePackage", () => {
  const PACKAGE_ID = "package-1";

  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.package.findFirst.mockResolvedValue(makePackage());
    prismaMock.package.update.mockResolvedValue(makePackage({ name: "Updated Package" }));
  });

  it("updates a package successfully", async () => {
    const result = await updatePackage(PACKAGE_ID, { ...validPackageInput, name: "Updated Package" });
    expect(result.success).toBe(true);
    expect(result.package).toBeDefined();
    expect(prismaMock.package.update).toHaveBeenCalledOnce();
  });

  it("verifies business ownership before updating", async () => {
    await updatePackage(PACKAGE_ID, validPackageInput);
    expect(prismaMock.package.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ id: PACKAGE_ID, businessId: BUSINESS_ID }),
      })
    );
  });

  it("returns error when package not found", async () => {
    prismaMock.package.findFirst.mockResolvedValue(null);
    const result = await updatePackage(PACKAGE_ID, validPackageInput);
    expect(result.error).toBeDefined();
    expect(prismaMock.package.update).not.toHaveBeenCalled();
  });

  it("replaces packageServices on update", async () => {
    await updatePackage(PACKAGE_ID, { ...validPackageInput, serviceIds: ["service-color"] });
    expect(prismaMock.package.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          packageServices: expect.objectContaining({
            deleteMany: {},
            create: [{ serviceId: "service-color" }],
          }),
        }),
      })
    );
  });

  it("returns error for invalid input", async () => {
    const result = await updatePackage(PACKAGE_ID, { ...validPackageInput, totalSessions: 0 });
    expect(result.error).toBeDefined();
    expect(prismaMock.package.update).not.toHaveBeenCalled();
  });
});

describe("deletePackage", () => {
  const PACKAGE_ID = "package-1";

  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.package.findFirst.mockResolvedValue(makePackage());
    prismaMock.package.delete.mockResolvedValue(makePackage());
  });

  it("deletes a package successfully", async () => {
    const result = await deletePackage(PACKAGE_ID);
    expect(result.success).toBe(true);
    expect(prismaMock.package.delete).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: PACKAGE_ID } })
    );
  });

  it("verifies business ownership before deleting", async () => {
    await deletePackage(PACKAGE_ID);
    expect(prismaMock.package.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ id: PACKAGE_ID, businessId: BUSINESS_ID }),
      })
    );
  });

  it("returns error when package not found", async () => {
    prismaMock.package.findFirst.mockResolvedValue(null);
    const result = await deletePackage(PACKAGE_ID);
    expect(result.error).toBeDefined();
    expect(prismaMock.package.delete).not.toHaveBeenCalled();
  });
});

describe("assignPackageToCustomer", () => {
  const validAssignInput = {
    packageId: "package-1",
    customerId: CUSTOMER_ID,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.package.findFirst.mockResolvedValue(makePackage());
    prismaMock.customer.findFirst.mockResolvedValue({
      id: CUSTOMER_ID,
      businessId: BUSINESS_ID,
      name: "Jane Doe",
    });
    prismaMock.customerPackage.create.mockResolvedValue(makeCustomerPackage());
  });

  it("assigns a package to a customer successfully", async () => {
    const result = await assignPackageToCustomer(validAssignInput);
    expect(result.success).toBe(true);
    expect(result.customerPackage).toBeDefined();
    expect(prismaMock.customerPackage.create).toHaveBeenCalledOnce();
  });

  it("sets remainingSessions equal to package totalSessions", async () => {
    prismaMock.package.findFirst.mockResolvedValue(makePackage({ totalSessions: 5 }));
    await assignPackageToCustomer(validAssignInput);
    expect(prismaMock.customerPackage.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ remainingSessions: 5 }),
      })
    );
  });

  it("looks up package with isActive: true", async () => {
    await assignPackageToCustomer(validAssignInput);
    expect(prismaMock.package.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ isActive: true }),
      })
    );
  });

  it("returns error when package not found or inactive", async () => {
    prismaMock.package.findFirst.mockResolvedValue(null);
    const result = await assignPackageToCustomer(validAssignInput);
    expect(result.error).toBeDefined();
    expect(prismaMock.customerPackage.create).not.toHaveBeenCalled();
  });

  it("returns error when customer not found", async () => {
    prismaMock.customer.findFirst.mockResolvedValue(null);
    const result = await assignPackageToCustomer(validAssignInput);
    expect(result.error).toBeDefined();
    expect(prismaMock.customerPackage.create).not.toHaveBeenCalled();
  });

  it("returns error for missing packageId", async () => {
    const result = await assignPackageToCustomer({ packageId: "", customerId: CUSTOMER_ID });
    expect(result.error).toBeDefined();
    expect(prismaMock.customerPackage.create).not.toHaveBeenCalled();
  });

  it("returns error for missing customerId", async () => {
    const result = await assignPackageToCustomer({ packageId: "package-1", customerId: "" });
    expect(result.error).toBeDefined();
    expect(prismaMock.customerPackage.create).not.toHaveBeenCalled();
  });
});
