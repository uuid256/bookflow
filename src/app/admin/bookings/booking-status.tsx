"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { VALID_TRANSITIONS, type BookingStatus, getStatusColor } from "@/lib/booking-utils";
import { toast } from "sonner";
import { updateBookingStatus } from "./actions";
import { ChevronDown } from "lucide-react";

export function BookingStatusBadge({
  bookingId,
  status,
  interactive = true,
}: {
  bookingId: string;
  status: string;
  interactive?: boolean;
}) {
  const transitions = VALID_TRANSITIONS[status as BookingStatus] || [];
  const color = getStatusColor(status) as any;

  async function handleTransition(newStatus: string) {
    try {
      await updateBookingStatus(bookingId, newStatus);
      toast.success(`Status updated to ${newStatus}`);
    } catch (err: any) {
      toast.error(err.message || "Failed to update status");
    }
  }

  if (!interactive || transitions.length === 0) {
    return <Badge variant={color}>{status}</Badge>;
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="sm" className="h-auto gap-1 p-0">
          <Badge variant={color}>{status}</Badge>
          <ChevronDown className="h-3 w-3" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent>
        {transitions.map((t) => (
          <DropdownMenuItem key={t} onClick={() => handleTransition(t)}>
            Move to {t}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
