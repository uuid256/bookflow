import { vi } from "vitest";

export const mockSession = {
  user: {
    id: "user-admin-1",
    email: "admin@test.com",
    name: "Test Admin",
    role: "ADMIN",
    businessId: "business-1",
    branchId: "branch-1",
    businessName: "Test Business",
  },
  expires: "9999-01-01",
};

export const mockStaffSession = {
  user: {
    ...mockSession.user,
    id: "user-staff-1",
    email: "staff@test.com",
    name: "Test Staff",
    role: "STAFF",
  },
  expires: "9999-01-01",
};

vi.mock("@/lib/auth-guard", () => ({
  requireAuth: vi.fn().mockResolvedValue(mockSession),
  requireAdmin: vi.fn().mockResolvedValue(mockSession),
  getBusinessId: vi.fn((session: any) => session.user.businessId),
}));
