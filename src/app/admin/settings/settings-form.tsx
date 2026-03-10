"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { updateBusinessHours, updateSettings, addHoliday, deleteHoliday } from "./actions";

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

type BusinessHoursData = {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  isClosed: boolean;
};

type SettingsData = {
  cancellationWindowHours: number;
  rescheduleWindowHours: number;
  autoConfirmBookings: boolean;
  maxAdvanceBookingDays: number;
  minAdvanceBookingHours: number;
};

type HolidayData = {
  id: string;
  date: string;
  name: string;
};

export function BusinessHoursForm({ hours }: { hours: BusinessHoursData[] }) {
  const [loading, setLoading] = useState<number | null>(null);

  async function handleSave(day: BusinessHoursData) {
    setLoading(day.dayOfWeek);
    try {
      await updateBusinessHours(day);
      toast.success(`${DAYS[day.dayOfWeek]} hours updated`);
    } catch {
      toast.error("Failed to update hours");
    }
    setLoading(null);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Business Hours</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {DAYS.map((dayName, i) => {
            const hour = hours.find((h) => h.dayOfWeek === i) || {
              dayOfWeek: i,
              startTime: "09:00",
              endTime: "17:00",
              isClosed: true,
            };
            return (
              <BusinessHourRow
                key={i}
                dayName={dayName}
                hour={hour}
                loading={loading === i}
                onSave={handleSave}
              />
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

function BusinessHourRow({
  dayName,
  hour,
  loading,
  onSave,
}: {
  dayName: string;
  hour: BusinessHoursData;
  loading: boolean;
  onSave: (h: BusinessHoursData) => void;
}) {
  const [startTime, setStartTime] = useState(hour.startTime);
  const [endTime, setEndTime] = useState(hour.endTime);
  const [isClosed, setIsClosed] = useState(hour.isClosed);

  return (
    <div className="flex flex-wrap items-center gap-3 rounded-lg border p-3">
      <div className="w-24 font-medium">{dayName}</div>
      <div className="flex items-center gap-2">
        <Label className="text-sm">Closed</Label>
        <Switch checked={isClosed} onCheckedChange={setIsClosed} />
      </div>
      {!isClosed && (
        <>
          <Input
            type="time"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
            className="w-32"
          />
          <span>to</span>
          <Input
            type="time"
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
            className="w-32"
          />
        </>
      )}
      <Button
        size="sm"
        variant="outline"
        disabled={loading}
        onClick={() =>
          onSave({ dayOfWeek: hour.dayOfWeek, startTime, endTime, isClosed })
        }
      >
        {loading ? "Saving..." : "Save"}
      </Button>
    </div>
  );
}

export function SettingsForm({ settings }: { settings: SettingsData }) {
  const [form, setForm] = useState(settings);
  const [loading, setLoading] = useState(false);

  async function handleSave() {
    setLoading(true);
    try {
      await updateSettings(form);
      toast.success("Settings updated");
    } catch {
      toast.error("Failed to update settings");
    }
    setLoading(false);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Booking Settings</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Cancellation Window (hours)</Label>
            <Input
              type="number"
              value={form.cancellationWindowHours}
              onChange={(e) =>
                setForm({ ...form, cancellationWindowHours: parseInt(e.target.value) || 0 })
              }
            />
          </div>
          <div className="space-y-2">
            <Label>Reschedule Window (hours)</Label>
            <Input
              type="number"
              value={form.rescheduleWindowHours}
              onChange={(e) =>
                setForm({ ...form, rescheduleWindowHours: parseInt(e.target.value) || 0 })
              }
            />
          </div>
          <div className="space-y-2">
            <Label>Max Advance Booking (days)</Label>
            <Input
              type="number"
              value={form.maxAdvanceBookingDays}
              onChange={(e) =>
                setForm({ ...form, maxAdvanceBookingDays: parseInt(e.target.value) || 1 })
              }
            />
          </div>
          <div className="space-y-2">
            <Label>Min Advance Booking (hours)</Label>
            <Input
              type="number"
              value={form.minAdvanceBookingHours}
              onChange={(e) =>
                setForm({ ...form, minAdvanceBookingHours: parseInt(e.target.value) || 0 })
              }
            />
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Switch
            checked={form.autoConfirmBookings}
            onCheckedChange={(v) => setForm({ ...form, autoConfirmBookings: v })}
          />
          <Label>Auto-confirm bookings</Label>
        </div>
        <Button onClick={handleSave} disabled={loading}>
          {loading ? "Saving..." : "Save Settings"}
        </Button>
      </CardContent>
    </Card>
  );
}

export function HolidaysForm({ holidays }: { holidays: HolidayData[] }) {
  const [date, setDate] = useState("");
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleAdd() {
    if (!date || !name) return;
    setLoading(true);
    try {
      await addHoliday({ date, name });
      setDate("");
      setName("");
      toast.success("Holiday added");
    } catch {
      toast.error("Failed to add holiday");
    }
    setLoading(false);
  }

  async function handleDelete(id: string) {
    try {
      await deleteHoliday(id);
      toast.success("Holiday removed");
    } catch {
      toast.error("Failed to remove holiday");
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Holidays</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap gap-3">
          <Input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="w-40"
          />
          <Input
            placeholder="Holiday name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-48"
          />
          <Button onClick={handleAdd} disabled={loading} size="sm">
            Add Holiday
          </Button>
        </div>
        {holidays.length > 0 && (
          <div className="space-y-2">
            {holidays.map((h) => (
              <div
                key={h.id}
                className="flex items-center justify-between rounded-lg border p-3"
              >
                <div>
                  <span className="font-medium">{h.name}</span>
                  <span className="ml-2 text-sm text-muted-foreground">{h.date}</span>
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-destructive"
                  onClick={() => handleDelete(h.id)}
                >
                  Remove
                </Button>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
