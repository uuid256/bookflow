"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Trash2 } from "lucide-react";
import { deleteStaff } from "./actions";

interface DeleteStaffButtonProps {
  id: string;
  name: string;
  isSelf: boolean;
}

export function DeleteStaffButton({ id, name, isSelf }: DeleteStaffButtonProps) {
  const [isPending, startTransition] = useTransition();
  const router = useRouter();

  function handleDelete() {
    if (isSelf) return;
    if (!confirm(`Are you sure you want to delete "${name}"? This action cannot be undone.`)) {
      return;
    }

    startTransition(async () => {
      const result = await deleteStaff(id);
      if (result?.error) {
        alert(result.error);
      } else {
        router.refresh();
      }
    });
  }

  return (
    <Button
      variant="ghost"
      size="sm"
      onClick={handleDelete}
      disabled={isPending || isSelf}
      title={isSelf ? "You cannot delete your own account" : "Delete staff member"}
    >
      <Trash2 className="h-4 w-4 text-red-500" />
    </Button>
  );
}
