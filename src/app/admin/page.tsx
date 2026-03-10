import { requireAuth } from "@/lib/auth-guard";
import { prisma } from "@/lib/prisma";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar, Users, Scissors, DollarSign, Clock, XCircle } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

export default async function AdminDashboard() {
  const session = await requireAuth();
  const businessId = session.user.businessId;

  const [
    totalBookings,
    pendingBookings,
    confirmedBookings,
    completedBookings,
    cancelledBookings,
    noShowBookings,
    totalCustomers,
    totalServices,
    revenueResult,
  ] = await Promise.all([
    prisma.booking.count({ where: { businessId } }),
    prisma.booking.count({ where: { businessId, status: "PENDING" } }),
    prisma.booking.count({ where: { businessId, status: "CONFIRMED" } }),
    prisma.booking.count({ where: { businessId, status: "COMPLETED" } }),
    prisma.booking.count({ where: { businessId, status: "CANCELLED" } }),
    prisma.booking.count({ where: { businessId, status: "NO_SHOW" } }),
    prisma.customer.count({ where: { businessId } }),
    prisma.service.count({ where: { businessId, isActive: true } }),
    prisma.booking.aggregate({
      where: { businessId, status: "COMPLETED" },
      _sum: { totalAmount: true },
    }),
  ]);

  const revenue = revenueResult._sum.totalAmount || 0;

  const upcomingBookings = await prisma.booking.findMany({
    where: {
      businessId,
      status: { in: ["PENDING", "CONFIRMED"] },
      date: { gte: new Date().toISOString().split("T")[0] },
    },
    include: {
      service: true,
      customer: true,
      staff: true,
    },
    orderBy: [{ date: "asc" }, { startTime: "asc" }],
    take: 5,
  });

  const stats = [
    { label: "Total Bookings", value: totalBookings, icon: Calendar, color: "text-blue-600" },
    { label: "Pending", value: pendingBookings, icon: Clock, color: "text-yellow-600" },
    { label: "Confirmed", value: confirmedBookings, icon: Calendar, color: "text-green-600" },
    { label: "Completed", value: completedBookings, icon: Calendar, color: "text-slate-600" },
    { label: "Cancelled", value: cancelledBookings, icon: XCircle, color: "text-red-600" },
    { label: "No-Shows", value: noShowBookings, icon: XCircle, color: "text-orange-600" },
    { label: "Customers", value: totalCustomers, icon: Users, color: "text-purple-600" },
    { label: "Services", value: totalServices, icon: Scissors, color: "text-pink-600" },
    { label: "Revenue", value: formatCurrency(revenue), icon: DollarSign, color: "text-emerald-600" },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">Welcome back, {session.user.name}</p>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {stats.map((stat) => (
          <Card key={stat.label}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                {stat.label}
              </CardTitle>
              <stat.icon className={`h-4 w-4 ${stat.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stat.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Upcoming Bookings</CardTitle>
        </CardHeader>
        <CardContent>
          {upcomingBookings.length === 0 ? (
            <p className="text-sm text-muted-foreground">No upcoming bookings</p>
          ) : (
            <div className="space-y-3">
              {upcomingBookings.map((booking) => (
                <div
                  key={booking.id}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <div>
                    <p className="font-medium">{booking.customer.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {booking.service.name} {booking.staff ? `with ${booking.staff.name}` : ""}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium">{booking.date}</p>
                    <p className="text-sm text-muted-foreground">
                      {booking.startTime} - {booking.endTime}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
