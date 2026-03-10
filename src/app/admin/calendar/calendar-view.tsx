"use client";

import { useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { getStatusColor } from "@/lib/booking-utils";

type BookingItem = {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  status: string;
  serviceName: string;
  customerName: string;
  staffName: string;
};

type CalendarViewProps = {
  bookings: BookingItem[];
  staff: { id: string; name: string }[];
  today: string;
};

export function CalendarView({ bookings, staff, today }: CalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(new Date(today + "T12:00:00"));
  const [view, setView] = useState<"week" | "day">("week");

  const weekStart = useMemo(() => {
    const d = new Date(currentDate);
    d.setDate(d.getDate() - d.getDay());
    return d;
  }, [currentDate]);

  const weekDays = useMemo(() => {
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(weekStart);
      d.setDate(d.getDate() + i);
      return d.toISOString().split("T")[0];
    });
  }, [weekStart]);

  const currentDateStr = currentDate.toISOString().split("T")[0];

  function navigate(direction: number) {
    const d = new Date(currentDate);
    d.setDate(d.getDate() + (view === "week" ? direction * 7 : direction));
    setCurrentDate(d);
  }

  const displayDates = view === "week" ? weekDays : [currentDateStr];

  const dayNames = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const months = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December",
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="outline" size="icon" onClick={() => navigate(-1)}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <h2 className="text-lg font-semibold">
          {months[currentDate.getMonth()]} {currentDate.getFullYear()}
        </h2>
        <Button variant="outline" size="icon" onClick={() => navigate(1)}>
          <ChevronRight className="h-4 w-4" />
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setCurrentDate(new Date(today + "T12:00:00"))}
        >
          Today
        </Button>
        <div className="ml-auto flex gap-1">
          <Button
            variant={view === "day" ? "default" : "outline"}
            size="sm"
            onClick={() => setView("day")}
          >
            Day
          </Button>
          <Button
            variant={view === "week" ? "default" : "outline"}
            size="sm"
            onClick={() => setView("week")}
          >
            Week
          </Button>
        </div>
      </div>

      <div className={`grid gap-4 ${view === "week" ? "grid-cols-1 md:grid-cols-7" : "grid-cols-1"}`}>
        {displayDates.map((dateStr) => {
          const dayBookings = bookings.filter((b) => b.date === dateStr);
          const d = new Date(dateStr + "T12:00:00");
          const isToday = dateStr === today;

          return (
            <Card
              key={dateStr}
              className={isToday ? "ring-2 ring-primary" : ""}
            >
              <CardHeader className="p-3 pb-1">
                <CardTitle className="text-sm">
                  {dayNames[d.getDay()]} {d.getDate()}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-3 pt-0">
                {dayBookings.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No bookings</p>
                ) : (
                  <div className="space-y-1">
                    {dayBookings.map((b) => (
                      <div
                        key={b.id}
                        className="rounded border p-2 text-xs"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-medium">
                            {b.startTime}-{b.endTime}
                          </span>
                          <Badge
                            variant={getStatusColor(b.status) as any}
                            className="text-[10px]"
                          >
                            {b.status}
                          </Badge>
                        </div>
                        <p className="truncate">{b.serviceName}</p>
                        <p className="truncate text-muted-foreground">
                          {b.customerName}
                        </p>
                        <p className="truncate text-muted-foreground">
                          {b.staffName}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
