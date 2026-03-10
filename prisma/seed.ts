import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  // Clean up
  await prisma.notification.deleteMany();
  await prisma.packageUsage.deleteMany();
  await prisma.customerPackage.deleteMany();
  await prisma.packageService.deleteMany();
  await prisma.package.deleteMany();
  await prisma.intakeAnswer.deleteMany();
  await prisma.intakeQuestion.deleteMany();
  await prisma.waitlistEntry.deleteMany();
  await prisma.booking.deleteMany();
  await prisma.staffService.deleteMany();
  await prisma.staffHours.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.service.deleteMany();
  await prisma.holiday.deleteMany();
  await prisma.businessHours.deleteMany();
  await prisma.settings.deleteMany();
  await prisma.user.deleteMany();
  await prisma.branch.deleteMany();
  await prisma.business.deleteMany();

  // Create business
  const business = await prisma.business.create({
    data: {
      name: "BookFlow Demo",
      slug: "bookflow-demo",
      email: "admin@bookflow.demo",
      phone: "+1-555-0100",
      address: "123 Main St, Anytown, USA",
      timezone: "America/New_York",
    },
  });

  // Create main branch
  const mainBranch = await prisma.branch.create({
    data: {
      businessId: business.id,
      name: "Main Branch",
      address: "123 Main St, Anytown, USA",
      phone: "+1-555-0100",
    },
  });

  // Create settings
  await prisma.settings.create({
    data: {
      businessId: business.id,
      cancellationWindowHours: 24,
      rescheduleWindowHours: 24,
      autoConfirmBookings: false,
      maxAdvanceBookingDays: 30,
      minAdvanceBookingHours: 1,
    },
  });

  // Create admin user
  const adminHash = await bcrypt.hash("admin123", 10);
  const admin = await prisma.user.create({
    data: {
      businessId: business.id,
      branchId: mainBranch.id,
      email: "admin@bookflow.demo",
      passwordHash: adminHash,
      name: "Admin User",
      role: "ADMIN",
    },
  });

  // Create staff users
  const staffHash = await bcrypt.hash("staff123", 10);
  const staff1 = await prisma.user.create({
    data: {
      businessId: business.id,
      branchId: mainBranch.id,
      email: "alice@bookflow.demo",
      passwordHash: staffHash,
      name: "Alice Johnson",
      phone: "+1-555-0101",
      role: "STAFF",
    },
  });

  const staff2 = await prisma.user.create({
    data: {
      businessId: business.id,
      branchId: mainBranch.id,
      email: "bob@bookflow.demo",
      passwordHash: staffHash,
      name: "Bob Smith",
      phone: "+1-555-0102",
      role: "STAFF",
    },
  });

  // Create business hours (Mon-Fri 9am-6pm, Sat 10am-4pm, Sun closed)
  const dayConfigs = [
    { dayOfWeek: 0, startTime: "00:00", endTime: "00:00", isClosed: true },
    { dayOfWeek: 1, startTime: "09:00", endTime: "18:00", isClosed: false },
    { dayOfWeek: 2, startTime: "09:00", endTime: "18:00", isClosed: false },
    { dayOfWeek: 3, startTime: "09:00", endTime: "18:00", isClosed: false },
    { dayOfWeek: 4, startTime: "09:00", endTime: "18:00", isClosed: false },
    { dayOfWeek: 5, startTime: "09:00", endTime: "18:00", isClosed: false },
    { dayOfWeek: 6, startTime: "10:00", endTime: "16:00", isClosed: false },
  ];

  for (const config of dayConfigs) {
    await prisma.businessHours.create({
      data: {
        businessId: business.id,
        branchId: mainBranch.id,
        ...config,
      },
    });
  }

  // Create staff hours
  for (const staff of [staff1, staff2]) {
    for (let day = 1; day <= 5; day++) {
      await prisma.staffHours.create({
        data: {
          userId: staff.id,
          dayOfWeek: day,
          startTime: "09:00",
          endTime: "18:00",
          isActive: true,
        },
      });
    }
  }

  // Create services
  const haircut = await prisma.service.create({
    data: {
      businessId: business.id,
      branchId: mainBranch.id,
      name: "Haircut",
      description: "Professional haircut and styling",
      durationMinutes: 30,
      price: 3500,
      bufferAfter: 10,
      sortOrder: 1,
    },
  });

  const coloring = await prisma.service.create({
    data: {
      businessId: business.id,
      branchId: mainBranch.id,
      name: "Hair Coloring",
      description: "Full hair coloring service",
      durationMinutes: 90,
      price: 12000,
      depositAmount: 3000,
      bufferBefore: 5,
      bufferAfter: 15,
      sortOrder: 2,
    },
  });

  const consultation = await prisma.service.create({
    data: {
      businessId: business.id,
      branchId: mainBranch.id,
      name: "Consultation",
      description: "Initial consultation and assessment",
      durationMinutes: 15,
      price: 0,
      sortOrder: 3,
    },
  });

  const massage = await prisma.service.create({
    data: {
      businessId: business.id,
      branchId: mainBranch.id,
      name: "Massage Therapy",
      description: "60-minute relaxation massage",
      durationMinutes: 60,
      price: 8000,
      depositAmount: 2000,
      bufferBefore: 5,
      bufferAfter: 10,
      sortOrder: 4,
    },
  });

  // Link staff to services
  for (const service of [haircut, coloring, consultation, massage]) {
    await prisma.staffService.create({
      data: { userId: staff1.id, serviceId: service.id },
    });
    await prisma.staffService.create({
      data: { userId: staff2.id, serviceId: service.id },
    });
  }

  // Create intake questions for coloring service
  await prisma.intakeQuestion.create({
    data: {
      serviceId: coloring.id,
      label: "What color are you looking for?",
      type: "TEXT",
      isRequired: true,
      sortOrder: 1,
    },
  });

  await prisma.intakeQuestion.create({
    data: {
      serviceId: coloring.id,
      label: "Any allergies we should know about?",
      type: "TEXTAREA",
      isRequired: false,
      sortOrder: 2,
    },
  });

  await prisma.intakeQuestion.create({
    data: {
      serviceId: coloring.id,
      label: "Previous coloring experience",
      type: "SELECT",
      options: JSON.stringify(["First time", "Occasional", "Regular"]),
      isRequired: true,
      sortOrder: 3,
    },
  });

  // Create customers
  const customer1 = await prisma.customer.create({
    data: {
      businessId: business.id,
      email: "jane@example.com",
      name: "Jane Doe",
      phone: "+1-555-0201",
    },
  });

  const customer2 = await prisma.customer.create({
    data: {
      businessId: business.id,
      email: "john@example.com",
      name: "John Wilson",
      phone: "+1-555-0202",
    },
  });

  // Create a package
  const pkg = await prisma.package.create({
    data: {
      businessId: business.id,
      name: "Haircut Bundle (5 Sessions)",
      description: "Save 20% with a 5-session haircut package",
      totalSessions: 5,
      price: 14000,
      validDays: 180,
    },
  });

  await prisma.packageService.create({
    data: { packageId: pkg.id, serviceId: haircut.id },
  });

  // Create sample bookings
  const today = new Date();
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const dayAfter = new Date(today);
  dayAfter.setDate(dayAfter.getDate() + 2);

  const formatDate = (d: Date) => d.toISOString().split("T")[0];

  await prisma.booking.create({
    data: {
      businessId: business.id,
      branchId: mainBranch.id,
      serviceId: haircut.id,
      customerId: customer1.id,
      staffId: staff1.id,
      date: formatDate(tomorrow),
      startTime: "10:00",
      endTime: "10:30",
      status: "CONFIRMED",
      totalAmount: 3500,
    },
  });

  await prisma.booking.create({
    data: {
      businessId: business.id,
      branchId: mainBranch.id,
      serviceId: coloring.id,
      customerId: customer2.id,
      staffId: staff2.id,
      date: formatDate(tomorrow),
      startTime: "14:00",
      endTime: "15:30",
      status: "PENDING",
      depositStatus: "PENDING",
      depositAmount: 3000,
      totalAmount: 12000,
    },
  });

  await prisma.booking.create({
    data: {
      businessId: business.id,
      branchId: mainBranch.id,
      serviceId: massage.id,
      customerId: customer1.id,
      staffId: staff1.id,
      date: formatDate(dayAfter),
      startTime: "11:00",
      endTime: "12:00",
      status: "CONFIRMED",
      depositStatus: "PAID",
      depositAmount: 2000,
      totalAmount: 8000,
    },
  });

  // Create a holiday
  await prisma.holiday.create({
    data: {
      businessId: business.id,
      branchId: mainBranch.id,
      date: "2026-12-25",
      name: "Christmas Day",
    },
  });

  console.log("Seed completed successfully!");
  console.log(`Business: ${business.name} (${business.id})`);
  console.log(`Admin: admin@bookflow.demo / admin123`);
  console.log(`Staff: alice@bookflow.demo / staff123`);
  console.log(`Staff: bob@bookflow.demo / staff123`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
