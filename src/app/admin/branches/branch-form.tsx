"use client";

import { useState, useTransition } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import { createBranch, updateBranch, deleteBranch } from "./actions";
import type { BranchFormData } from "./actions";
import { Pencil, Plus, Trash2 } from "lucide-react";

const formSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  address: z.string().max(255).optional(),
  phone: z.string().max(30).optional(),
  isActive: z.boolean().default(true),
});

interface BranchData {
  id: string;
  name: string;
  address: string | null;
  phone: string | null;
  isActive: boolean;
}

interface BranchFormProps {
  branch?: BranchData;
}

export function BranchForm({ branch }: BranchFormProps) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [errors, setErrors] = useState<Record<string, string>>({});

  const isEdit = !!branch;

  const [name, setName] = useState(branch?.name ?? "");
  const [address, setAddress] = useState(branch?.address ?? "");
  const [phone, setPhone] = useState(branch?.phone ?? "");
  const [isActive, setIsActive] = useState(branch?.isActive ?? true);

  function resetForm() {
    if (!isEdit) {
      setName("");
      setAddress("");
      setPhone("");
      setIsActive(true);
    }
    setErrors({});
  }

  function handleSubmit() {
    const data: BranchFormData = {
      name: name.trim(),
      address: address.trim() || "",
      phone: phone.trim() || "",
      isActive,
    };

    const result = formSchema.safeParse(data);

    if (!result.success) {
      const fieldErrors: Record<string, string> = {};
      for (const err of result.error.errors) {
        fieldErrors[err.path[0] as string] = err.message;
      }
      setErrors(fieldErrors);
      return;
    }

    setErrors({});

    startTransition(async () => {
      const res = isEdit
        ? await updateBranch(branch.id, data)
        : await createBranch(data);

      if (res.error) {
        toast.error(res.error);
        return;
      }

      toast.success(isEdit ? "Branch updated" : "Branch created");
      setOpen(false);
      if (!isEdit) resetForm();
    });
  }

  function handleDelete() {
    if (!branch) return;

    startTransition(async () => {
      const res = await deleteBranch(branch.id);
      if (res.error) {
        toast.error(res.error);
        return;
      }
      toast.success("Branch deleted");
      setOpen(false);
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        setOpen(v);
        if (!v) setErrors({});
      }}
    >
      <DialogTrigger asChild>
        {isEdit ? (
          <Button variant="ghost" size="icon">
            <Pencil className="h-4 w-4" />
          </Button>
        ) : (
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Add Branch
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[450px]">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Branch" : "New Branch"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update the branch details below."
              : "Fill in the details to create a new branch."}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="name">Name *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Main Office"
            />
            {errors.name && (
              <p className="text-sm text-red-500">{errors.name}</p>
            )}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="address">Address</Label>
            <Input
              id="address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="e.g. 123 Main St, City"
            />
            {errors.address && (
              <p className="text-sm text-red-500">{errors.address}</p>
            )}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="phone">Phone</Label>
            <Input
              id="phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="e.g. (555) 123-4567"
            />
            {errors.phone && (
              <p className="text-sm text-red-500">{errors.phone}</p>
            )}
          </div>

          <div className="flex items-center justify-between rounded-lg border p-3">
            <Label htmlFor="isActive" className="cursor-pointer">
              Active
            </Label>
            <Switch
              id="isActive"
              checked={isActive}
              onCheckedChange={setIsActive}
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          {isEdit && (
            <Button
              type="button"
              variant="destructive"
              onClick={handleDelete}
              disabled={isPending}
              className="mr-auto"
            >
              <Trash2 className="mr-2 h-4 w-4" />
              Delete
            </Button>
          )}
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={isPending}
          >
            {isPending
              ? "Saving..."
              : isEdit
              ? "Update Branch"
              : "Create Branch"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
