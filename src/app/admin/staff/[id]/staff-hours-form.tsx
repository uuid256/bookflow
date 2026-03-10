"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { updateStaffHours } from "./actions";

interface DayHours {
  dayOfWeek: number;
  dayName: string;
  startTime: string;
  endTime: string;
  isActive: boolean;
  hasRecord: boolean;
}

interface StaffHoursFormProps {
  userId: string;
  hours: DayHours[];
}

export function StaffHoursForm({ userId, hours }: StaffHoursFormProps) {
  return (
    <div className="space-y-3">
      {hours.map((day) => (
        <DayRow key={day.dayOfWeek} userId={userId} day={day} />
      ))}
    </div>
  );
}

function DayRow({ userId, day }: { userId: string; day: DayHours }) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleSubmit(formData: FormData) {
    startTransition(async () => {
      const result = await updateStaffHours(formData);
      if (result?.error) {
        alert(result.error);
      } else {
        router.refresh();
      }
    });
  }

  return (
    <form
      action={handleSubmit}
      className="flex items-center gap-3 rounded-lg border p-3"
    >
      <input type="hidden" name="userId" value={userId} />
      <input type="hidden" name="dayOfWeek" value={day.dayOfWeek} />

      <div className="w-24 shrink-0">
        <Label className="text-sm font-medium">{day.dayName}</Label>
      </div>

      <div className="flex items-center gap-2">
        <Switch
          name="isActiveToggle"
          defaultChecked={day.isActive}
          onCheckedChange={(checked) => {
            const input = document.querySelector(
              `input[name="isActive"][data-day="${day.dayOfWeek}"]`
            ) as HTMLInputElement;
            if (input) input.value = String(checked);
          }}
        />
        <input
          type="hidden"
          name="isActive"
          data-day={day.dayOfWeek}
          defaultValue={String(day.isActive)}
        />
      </div>

      <div className="flex items-center gap-2">
        <Input
          type="time"
          name="startTime"
          defaultValue={day.startTime}
          className="w-32"
        />
        <span className="text-muted-foreground">to</span>
        <Input
          type="time"
          name="endTime"
          defaultValue={day.endTime}
          className="w-32"
        />
      </div>

      <Button type="submit" variant="outline" size="sm" disabled={isPending}>
        {isPending ? "Saving..." : "Save"}
      </Button>
    </form>
  );
}
