"use client";

import { useState, useTransition } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
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
import { createService, updateService, deleteService } from "./actions";
import type { ServiceFormData } from "./actions";
import { Pencil, Plus, Trash2 } from "lucide-react";

const formSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  description: z.string().max(500).optional(),
  durationMinutes: z.number().int().min(5, "Min 5 minutes").max(480),
  price: z.number().min(0, "Price must be non-negative"),
  depositAmount: z.number().min(0).default(0),
  bufferBefore: z.number().int().min(0).max(120).default(0),
  bufferAfter: z.number().int().min(0).max(120).default(0),
  isActive: z.boolean().default(true),
});

interface ServiceData {
  id: string;
  name: string;
  description: string | null;
  durationMinutes: number;
  price: number;
  depositAmount: number;
  depositPercent: number | null;
  bufferBefore: number;
  bufferAfter: number;
  isActive: boolean;
}

interface ServiceFormProps {
  service?: ServiceData;
}

export function ServiceForm({ service }: ServiceFormProps) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [errors, setErrors] = useState<Record<string, string>>({});

  const isEdit = !!service;

  const [name, setName] = useState(service?.name ?? "");
  const [description, setDescription] = useState(service?.description ?? "");
  const [durationMinutes, setDurationMinutes] = useState(
    service?.durationMinutes?.toString() ?? "30"
  );
  const [priceDollars, setPriceDollars] = useState(
    service ? (service.price / 100).toFixed(2) : ""
  );
  const [depositDollars, setDepositDollars] = useState(
    service ? (service.depositAmount / 100).toFixed(2) : "0.00"
  );
  const [bufferBefore, setBufferBefore] = useState(
    service?.bufferBefore?.toString() ?? "0"
  );
  const [bufferAfter, setBufferAfter] = useState(
    service?.bufferAfter?.toString() ?? "0"
  );
  const [isActive, setIsActive] = useState(service?.isActive ?? true);

  function resetForm() {
    if (!isEdit) {
      setName("");
      setDescription("");
      setDurationMinutes("30");
      setPriceDollars("");
      setDepositDollars("0.00");
      setBufferBefore("0");
      setBufferAfter("0");
      setIsActive(true);
    }
    setErrors({});
  }

  function handleSubmit() {
    const priceInCents = Math.round(parseFloat(priceDollars || "0") * 100);
    const depositInCents = Math.round(
      parseFloat(depositDollars || "0") * 100
    );

    const data: ServiceFormData = {
      name: name.trim(),
      description: description.trim() || "",
      durationMinutes: parseInt(durationMinutes) || 0,
      price: priceInCents,
      depositAmount: depositInCents,
      bufferBefore: parseInt(bufferBefore) || 0,
      bufferAfter: parseInt(bufferAfter) || 0,
      isActive,
    };

    const result = formSchema.safeParse({
      ...data,
      price: parseFloat(priceDollars || "0"),
      depositAmount: parseFloat(depositDollars || "0"),
    });

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
        ? await updateService(service.id, data)
        : await createService(data);

      if (res.error) {
        toast.error(res.error);
        return;
      }

      toast.success(isEdit ? "Service updated" : "Service created");
      setOpen(false);
      if (!isEdit) resetForm();
    });
  }

  function handleDelete() {
    if (!service) return;

    startTransition(async () => {
      const res = await deleteService(service.id);
      if (res.error) {
        toast.error(res.error);
        return;
      }
      toast.success("Service deleted");
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
            Add Service
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Service" : "New Service"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update the service details below."
              : "Fill in the details to create a new service."}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="name">Name *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Haircut"
            />
            {errors.name && (
              <p className="text-sm text-red-500">{errors.name}</p>
            )}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional description"
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="duration">Duration (minutes) *</Label>
              <Input
                id="duration"
                type="number"
                min={5}
                max={480}
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(e.target.value)}
              />
              {errors.durationMinutes && (
                <p className="text-sm text-red-500">{errors.durationMinutes}</p>
              )}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="price">Price ($) *</Label>
              <Input
                id="price"
                type="number"
                min={0}
                step={0.01}
                value={priceDollars}
                onChange={(e) => setPriceDollars(e.target.value)}
                placeholder="0.00"
              />
              {errors.price && (
                <p className="text-sm text-red-500">{errors.price}</p>
              )}
            </div>
          </div>

          <div className="grid gap-2">
            <Label htmlFor="deposit">Deposit Amount ($)</Label>
            <Input
              id="deposit"
              type="number"
              min={0}
              step={0.01}
              value={depositDollars}
              onChange={(e) => setDepositDollars(e.target.value)}
              placeholder="0.00"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="bufferBefore">Buffer Before (min)</Label>
              <Input
                id="bufferBefore"
                type="number"
                min={0}
                max={120}
                value={bufferBefore}
                onChange={(e) => setBufferBefore(e.target.value)}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="bufferAfter">Buffer After (min)</Label>
              <Input
                id="bufferAfter"
                type="number"
                min={0}
                max={120}
                value={bufferAfter}
                onChange={(e) => setBufferAfter(e.target.value)}
              />
            </div>
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
              ? "Update Service"
              : "Create Service"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
