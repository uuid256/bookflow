import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { checkSlotAvailability, addMinutes } from "@/lib/booking-utils";
import { isAllowed, getClientIp } from "@/lib/rate-limit";
import { isValidOrigin } from "@/lib/csrf";

const bookingRequestSchema = z.object({
  businessSlug: z.string().min(1, "businessSlug is required"),
  serviceId: z.string().min(1),
  staffId: z.string().optional().nullable(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  startTime: z.string().regex(/^\d{2}:\d{2}$/),
  customerName: z.string().min(1),
  customerEmail: z.string().email(),
  customerPhone: z.string().optional(),
  notes: z.string().optional(),
  intakeAnswers: z.array(z.object({
    questionId: z.string(),
    answer: z.string(),
  })).optional(),
});

export async function POST(request: NextRequest) {
  if (!isValidOrigin(request)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // 10 booking attempts per IP per 10 minutes
  if (!isAllowed(`create:${getClientIp(request)}`, 10, 10 * 60_000)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  try {
    const body = await request.json();
    const parsed = bookingRequestSchema.parse(body);

    const business = await prisma.business.findFirst({
      where: { slug: parsed.businessSlug },
    });
    if (!business) {
      return NextResponse.json({ error: "Business not found" }, { status: 404 });
    }

    const service = await prisma.service.findFirst({
      where: { id: parsed.serviceId, businessId: business.id, isActive: true },
    });
    if (!service) {
      return NextResponse.json({ error: "Service not found" }, { status: 404 });
    }

    const endTime = addMinutes(parsed.startTime, service.durationMinutes);

    // Auto-assign staff if not provided
    let staffId = parsed.staffId || null;
    if (!staffId) {
      const staffServices = await prisma.staffService.findMany({
        where: { serviceId: parsed.serviceId },
        include: { user: true },
        take: 100,
      });

      for (const ss of staffServices) {
        if (!ss.user.isActive) continue;
        const result = await checkSlotAvailability({
          businessId: business.id,
          date: parsed.date,
          startTime: parsed.startTime,
          endTime,
          staffId: ss.userId,
          bufferBefore: service.bufferBefore,
          bufferAfter: service.bufferAfter,
        });
        if (result.available) {
          staffId = ss.userId;
          break;
        }
      }
    }

    // Check availability
    const availability = await checkSlotAvailability({
      businessId: business.id,
      date: parsed.date,
      startTime: parsed.startTime,
      endTime,
      staffId,
      bufferBefore: service.bufferBefore,
      bufferAfter: service.bufferAfter,
    });

    if (!availability.available) {
      return NextResponse.json(
        { error: availability.reason || "Slot not available" },
        { status: 409 }
      );
    }

    // Find or create customer
    let customer = await prisma.customer.findFirst({
      where: { businessId: business.id, email: parsed.customerEmail },
    });

    if (!customer) {
      customer = await prisma.customer.create({
        data: {
          businessId: business.id,
          email: parsed.customerEmail,
          name: parsed.customerName,
          phone: parsed.customerPhone || null,
        },
      });
    }

    const settings = await prisma.settings.findUnique({
      where: { businessId: business.id },
    });

    const branch = await prisma.branch.findFirst({
      where: { businessId: business.id },
    });

    // Create booking with intake answers in a transaction
    const booking = await prisma.$transaction(async (tx) => {
      const newBooking = await tx.booking.create({
        data: {
          businessId: business.id,
          branchId: branch?.id || null,
          serviceId: parsed.serviceId,
          customerId: customer!.id,
          staffId,
          date: parsed.date,
          startTime: parsed.startTime,
          endTime,
          status: settings?.autoConfirmBookings ? "CONFIRMED" : "PENDING",
          totalAmount: service.price,
          depositAmount: service.depositAmount,
          depositStatus: service.depositAmount > 0 ? "PENDING" : "NONE",
          notes: parsed.notes || null,
        },
      });

      // Save intake answers
      if (parsed.intakeAnswers && parsed.intakeAnswers.length > 0) {
        for (const answer of parsed.intakeAnswers) {
          await tx.intakeAnswer.create({
            data: {
              bookingId: newBooking.id,
              questionId: answer.questionId,
              answer: answer.answer,
            },
          });
        }
      }

      // Create notification
      await tx.notification.create({
        data: {
          bookingId: newBooking.id,
          type: "CONFIRMATION",
          channel: "EMAIL",
          status: "PENDING",
        },
      });

      return newBooking;
    });

    return NextResponse.json({
      success: true,
      bookingId: booking.id,
      status: booking.status,
      depositRequired: service.depositAmount > 0,
      depositAmount: service.depositAmount,
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }
    console.error("[POST /api/bookings/create]", error);
    return NextResponse.json({ error: "An internal error occurred" }, { status: 500 });
  }
}
