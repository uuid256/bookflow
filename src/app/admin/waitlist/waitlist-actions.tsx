"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { updateWaitlistStatus, deleteWaitlistEntry } from "./actions";
import { Bell, CalendarCheck, X, Trash2 } from "lucide-react";

type Props = {
  entryId: string;
  currentStatus: string;
};

export function WaitlistStatusActions({ entryId, currentStatus }: Props) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleStatusUpdate(status: "NOTIFIED" | "BOOKED" | "CANCELLED") {
    setError(null);
    startTransition(async () => {
      const result = await updateWaitlistStatus(entryId, status);
      if (!result.success) {
        setError(result.error ?? "Failed to update status.");
      }
    });
  }

  return (
    <div className="flex items-center gap-1">
      {currentStatus === "WAITING" && (
        <Button
          variant="outline"
          size="sm"
          disabled={isPending}
          onClick={() => handleStatusUpdate("NOTIFIED")}
          title="Mark as Notified"
        >
          <Bell className="mr-1 h-3.5 w-3.5" />
          Notify
        </Button>
      )}
      {(currentStatus === "WAITING" || currentStatus === "NOTIFIED") && (
        <Button
          variant="outline"
          size="sm"
          disabled={isPending}
          onClick={() => handleStatusUpdate("BOOKED")}
          title="Mark as Booked"
        >
          <CalendarCheck className="mr-1 h-3.5 w-3.5" />
          Booked
        </Button>
      )}
      {currentStatus !== "CANCELLED" && (
        <Button
          variant="outline"
          size="sm"
          disabled={isPending}
          onClick={() => handleStatusUpdate("CANCELLED")}
          title="Cancel"
          className="text-destructive hover:text-destructive"
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      )}
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}

export function DeleteWaitlistButton({ entryId }: { entryId: string }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleDelete() {
    if (!confirm("Are you sure you want to delete this waitlist entry?")) {
      return;
    }

    setError(null);
    startTransition(async () => {
      const result = await deleteWaitlistEntry(entryId);
      if (!result.success) {
        setError(result.error ?? "Failed to delete entry.");
      }
    });
  }

  return (
    <div>
      <Button
        variant="ghost"
        size="icon"
        onClick={handleDelete}
        disabled={isPending}
        className="text-destructive hover:text-destructive"
        title="Delete entry"
      >
        <Trash2 className="h-4 w-4" />
      </Button>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
