import { requireAuth } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";
import {
  Calendar,
  CheckCircle,
  XCircle,
  AlertTriangle,
  DollarSign,
  Users,
  TrendingUp,
  BarChart3,
} from "lucide-react";
import { AnalyticsCharts } from "./charts";

export default async function AnalyticsPage() {
  const session = await requireAuth();
  const businessId = session.user.businessId;

  const [
    totalBookings,
    completedBookings,
    cancelledBookings,
    noShowBookings,
    revenueResult,
    bookingsByService,
    bookingsByStaff,
    allBookings,
    repeatCustomerResult,
  ] = await Promise.all([
    prisma.booking.count({ where: { businessId } }),
    prisma.booking.count({ where: { businessId, status: "COMPLETED" } }),
    prisma.booking.count({ where: { businessId, status: "CANCELLED" } }),
    prisma.booking.count({ where: { businessId, status: "NO_SHOW" } }),
    prisma.booking.aggregate({
      where: { businessId, status: "COMPLETED" },
      _sum: { totalAmount: true },
    }),
    prisma.booking.groupBy({
      by: ["serviceId"],
      where: { businessId },
      _count: { id: true },
    }),
    prisma.booking.groupBy({
      by: ["staffId"],
      where: { businessId, staffId: { not: null } },
      _count: { id: true },
    }),
    prisma.booking.findMany({
      where: { businessId },
      select: {
        status: true,
        date: true,
        startTime: true,
        totalAmount: true,
      },
    }),
    prisma.booking.groupBy({
      by: ["customerId"],
      where: { businessId },
      _count: { id: true },
      having: { id: { _count: { gte: 2 } } },
    }),
  ]);

  const revenue = revenueResult._sum.totalAmount || 0;
  const repeatCustomerCount = repeatCustomerResult.length;

  // Fetch service names for the bookings-by-service chart
  const serviceIds = bookingsByService.map((b) => b.serviceId);
  const services = await prisma.service.findMany({
    where: { id: { in: serviceIds } },
    select: { id: true, name: true },
  });
  const serviceMap = new Map(services.map((s) => [s.id, s.name]));

  const serviceChartData = bookingsByService.map((b) => ({
    name: serviceMap.get(b.serviceId) || "Unknown",
    bookings: b._count.id,
  }));

  // Fetch staff names for the bookings-by-staff chart
  const staffIds = bookingsByStaff
    .map((b) => b.staffId)
    .filter((id): id is string => id !== null);
  const staffMembers = await prisma.user.findMany({
    where: { id: { in: staffIds } },
    select: { id: true, name: true },
  });
  const staffMap = new Map(staffMembers.map((s) => [s.id, s.name]));

  const staffChartData = bookingsByStaff.map((b) => ({
    name: b.staffId ? staffMap.get(b.staffId) || "Unknown" : "Unassigned",
    bookings: b._count.id,
  }));

  // Revenue trend by month (from COMPLETED bookings in allBookings)
  const revenueTrendMap = new Map<string, number>();
  for (const booking of allBookings) {
    if (booking.status === "COMPLETED" && booking.date) {
      const month = booking.date.substring(0, 7); // "YYYY-MM"
      revenueTrendMap.set(
        month,
        (revenueTrendMap.get(month) || 0) + (booking.totalAmount || 0)
      );
    }
  }
  const revenueTrendData = Array.from(revenueTrendMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, amount]) => ({
      month,
      revenue: amount / 100,
    }));

  // Bookings by status
  const statusCountMap = new Map<string, number>();
  for (const booking of allBookings) {
    statusCountMap.set(
      booking.status,
      (statusCountMap.get(booking.status) || 0) + 1
    );
  }
  const statusChartData = Array.from(statusCountMap.entries()).map(
    ([status, count]) => ({
      name: status.charAt(0) + status.slice(1).toLowerCase().replace("_", " "),
      value: count,
    })
  );

  // Peak booking times (group by hour)
  const hourCountMap = new Map<number, number>();
  for (const booking of allBookings) {
    if (booking.startTime) {
      const hour = parseInt(booking.startTime.split(":")[0], 10);
      hourCountMap.set(hour, (hourCountMap.get(hour) || 0) + 1);
    }
  }
  const peakTimesData = Array.from(hourCountMap.entries())
    .sort(([a], [b]) => a - b)
    .map(([hour, count]) => {
      const ampm = hour >= 12 ? "PM" : "AM";
      const displayHour = hour % 12 || 12;
      return {
        time: `${displayHour} ${ampm}`,
        bookings: count,
      };
    });

  const stats = [
    {
      label: "Total Bookings",
      value: totalBookings,
      icon: Calendar,
      color: "text-blue-600",
      bg: "bg-blue-50",
    },
    {
      label: "Completed",
      value: completedBookings,
      icon: CheckCircle,
      color: "text-emerald-600",
      bg: "bg-emerald-50",
    },
    {
      label: "Cancelled",
      value: cancelledBookings,
      icon: XCircle,
      color: "text-red-600",
      bg: "bg-red-50",
    },
    {
      label: "No-Shows",
      value: noShowBookings,
      icon: AlertTriangle,
      color: "text-orange-600",
      bg: "bg-orange-50",
    },
    {
      label: "Total Revenue",
      value: formatCurrency(revenue),
      icon: DollarSign,
      color: "text-emerald-600",
      bg: "bg-emerald-50",
    },
    {
      label: "Repeat Customers",
      value: repeatCustomerCount,
      icon: Users,
      color: "text-purple-600",
      bg: "bg-purple-50",
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Analytics</h1>
        <p className="text-muted-foreground">
          Business performance overview and insights
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.label}
              </CardTitle>
              <div className={`rounded-md p-2 ${stat.bg}`}>
                <stat.icon className={`h-4 w-4 ${stat.color}`} />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <AnalyticsCharts
        serviceChartData={serviceChartData}
        staffChartData={staffChartData}
        revenueTrendData={revenueTrendData}
        statusChartData={statusChartData}
        peakTimesData={peakTimesData}
      />
    </div>
  );
}
