import { prisma } from "@/lib/prisma";
import { BookingWizard } from "./booking-wizard";

export default async function BookPage() {
  const business = await prisma.business.findFirst({
    where: { slug: "bookflow-demo" },
  });

  if (!business) {
    return <div className="p-8 text-center">Business not found</div>;
  }

  const services = await prisma.service.findMany({
    where: { businessId: business.id, isActive: true },
    include: {
      intakeQuestions: { orderBy: { sortOrder: "asc" } },
      staffServices: {
        include: { user: { select: { id: true, name: true, isActive: true } } },
      },
    },
    orderBy: { sortOrder: "asc" },
  });

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <header className="border-b bg-white/80 backdrop-blur-sm">
        <div className="container mx-auto px-4 py-4">
          <h1 className="text-2xl font-bold">{business.name}</h1>
          <p className="text-sm text-muted-foreground">Book your appointment</p>
        </div>
      </header>
      <main className="container mx-auto max-w-2xl px-4 py-8">
        <BookingWizard
          businessSlug={business.slug}
          services={services.map((s) => ({
            id: s.id,
            name: s.name,
            description: s.description,
            durationMinutes: s.durationMinutes,
            price: s.price,
            depositAmount: s.depositAmount,
            intakeQuestions: s.intakeQuestions.map((q) => ({
              id: q.id,
              label: q.label,
              type: q.type,
              options: q.options ? JSON.parse(q.options) : [],
              isRequired: q.isRequired,
            })),
            staff: s.staffServices
              .filter((ss) => ss.user.isActive)
              .map((ss) => ({
                id: ss.user.id,
                name: ss.user.name,
              })),
          }))}
        />
      </main>
    </div>
  );
}
