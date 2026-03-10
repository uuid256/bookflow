import { notFound } from "next/navigation";
import Link from "next/link";
import { requireAdmin, getBusinessId } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { StaffHoursForm } from "./staff-hours-form";
import { StaffServicesForm } from "./staff-services-form";

const DAY_NAMES = [
  "Sunday",
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
];

export default async function StaffDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await requireAdmin();
  const businessId = getBusinessId(session);

  const user = await prisma.user.findFirst({
    where: { id, businessId },
    include: {
      staffHours: { orderBy: { dayOfWeek: "asc" } },
      staffServices: { include: { service: true } },
    },
  });

  if (!user) {
    notFound();
  }

  const allServices = await prisma.service.findMany({
    where: { businessId, isActive: true },
    orderBy: { name: "asc" },
  });

  const assignedServiceIds = new Set(
    user.staffServices.map((ss) => ss.serviceId)
  );

  // Build hours map: dayOfWeek -> StaffHours
  const hoursMap = new Map(user.staffHours.map((h) => [h.dayOfWeek, h]));

  const hoursData = DAY_NAMES.map((name, index) => {
    const hours = hoursMap.get(index);
    return {
      dayOfWeek: index,
      dayName: name,
      startTime: hours?.startTime ?? "09:00",
      endTime: hours?.endTime ?? "17:00",
      isActive: hours?.isActive ?? false,
      hasRecord: !!hours,
    };
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/admin/staff">
          <Button variant="ghost" size="sm">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold">{user.name}</h1>
          <div className="flex items-center gap-2 text-muted-foreground">
            <span>{user.email}</span>
            <Badge
              variant={user.role === "ADMIN" ? "default" : "secondary"}
            >
              {user.role}
            </Badge>
            <Badge
              variant={user.isActive ? "default" : "outline"}
              className={
                user.isActive
                  ? "bg-green-100 text-green-800 hover:bg-green-100"
                  : ""
              }
            >
              {user.isActive ? "Active" : "Inactive"}
            </Badge>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Working Hours</CardTitle>
          </CardHeader>
          <CardContent>
            <StaffHoursForm userId={user.id} hours={hoursData} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Assigned Services</CardTitle>
          </CardHeader>
          <CardContent>
            {allServices.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No services available. Create services first.
              </p>
            ) : (
              <StaffServicesForm
                userId={user.id}
                services={allServices.map((s) => ({
                  id: s.id,
                  name: s.name,
                  assigned: assignedServiceIds.has(s.id),
                }))}
              />
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
