// Shared test data factories

export const BUSINESS_ID = "business-1";
export const BRANCH_ID = "branch-1";
export const SERVICE_ID = "service-haircut";
export const CUSTOMER_ID = "customer-jane";
export const STAFF_ID = "staff-alice";
export const BOOKING_ID = "booking-001";

export function makeService(overrides = {}) {
  return {
    id: SERVICE_ID,
    businessId: BUSINESS_ID,
    branchId: BRANCH_ID,
    name: "Haircut",
    description: "Standard haircut",
    durationMinutes: 30,
    price: 3500,
    depositAmount: 0,
    depositPercent: null,
    bufferBefore: 0,
    bufferAfter: 10,
    isActive: true,
    sortOrder: 1,
    createdAt: new Date("2026-01-01"),
    updatedAt: new Date("2026-01-01"),
    ...overrides,
  };
}

export function makeCustomer(overrides = {}) {
  return {
    id: CUSTOMER_ID,
    businessId: BUSINESS_ID,
    email: "jane@example.com",
    name: "Jane Doe",
    phone: "+1-555-0201",
    notes: null,
    createdAt: new Date("2026-01-01"),
    updatedAt: new Date("2026-01-01"),
    ...overrides,
  };
}

export function makeStaff(overrides = {}) {
  return {
    id: STAFF_ID,
    businessId: BUSINESS_ID,
    branchId: BRANCH_ID,
    email: "alice@example.com",
    passwordHash: "$2b$10$...",
    name: "Alice Johnson",
    phone: "+1-555-0101",
    role: "STAFF",
    isActive: true,
    createdAt: new Date("2026-01-01"),
    updatedAt: new Date("2026-01-01"),
    ...overrides,
  };
}

export function makeBooking(overrides = {}) {
  return {
    id: BOOKING_ID,
    businessId: BUSINESS_ID,
    branchId: BRANCH_ID,
    serviceId: SERVICE_ID,
    customerId: CUSTOMER_ID,
    staffId: STAFF_ID,
    date: "2026-04-15",
    startTime: "10:00",
    endTime: "10:30",
    status: "CONFIRMED",
    depositStatus: "NONE",
    depositAmount: 0,
    totalAmount: 3500,
    cancellationReason: null,
    notes: null,
    createdAt: new Date("2026-01-01"),
    updatedAt: new Date("2026-01-01"),
    service: makeService(),
    customer: makeCustomer(),
    ...overrides,
  };
}

export function makeBusinessHours(dayOfWeek: number, overrides = {}) {
  return {
    id: `bh-${dayOfWeek}`,
    businessId: BUSINESS_ID,
    branchId: BRANCH_ID,
    dayOfWeek,
    startTime: "09:00",
    endTime: "18:00",
    isClosed: false,
    ...overrides,
  };
}

export function makeStaffHours(dayOfWeek: number, overrides = {}) {
  return {
    id: `sh-${dayOfWeek}`,
    userId: STAFF_ID,
    dayOfWeek,
    startTime: "09:00",
    endTime: "18:00",
    isActive: true,
    ...overrides,
  };
}

export function makeSettings(overrides = {}) {
  return {
    id: "settings-1",
    businessId: BUSINESS_ID,
    cancellationWindowHours: 24,
    rescheduleWindowHours: 24,
    autoConfirmBookings: false,
    maxAdvanceBookingDays: 30,
    minAdvanceBookingHours: 1,
    ...overrides,
  };
}

export function makeBranch(overrides = {}) {
  return {
    id: BRANCH_ID,
    businessId: BUSINESS_ID,
    name: "Main Branch",
    address: "123 Main St",
    phone: "+1-555-0100",
    isActive: true,
    createdAt: new Date("2026-01-01"),
    updatedAt: new Date("2026-01-01"),
    ...overrides,
  };
}
