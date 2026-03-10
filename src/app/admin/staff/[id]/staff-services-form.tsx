"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { toggleStaffService } from "./actions";

interface ServiceItem {
  id: string;
  name: string;
  assigned: boolean;
}

interface StaffServicesFormProps {
  userId: string;
  services: ServiceItem[];
}

export function StaffServicesForm({ userId, services }: StaffServicesFormProps) {
  return (
    <div className="space-y-3">
      {services.map((service) => (
        <ServiceRow
          key={service.id}
          userId={userId}
          service={service}
        />
      ))}
    </div>
  );
}

function ServiceRow({
  userId,
  service,
}: {
  userId: string;
  service: ServiceItem;
}) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleToggle() {
    startTransition(async () => {
      const result = await toggleStaffService(userId, service.id);
      if (result?.error) {
        alert(result.error);
      } else {
        router.refresh();
      }
    });
  }

  return (
    <div className="flex items-center gap-3 rounded-lg border p-3">
      <Checkbox
        id={`service-${service.id}`}
        checked={service.assigned}
        onCheckedChange={handleToggle}
        disabled={isPending}
      />
      <Label
        htmlFor={`service-${service.id}`}
        className="cursor-pointer text-sm font-medium"
      >
        {service.name}
      </Label>
      {isPending && (
        <span className="text-xs text-muted-foreground">Saving...</span>
      )}
    </div>
  );
}
