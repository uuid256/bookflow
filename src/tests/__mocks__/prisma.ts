import { vi } from "vitest";

// A lean hand-rolled Prisma mock matching our schema models.
// Each model exposes the methods we actually call.

function makeModel() {
  return {
    findUnique: vi.fn(),
    findFirst: vi.fn(),
    findMany: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    updateMany: vi.fn(),
    upsert: vi.fn(),
    delete: vi.fn(),
    deleteMany: vi.fn(),
    count: vi.fn(),
    aggregate: vi.fn(),
    groupBy: vi.fn(),
  };
}

export const prismaMock = {
  business: makeModel(),
  branch: makeModel(),
  user: makeModel(),
  staffHours: makeModel(),
  staffService: makeModel(),
  service: makeModel(),
  customer: makeModel(),
  booking: makeModel(),
  businessHours: makeModel(),
  holiday: makeModel(),
  intakeQuestion: makeModel(),
  intakeAnswer: makeModel(),
  package: makeModel(),
  packageService: makeModel(),
  customerPackage: makeModel(),
  packageUsage: makeModel(),
  waitlistEntry: makeModel(),
  notification: makeModel(),
  settings: makeModel(),
  $transaction: vi.fn((operations: any) => {
    if (Array.isArray(operations)) return Promise.all(operations);
    if (typeof operations === "function") return operations(prismaMock);
    return Promise.resolve(operations);
  }),
  $disconnect: vi.fn(),
};

vi.mock("@/lib/prisma", () => ({ prisma: prismaMock }));
