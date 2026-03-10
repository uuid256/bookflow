"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { formatCurrency, formatTime } from "@/lib/utils";
import { getStatusColor } from "@/lib/booking-utils";
import { Search, Calendar, Clock, ArrowLeft } from "lucide-react";
import Link from "next/link";

type BookingData = {
  id: string;
  date: string;
  startTime: string;
  endTime: string;
  status: string;
  totalAmount: number;
  depositAmount: number;
  depositStatus: string;
  service: { name: string; durationMinutes: number };
  staff: { name: string } | null;
  canCancel: boolean;
  canReschedule: boolean;
};

export default function MyBookingsPage() {
  const [email, setEmail] = useState("");
  const [bookings, setBookings] = useState<BookingData[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [rescheduleId, setRescheduleId] = useState<string | null>(null);
  const [newDate, setNewDate] = useState("");
  const [newTime, setNewTime] = useState("");
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);

  async function lookupBookings() {
    if (!email) return;
    setLoading(true);
    try {
      const res = await fetch(`/api/bookings/lookup?email=${encodeURIComponent(email)}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setBookings(data.bookings);
    } catch (err: any) {
      toast.error(err.message || "Failed to load bookings");
    }
    setLoading(false);
  }

  async function handleCancel(bookingId: string) {
    if (!confirm("Are you sure you want to cancel this booking?")) return;
    try {
      const res = await fetch(`/api/bookings/${bookingId}/cancel`, { method: "POST" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success("Booking cancelled");
      lookupBookings();
    } catch (err: any) {
      toast.error(err.message);
    }
  }

  async function handleReschedule(bookingId: string) {
    if (!newDate || !newTime) return;
    try {
      const res = await fetch(`/api/bookings/${bookingId}/reschedule`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ date: newDate, startTime: newTime }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      toast.success("Booking rescheduled");
      setRescheduleId(null);
      setNewDate("");
      setNewTime("");
      lookupBookings();
    } catch (err: any) {
      toast.error(err.message);
    }
  }

  async function fetchSlots(bookingId: string, date: string) {
    setLoadingSlots(true);
    try {
      const res = await fetch(
        `/api/bookings/${bookingId}/available-reschedule-slots?date=${date}`
      );
      const data = await res.json();
      setAvailableSlots(data.slots || []);
    } catch {
      setAvailableSlots([]);
    }
    setLoadingSlots(false);
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100">
      <header className="border-b bg-white/80 backdrop-blur-sm">
        <div className="container mx-auto flex items-center gap-4 px-4 py-4">
          <Link href="/">
            <Button variant="ghost" size="icon"><ArrowLeft className="h-4 w-4" /></Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold">My Bookings</h1>
            <p className="text-sm text-muted-foreground">View and manage your appointments</p>
          </div>
        </div>
      </header>
      <main className="container mx-auto max-w-2xl px-4 py-8 space-y-6">
        <Card>
          <CardContent className="p-4">
            <div className="flex gap-3">
              <div className="flex-1">
                <Label className="sr-only">Email</Label>
                <Input
                  type="email"
                  placeholder="Enter your email to find bookings"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && lookupBookings()}
                />
              </div>
              <Button onClick={lookupBookings} disabled={loading || !email}>
                <Search className="mr-2 h-4 w-4" />
                {loading ? "Looking up..." : "Find"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {bookings !== null && (
          <>
            {bookings.length === 0 ? (
              <div className="rounded-lg border p-8 text-center text-muted-foreground">
                No bookings found for this email.
              </div>
            ) : (
              <div className="space-y-4">
                {bookings.map((b) => (
                  <Card key={b.id}>
                    <CardContent className="p-4 space-y-3">
                      <div className="flex items-start justify-between">
                        <div>
                          <h3 className="font-semibold">{b.service.name}</h3>
                          {b.staff && (
                            <p className="text-sm text-muted-foreground">with {b.staff.name}</p>
                          )}
                        </div>
                        <Badge variant={getStatusColor(b.status) as any}>{b.status}</Badge>
                      </div>
                      <div className="flex gap-4 text-sm text-muted-foreground">
                        <span className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" /> {b.date}
                        </span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" /> {formatTime(b.startTime)} - {formatTime(b.endTime)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span>Total: {formatCurrency(b.totalAmount)}</span>
                        {b.depositAmount > 0 && (
                          <Badge variant={b.depositStatus === "PAID" ? "success" : "warning"}>
                            Deposit: {formatCurrency(b.depositAmount)} ({b.depositStatus})
                          </Badge>
                        )}
                      </div>

                      {rescheduleId === b.id ? (
                        <div className="space-y-3 rounded-lg border p-3">
                          <h4 className="font-medium">Reschedule</h4>
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <Label>New Date</Label>
                              <Input
                                type="date"
                                value={newDate}
                                min={new Date().toISOString().split("T")[0]}
                                onChange={(e) => {
                                  setNewDate(e.target.value);
                                  setNewTime("");
                                  if (e.target.value) fetchSlots(b.id, e.target.value);
                                }}
                              />
                            </div>
                          </div>
                          {newDate && !loadingSlots && availableSlots.length > 0 && (
                            <div className="grid grid-cols-3 gap-2">
                              {availableSlots.map((s) => (
                                <Button
                                  key={s}
                                  size="sm"
                                  variant={newTime === s ? "default" : "outline"}
                                  onClick={() => setNewTime(s)}
                                >
                                  {formatTime(s)}
                                </Button>
                              ))}
                            </div>
                          )}
                          {newDate && !loadingSlots && availableSlots.length === 0 && (
                            <p className="text-sm text-muted-foreground">No slots available</p>
                          )}
                          <div className="flex gap-2">
                            <Button
                              size="sm"
                              onClick={() => handleReschedule(b.id)}
                              disabled={!newDate || !newTime}
                            >
                              Confirm Reschedule
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => {
                                setRescheduleId(null);
                                setNewDate("");
                                setNewTime("");
                              }}
                            >
                              Cancel
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex gap-2">
                          {b.canReschedule && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setRescheduleId(b.id)}
                            >
                              Reschedule
                            </Button>
                          )}
                          {b.canCancel && (
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => handleCancel(b.id)}
                            >
                              Cancel
                            </Button>
                          )}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </>
        )}
      </main>
    </div>
  );
}
