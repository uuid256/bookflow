import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { z } from "zod";
import { isAllowed, getClientIp } from "@/lib/rate-limit";
import { isValidOrigin } from "@/lib/csrf";

const joinWaitlistSchema = z.object({
  businessSlug: z.string().min(1, "businessSlug is required"),
  email: z.string().email(),
  name: z.string().min(1),
  serviceId: z.string().min(1),
  preferredDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  preferredTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
});

export async function POST(request: NextRequest) {
  if (!isValidOrigin(request)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  // 5 waitlist joins per IP per 10 minutes
  if (!isAllowed(`waitlist:${getClientIp(request)}`, 5, 10 * 60_000)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  try {
    const body = await request.json();
    const parsed = joinWaitlistSchema.parse(body);

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

    // Find or create customer
    let customer = await prisma.customer.findFirst({
      where: { businessId: business.id, email: parsed.email },
    });

    if (!customer) {
      customer = await prisma.customer.create({
        data: {
          businessId: business.id,
          email: parsed.email,
          name: parsed.name,
        },
      });
    }

    const entry = await prisma.waitlistEntry.create({
      data: {
        businessId: business.id,
        customerId: customer.id,
        serviceId: parsed.serviceId,
        preferredDate: parsed.preferredDate,
        preferredTime: parsed.preferredTime ?? null,
        status: "WAITING",
      },
    });

    return NextResponse.json({
      success: true,
      waitlistEntryId: entry.id,
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request" },
        { status: 400 }
      );
    }
    console.error("[POST /api/waitlist/join]", error);
    return NextResponse.json(
      { error: "An internal error occurred" },
      { status: 500 }
    );
  }
}
