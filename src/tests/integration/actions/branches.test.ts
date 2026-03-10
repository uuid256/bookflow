import { describe, it, expect, vi, beforeEach } from "vitest";
import "../../__mocks__/prisma";
import "../../__mocks__/auth";
import { prismaMock } from "../../__mocks__/prisma";
import { BUSINESS_ID, BRANCH_ID, makeBranch } from "../../fixtures";

const { createBranch, updateBranch, deleteBranch } = await import(
  "@/app/admin/branches/actions"
);

const validBranchInput = {
  name: "Downtown Branch",
  address: "456 Elm St",
  phone: "+1-555-1234",
  isActive: true,
};

describe("createBranch", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.branch.create.mockResolvedValue(makeBranch({ name: "Downtown Branch" }));
  });

  it("creates a branch successfully", async () => {
    const result = await createBranch(validBranchInput);
    expect(result.success).toBe(true);
    expect(result.branch).toBeDefined();
    expect(prismaMock.branch.create).toHaveBeenCalledOnce();
  });

  it("scopes branch to businessId from session", async () => {
    await createBranch(validBranchInput);
    expect(prismaMock.branch.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ businessId: BUSINESS_ID }),
      })
    );
  });

  it("persists the correct name", async () => {
    await createBranch(validBranchInput);
    expect(prismaMock.branch.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ name: "Downtown Branch" }),
      })
    );
  });

  it("returns error when name is empty", async () => {
    const result = await createBranch({ ...validBranchInput, name: "" });
    expect(result.error).toBeDefined();
    expect(prismaMock.branch.create).not.toHaveBeenCalled();
  });

  it("returns error when name exceeds max length", async () => {
    const result = await createBranch({ ...validBranchInput, name: "x".repeat(101) });
    expect(result.error).toBeDefined();
    expect(prismaMock.branch.create).not.toHaveBeenCalled();
  });

  it("creates branch with optional fields omitted", async () => {
    prismaMock.branch.create.mockResolvedValue(
      makeBranch({ address: null, phone: null })
    );
    const result = await createBranch({ name: "Minimal Branch", isActive: true });
    expect(result.success).toBe(true);
    expect(prismaMock.branch.create).toHaveBeenCalledOnce();
  });
});

describe("updateBranch", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.branch.findFirst.mockResolvedValue(makeBranch());
    prismaMock.branch.update.mockResolvedValue(makeBranch({ name: "Updated Branch" }));
  });

  it("updates a branch successfully", async () => {
    const result = await updateBranch(BRANCH_ID, { ...validBranchInput, name: "Updated Branch" });
    expect(result.success).toBe(true);
    expect(result.branch).toBeDefined();
    expect(prismaMock.branch.update).toHaveBeenCalledOnce();
  });

  it("verifies business ownership before updating", async () => {
    await updateBranch(BRANCH_ID, validBranchInput);
    expect(prismaMock.branch.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ id: BRANCH_ID, businessId: BUSINESS_ID }),
      })
    );
  });

  it("returns error when branch not found", async () => {
    prismaMock.branch.findFirst.mockResolvedValue(null);
    const result = await updateBranch(BRANCH_ID, validBranchInput);
    expect(result.error).toBeDefined();
    expect(result.error).toMatch(/not found/i);
    expect(prismaMock.branch.update).not.toHaveBeenCalled();
  });

  it("returns error when name is empty", async () => {
    const result = await updateBranch(BRANCH_ID, { ...validBranchInput, name: "" });
    expect(result.error).toBeDefined();
    expect(prismaMock.branch.update).not.toHaveBeenCalled();
  });

  it("updates the branch by id", async () => {
    await updateBranch(BRANCH_ID, validBranchInput);
    expect(prismaMock.branch.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: BRANCH_ID } })
    );
  });

  it("can deactivate a branch", async () => {
    prismaMock.branch.update.mockResolvedValue(makeBranch({ isActive: false }));
    const result = await updateBranch(BRANCH_ID, { ...validBranchInput, isActive: false });
    expect(result.success).toBe(true);
    expect(prismaMock.branch.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ isActive: false }),
      })
    );
  });
});

describe("deleteBranch", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.branch.findFirst.mockResolvedValue(makeBranch());
    prismaMock.branch.delete.mockResolvedValue(makeBranch());
  });

  it("deletes a branch successfully", async () => {
    const result = await deleteBranch(BRANCH_ID);
    expect(result.success).toBe(true);
    expect(prismaMock.branch.delete).toHaveBeenCalledOnce();
  });

  it("verifies business ownership before deleting", async () => {
    await deleteBranch(BRANCH_ID);
    expect(prismaMock.branch.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ id: BRANCH_ID, businessId: BUSINESS_ID }),
      })
    );
  });

  it("returns error when branch not found", async () => {
    prismaMock.branch.findFirst.mockResolvedValue(null);
    const result = await deleteBranch(BRANCH_ID);
    expect(result.error).toBeDefined();
    expect(result.error).toMatch(/not found/i);
    expect(prismaMock.branch.delete).not.toHaveBeenCalled();
  });

  it("deletes by the correct id", async () => {
    await deleteBranch(BRANCH_ID);
    expect(prismaMock.branch.delete).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: BRANCH_ID } })
    );
  });
});
