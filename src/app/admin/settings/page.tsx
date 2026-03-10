import { requireAuth } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";
import { BusinessHoursForm, SettingsForm, HolidaysForm } from "./settings-form";

export default async function SettingsPage() {
  const session = await requireAuth();
  const businessId = session.user.businessId;

  const [hours, settings, holidays] = await Promise.all([
    prisma.businessHours.findMany({
      where: { businessId },
      orderBy: { dayOfWeek: "asc" },
    }),
    prisma.settings.findUnique({ where: { businessId } }),
    prisma.holiday.findMany({
      where: { businessId },
      orderBy: { date: "asc" },
    }),
  ]);

  const defaultSettings = settings || {
    cancellationWindowHours: 24,
    rescheduleWindowHours: 24,
    autoConfirmBookings: false,
    maxAdvanceBookingDays: 30,
    minAdvanceBookingHours: 1,
  };

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold">Settings</h1>
      <BusinessHoursForm
        hours={hours.map((h) => ({
          dayOfWeek: h.dayOfWeek,
          startTime: h.startTime,
          endTime: h.endTime,
          isClosed: h.isClosed,
        }))}
      />
      <SettingsForm settings={defaultSettings} />
      <HolidaysForm
        holidays={holidays.map((h) => ({
          id: h.id,
          date: h.date,
          name: h.name,
        }))}
      />
    </div>
  );
}
