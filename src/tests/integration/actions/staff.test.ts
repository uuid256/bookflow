import { describe, it, expect, vi, beforeEach } from "vitest";
import "../../__mocks__/prisma";
import "../../__mocks__/auth";
import { prismaMock } from "../../__mocks__/prisma";
import { BUSINESS_ID, STAFF_ID, makeStaff } from "../../fixtures";

vi.mock("bcryptjs", () => ({
  default: { hash: vi.fn().mockResolvedValue("hashed-password") },
}));

const { createStaff, updateStaff, deleteStaff } = await import(
  "@/app/admin/staff/actions"
);

function makeFormData(data: Record<string, string>): FormData {
  const fd = new FormData();
  for (const [k, v] of Object.entries(data)) fd.append(k, v);
  return fd;
}

const validCreateFields = {
  name: "Bob Smith",
  email: "bob@example.com",
  password: "secret123",
  phone: "+1-555-1234",
  role: "STAFF",
  isActive: "true",
};

const validUpdateFields = {
  id: STAFF_ID,
  name: "Alice Johnson Updated",
  email: "alice@example.com",
  phone: "+1-555-0101",
  role: "STAFF",
  isActive: "true",
};

describe("createStaff", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.user.findUnique.mockResolvedValue(null); // no duplicate email
    prismaMock.user.create.mockResolvedValue(makeStaff({ email: "bob@example.com", name: "Bob Smith" }));
  });

  it("creates a staff member successfully", async () => {
    const result = await createStaff(makeFormData(validCreateFields));
    expect(result.success).toBe(true);
    expect(prismaMock.user.create).toHaveBeenCalledOnce();
  });

  it("scopes staff to businessId from session", async () => {
    await createStaff(makeFormData(validCreateFields));
    expect(prismaMock.user.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ businessId: BUSINESS_ID }),
      })
    );
  });

  it("hashes password before storing", async () => {
    await createStaff(makeFormData(validCreateFields));
    expect(prismaMock.user.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ passwordHash: "hashed-password" }),
      })
    );
  });

  it("checks for email uniqueness before creating", async () => {
    await createStaff(makeFormData(validCreateFields));
    expect(prismaMock.user.findUnique).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { email: "bob@example.com" },
      })
    );
  });

  it("returns error when email already exists", async () => {
    prismaMock.user.findUnique.mockResolvedValue(makeStaff());
    const result = await createStaff(makeFormData(validCreateFields));
    expect(result.error).toBeDefined();
    expect(prismaMock.user.create).not.toHaveBeenCalled();
  });

  it("returns error for empty name", async () => {
    const result = await createStaff(makeFormData({ ...validCreateFields, name: "" }));
    expect(result.error).toBeDefined();
    expect(prismaMock.user.create).not.toHaveBeenCalled();
  });

  it("returns error for invalid email", async () => {
    const result = await createStaff(makeFormData({ ...validCreateFields, email: "not-an-email" }));
    expect(result.error).toBeDefined();
    expect(prismaMock.user.create).not.toHaveBeenCalled();
  });

  it("returns error for password shorter than 6 characters", async () => {
    const result = await createStaff(makeFormData({ ...validCreateFields, password: "abc" }));
    expect(result.error).toBeDefined();
    expect(prismaMock.user.create).not.toHaveBeenCalled();
  });

  it("returns error for invalid role", async () => {
    const result = await createStaff(makeFormData({ ...validCreateFields, role: "SUPERUSER" }));
    expect(result.error).toBeDefined();
    expect(prismaMock.user.create).not.toHaveBeenCalled();
  });
});

describe("updateStaff", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.user.findFirst.mockReset();
    // Ownership check passes, no email conflict
    prismaMock.user.findFirst
      .mockResolvedValueOnce(makeStaff()) // ownership check
      .mockResolvedValue(null);            // email conflict check (default: no conflict)
    prismaMock.user.update.mockResolvedValue(makeStaff({ name: "Alice Johnson Updated" }));
  });

  it("updates a staff member successfully", async () => {
    const result = await updateStaff(makeFormData(validUpdateFields));
    expect(result.success).toBe(true);
    expect(prismaMock.user.update).toHaveBeenCalledOnce();
  });

  it("verifies business ownership before updating", async () => {
    await updateStaff(makeFormData(validUpdateFields));
    expect(prismaMock.user.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ id: STAFF_ID, businessId: BUSINESS_ID }),
      })
    );
  });

  it("returns error when staff member not found", async () => {
    prismaMock.user.findFirst.mockReset();
    prismaMock.user.findFirst.mockResolvedValue(null);
    const result = await updateStaff(makeFormData(validUpdateFields));
    expect(result.error).toBeDefined();
    expect(prismaMock.user.update).not.toHaveBeenCalled();
  });

  it("returns error when new email is already taken by another user", async () => {
    // Override: ownership check passes, email conflict found
    prismaMock.user.findFirst.mockReset();
    prismaMock.user.findFirst
      .mockResolvedValueOnce(makeStaff())
      .mockResolvedValueOnce(makeStaff({ id: "other-staff-id", email: "taken@example.com" }));
    const result = await updateStaff(makeFormData({ ...validUpdateFields, email: "taken@example.com" }));
    expect(result.error).toBeDefined();
    expect(prismaMock.user.update).not.toHaveBeenCalled();
  });

  it("returns error for empty name", async () => {
    const result = await updateStaff(makeFormData({ ...validUpdateFields, name: "" }));
    expect(result.error).toBeDefined();
    expect(prismaMock.user.update).not.toHaveBeenCalled();
  });

  it("returns error for invalid email", async () => {
    const result = await updateStaff(makeFormData({ ...validUpdateFields, email: "bad-email" }));
    expect(result.error).toBeDefined();
    expect(prismaMock.user.update).not.toHaveBeenCalled();
  });

  it("updates the correct user id", async () => {
    await updateStaff(makeFormData(validUpdateFields));
    expect(prismaMock.user.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: STAFF_ID } })
    );
  });
});

describe("deleteStaff", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.user.findFirst.mockReset();
    prismaMock.user.findFirst.mockResolvedValue(makeStaff()); // STAFF_ID != session user id
    prismaMock.user.delete.mockResolvedValue(makeStaff());
  });

  it("deletes a staff member successfully", async () => {
    const result = await deleteStaff(STAFF_ID);
    expect(result.success).toBe(true);
    expect(prismaMock.user.delete).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: STAFF_ID } })
    );
  });

  it("verifies business ownership before deleting", async () => {
    await deleteStaff(STAFF_ID);
    expect(prismaMock.user.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ id: STAFF_ID, businessId: BUSINESS_ID }),
      })
    );
  });

  it("returns error when staff member not found", async () => {
    prismaMock.user.findFirst.mockResolvedValue(null);
    const result = await deleteStaff(STAFF_ID);
    expect(result.error).toBeDefined();
    expect(prismaMock.user.delete).not.toHaveBeenCalled();
  });

  it("prevents self-deletion", async () => {
    // The session user id is "user-admin-1" (from auth mock)
    prismaMock.user.findFirst.mockResolvedValue(makeStaff({ id: "user-admin-1" }));
    const result = await deleteStaff("user-admin-1");
    expect(result.error).toBeDefined();
    expect(result.error).toMatch(/cannot delete/i);
    expect(prismaMock.user.delete).not.toHaveBeenCalled();
  });
});
