"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Check, Clock, DollarSign, ArrowLeft, ArrowRight, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { formatCurrency, formatTime } from "@/lib/utils";

type IntakeQuestion = {
  id: string;
  label: string;
  type: string;
  options: string[];
  isRequired: boolean;
};

type ServiceData = {
  id: string;
  name: string;
  description: string | null;
  durationMinutes: number;
  price: number;
  depositAmount: number;
  intakeQuestions: IntakeQuestion[];
  staff: { id: string; name: string }[];
};

type BookingWizardProps = {
  businessSlug: string;
  services: ServiceData[];
};

export function BookingWizard({ businessSlug, services }: BookingWizardProps) {
  const [step, setStep] = useState(0);
  const [serviceId, setServiceId] = useState("");
  const [staffId, setStaffId] = useState("");
  const [date, setDate] = useState("");
  const [startTime, setStartTime] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [intakeAnswers, setIntakeAnswers] = useState<Record<string, string>>({});
  const [availableSlots, setAvailableSlots] = useState<string[]>([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [bookingResult, setBookingResult] = useState<any>(null);

  const selectedService = services.find((s) => s.id === serviceId);

  async function fetchSlots(svcId: string, d: string, sId?: string) {
    setLoadingSlots(true);
    try {
      const params = new URLSearchParams({
        business: businessSlug,
        serviceId: svcId,
        date: d,
      });
      if (sId) params.set("staffId", sId);
      const res = await fetch(`/api/bookings/available-slots?${params}`);
      const data = await res.json();
      setAvailableSlots(data.slots || []);
    } catch {
      setAvailableSlots([]);
    }
    setLoadingSlots(false);
  }

  async function handleDateChange(newDate: string) {
    setDate(newDate);
    setStartTime("");
    if (serviceId && newDate) {
      await fetchSlots(serviceId, newDate, staffId || undefined);
    }
  }

  async function handleStaffChange(newStaffId: string) {
    const actualId = newStaffId === "any" ? "" : newStaffId;
    setStaffId(actualId);
    setStartTime("");
    if (serviceId && date) {
      await fetchSlots(serviceId, date, actualId || undefined);
    }
  }

  async function handleSubmit() {
    setSubmitting(true);
    try {
      const body: any = {
        businessSlug,
        serviceId,
        staffId: staffId || null,
        date,
        startTime,
        customerName: name,
        customerEmail: email,
        customerPhone: phone || undefined,
        notes: notes || undefined,
      };

      if (selectedService?.intakeQuestions.length) {
        body.intakeAnswers = Object.entries(intakeAnswers).map(([questionId, answer]) => ({
          questionId,
          answer,
        }));
      }

      const res = await fetch("/api/bookings/create", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Booking failed");

      setBookingResult(data);
      setStep(4);
      toast.success("Booking created successfully!");
    } catch (err: any) {
      toast.error(err.message);
    }
    setSubmitting(false);
  }

  // Step 0: Select service
  if (step === 0) {
    return (
      <div className="space-y-4">
        <h2 className="text-2xl font-bold">Choose a Service</h2>
        <div className="grid gap-4">
          {services.map((s) => (
            <Card
              key={s.id}
              className={`cursor-pointer transition-all hover:shadow-md ${serviceId === s.id ? "ring-2 ring-primary" : ""}`}
              onClick={() => {
                setServiceId(s.id);
                setIntakeAnswers({});
              }}
            >
              <CardContent className="flex items-center justify-between p-4">
                <div>
                  <h3 className="font-semibold">{s.name}</h3>
                  {s.description && <p className="text-sm text-muted-foreground">{s.description}</p>}
                  <div className="mt-2 flex gap-3 text-sm text-muted-foreground">
                    <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{s.durationMinutes} min</span>
                    <span className="flex items-center gap-1"><DollarSign className="h-3 w-3" />{formatCurrency(s.price)}</span>
                  </div>
                  {s.depositAmount > 0 && (
                    <Badge variant="warning" className="mt-1">
                      Deposit: {formatCurrency(s.depositAmount)}
                    </Badge>
                  )}
                </div>
                {serviceId === s.id && (
                  <Check className="h-5 w-5 text-primary" />
                )}
              </CardContent>
            </Card>
          ))}
        </div>
        <Button onClick={() => setStep(1)} disabled={!serviceId} className="w-full">
          Continue <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    );
  }

  // Step 1: Select date, staff, time
  if (step === 1) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" onClick={() => setStep(0)}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back
        </Button>
        <h2 className="text-2xl font-bold">Choose Date & Time</h2>
        <Card>
          <CardContent className="space-y-4 p-4">
            {selectedService && selectedService.staff.length > 0 && (
              <div className="space-y-2">
                <Label>Preferred Staff (optional)</Label>
                <Select value={staffId || "any"} onValueChange={handleStaffChange}>
                  <SelectTrigger>
                    <SelectValue placeholder="Any available" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="any">Any available</SelectItem>
                    {selectedService.staff.map((s) => (
                      <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="space-y-2">
              <Label>Date</Label>
              <Input
                type="date"
                value={date}
                min={new Date().toISOString().split("T")[0]}
                onChange={(e) => handleDateChange(e.target.value)}
              />
            </div>
            {date && (
              <div className="space-y-2">
                <Label>Available Times</Label>
                {loadingSlots ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="h-4 w-4 animate-spin" /> Loading slots...
                  </div>
                ) : availableSlots.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No available slots for this date</p>
                ) : (
                  <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                    {availableSlots.map((slot) => (
                      <Button
                        key={slot}
                        variant={startTime === slot ? "default" : "outline"}
                        size="sm"
                        onClick={() => setStartTime(slot)}
                      >
                        {formatTime(slot)}
                      </Button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
        <Button onClick={() => setStep(2)} disabled={!startTime} className="w-full">
          Continue <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    );
  }

  // Step 2: Intake form (if any) + customer info
  if (step === 2) {
    const questions = selectedService?.intakeQuestions || [];

    return (
      <div className="space-y-4">
        <Button variant="ghost" onClick={() => setStep(1)}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back
        </Button>
        <h2 className="text-2xl font-bold">Your Information</h2>
        <Card>
          <CardContent className="space-y-4 p-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Full Name *</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label>Email *</Label>
                <Input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Phone</Label>
              <Input value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Notes</Label>
              <Textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Any special requests..."
              />
            </div>

            {questions.length > 0 && (
              <>
                <div className="border-t pt-4">
                  <h3 className="font-semibold">Service Questions</h3>
                </div>
                {questions.map((q) => (
                  <div key={q.id} className="space-y-2">
                    <Label>{q.label}{q.isRequired ? " *" : ""}</Label>
                    {q.type === "TEXT" && (
                      <Input
                        value={intakeAnswers[q.id] || ""}
                        onChange={(e) => setIntakeAnswers({ ...intakeAnswers, [q.id]: e.target.value })}
                      />
                    )}
                    {q.type === "TEXTAREA" && (
                      <Textarea
                        value={intakeAnswers[q.id] || ""}
                        onChange={(e) => setIntakeAnswers({ ...intakeAnswers, [q.id]: e.target.value })}
                      />
                    )}
                    {q.type === "SELECT" && (
                      <Select
                        value={intakeAnswers[q.id] || ""}
                        onValueChange={(v) => setIntakeAnswers({ ...intakeAnswers, [q.id]: v })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select..." />
                        </SelectTrigger>
                        <SelectContent>
                          {q.options.map((opt) => (
                            <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                    {q.type === "CHECKBOX" && (
                      <div className="flex items-center gap-2">
                        <Checkbox
                          checked={intakeAnswers[q.id] === "true"}
                          onCheckedChange={(v) => setIntakeAnswers({ ...intakeAnswers, [q.id]: v ? "true" : "false" })}
                        />
                        <span className="text-sm">Yes</span>
                      </div>
                    )}
                  </div>
                ))}
              </>
            )}
          </CardContent>
        </Card>
        <Button
          onClick={() => setStep(3)}
          disabled={!name || !email}
          className="w-full"
        >
          Review Booking <ArrowRight className="ml-2 h-4 w-4" />
        </Button>
      </div>
    );
  }

  // Step 3: Review & confirm
  if (step === 3) {
    return (
      <div className="space-y-4">
        <Button variant="ghost" onClick={() => setStep(2)}>
          <ArrowLeft className="mr-2 h-4 w-4" /> Back
        </Button>
        <h2 className="text-2xl font-bold">Review & Confirm</h2>
        <Card>
          <CardContent className="space-y-3 p-4">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Service</span>
              <span className="font-medium">{selectedService?.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Date</span>
              <span className="font-medium">{date}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Time</span>
              <span className="font-medium">{formatTime(startTime)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Duration</span>
              <span className="font-medium">{selectedService?.durationMinutes} min</span>
            </div>
            {staffId && selectedService && (
              <div className="flex justify-between">
                <span className="text-muted-foreground">Staff</span>
                <span className="font-medium">
                  {selectedService.staff.find((s) => s.id === staffId)?.name || "Any"}
                </span>
              </div>
            )}
            <div className="border-t pt-3">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Name</span>
                <span className="font-medium">{name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Email</span>
                <span className="font-medium">{email}</span>
              </div>
            </div>
            <div className="border-t pt-3">
              <div className="flex justify-between text-lg">
                <span className="font-semibold">Total</span>
                <span className="font-bold">{formatCurrency(selectedService?.price || 0)}</span>
              </div>
              {selectedService && selectedService.depositAmount > 0 && (
                <div className="flex justify-between text-sm text-warning">
                  <span>Deposit required</span>
                  <span>{formatCurrency(selectedService.depositAmount)}</span>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
        <Button onClick={handleSubmit} disabled={submitting} className="w-full">
          {submitting ? (
            <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Booking...</>
          ) : (
            "Confirm Booking"
          )}
        </Button>
      </div>
    );
  }

  // Step 4: Confirmation
  return (
    <div className="space-y-4 text-center">
      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-green-100">
        <Check className="h-8 w-8 text-green-600" />
      </div>
      <h2 className="text-2xl font-bold">Booking Confirmed!</h2>
      <p className="text-muted-foreground">
        Your booking has been submitted. You&apos;ll receive a confirmation email shortly.
      </p>
      {bookingResult?.depositRequired && (
        <Card>
          <CardContent className="p-4">
            <p className="font-medium">Deposit Required</p>
            <p className="text-sm text-muted-foreground">
              A deposit of {formatCurrency(bookingResult.depositAmount)} is needed to secure your booking.
            </p>
            <Button className="mt-3" variant="outline">
              Pay Deposit (Coming Soon)
            </Button>
          </CardContent>
        </Card>
      )}
      <div className="flex justify-center gap-3 pt-4">
        <Button variant="outline" onClick={() => window.location.href = "/my-bookings"}>
          View My Bookings
        </Button>
        <Button onClick={() => {
          setStep(0);
          setServiceId("");
          setStaffId("");
          setDate("");
          setStartTime("");
          setBookingResult(null);
        }}>
          Book Another
        </Button>
      </div>
    </div>
  );
}
