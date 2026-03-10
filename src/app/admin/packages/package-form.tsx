"use client";

import { useState, useTransition } from "react";
import { z } from "zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  createPackage,
  updatePackage,
  deletePackage,
  assignPackageToCustomer,
} from "./actions";
import type { PackageFormData } from "./actions";
import { Pencil, Plus, Trash2, UserPlus } from "lucide-react";

const formSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  description: z.string().max(500).optional(),
  totalSessions: z.number().int().min(1, "Must have at least 1 session"),
  price: z.number().min(0, "Price must be non-negative"),
  validDays: z.number().int().min(1, "Must be at least 1 day").max(3650),
  serviceIds: z.array(z.string()),
  isActive: z.boolean(),
});

interface ServiceOption {
  id: string;
  name: string;
}

interface PackageData {
  id: string;
  name: string;
  description: string | null;
  totalSessions: number;
  price: number;
  validDays: number;
  isActive: boolean;
  serviceIds: string[];
}

interface PackageFormProps {
  pkg?: PackageData;
  services: ServiceOption[];
}

export function PackageForm({ pkg, services }: PackageFormProps) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [errors, setErrors] = useState<Record<string, string>>({});

  const isEdit = !!pkg;

  const [name, setName] = useState(pkg?.name ?? "");
  const [description, setDescription] = useState(pkg?.description ?? "");
  const [totalSessions, setTotalSessions] = useState(
    pkg?.totalSessions?.toString() ?? "10"
  );
  const [priceDollars, setPriceDollars] = useState(
    pkg ? (pkg.price / 100).toFixed(2) : ""
  );
  const [validDays, setValidDays] = useState(
    pkg?.validDays?.toString() ?? "365"
  );
  const [selectedServiceIds, setSelectedServiceIds] = useState<string[]>(
    pkg?.serviceIds ?? []
  );
  const [isActive, setIsActive] = useState(pkg?.isActive ?? true);

  function resetForm() {
    if (!isEdit) {
      setName("");
      setDescription("");
      setTotalSessions("10");
      setPriceDollars("");
      setValidDays("365");
      setSelectedServiceIds([]);
      setIsActive(true);
    }
    setErrors({});
  }

  function toggleService(serviceId: string) {
    setSelectedServiceIds((prev) =>
      prev.includes(serviceId)
        ? prev.filter((id) => id !== serviceId)
        : [...prev, serviceId]
    );
  }

  function handleSubmit() {
    const priceInCents = Math.round(parseFloat(priceDollars || "0") * 100);

    const data: PackageFormData = {
      name: name.trim(),
      description: description.trim() || "",
      totalSessions: parseInt(totalSessions) || 0,
      price: priceInCents,
      validDays: parseInt(validDays) || 0,
      serviceIds: selectedServiceIds,
      isActive,
    };

    const result = formSchema.safeParse({
      ...data,
      price: parseFloat(priceDollars || "0"),
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
        ? await updatePackage(pkg.id, data)
        : await createPackage(data);

      if (res.error) {
        toast.error(res.error);
        return;
      }

      toast.success(isEdit ? "Package updated" : "Package created");
      setOpen(false);
      if (!isEdit) resetForm();
    });
  }

  function handleDelete() {
    if (!pkg) return;

    startTransition(async () => {
      const res = await deletePackage(pkg.id);
      if (res.error) {
        toast.error(res.error);
        return;
      }
      toast.success("Package deleted");
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
            Add Package
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Package" : "New Package"}</DialogTitle>
          <DialogDescription>
            {isEdit
              ? "Update the package details below."
              : "Fill in the details to create a new package."}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label htmlFor="pkg-name">Name *</Label>
            <Input
              id="pkg-name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. 10-Session Pack"
            />
            {errors.name && (
              <p className="text-sm text-red-500">{errors.name}</p>
            )}
          </div>

          <div className="grid gap-2">
            <Label htmlFor="pkg-description">Description</Label>
            <Textarea
              id="pkg-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Optional description"
              rows={3}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="pkg-sessions">Total Sessions *</Label>
              <Input
                id="pkg-sessions"
                type="number"
                min={1}
                value={totalSessions}
                onChange={(e) => setTotalSessions(e.target.value)}
              />
              {errors.totalSessions && (
                <p className="text-sm text-red-500">{errors.totalSessions}</p>
              )}
            </div>

            <div className="grid gap-2">
              <Label htmlFor="pkg-price">Price ($) *</Label>
              <Input
                id="pkg-price"
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
            <Label htmlFor="pkg-validDays">Valid Days *</Label>
            <Input
              id="pkg-validDays"
              type="number"
              min={1}
              max={3650}
              value={validDays}
              onChange={(e) => setValidDays(e.target.value)}
            />
            {errors.validDays && (
              <p className="text-sm text-red-500">{errors.validDays}</p>
            )}
          </div>

          {services.length > 0 && (
            <div className="grid gap-2">
              <Label>Included Services</Label>
              <div className="max-h-40 space-y-2 overflow-y-auto rounded-md border p-3">
                {services.map((service) => (
                  <div
                    key={service.id}
                    className="flex items-center space-x-2"
                  >
                    <Checkbox
                      id={`svc-${service.id}`}
                      checked={selectedServiceIds.includes(service.id)}
                      onCheckedChange={() => toggleService(service.id)}
                    />
                    <Label
                      htmlFor={`svc-${service.id}`}
                      className="cursor-pointer text-sm font-normal"
                    >
                      {service.name}
                    </Label>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="flex items-center justify-between rounded-lg border p-3">
            <Label htmlFor="pkg-isActive" className="cursor-pointer">
              Active
            </Label>
            <Switch
              id="pkg-isActive"
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
              ? "Update Package"
              : "Create Package"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

interface CustomerOption {
  id: string;
  name: string;
}

interface ActivePackage {
  id: string;
  name: string;
}

interface AssignPackageFormProps {
  customers: CustomerOption[];
  packages: ActivePackage[];
}

export function AssignPackageForm({
  customers,
  packages,
}: AssignPackageFormProps) {
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [customerId, setCustomerId] = useState("");
  const [packageId, setPackageId] = useState("");

  function handleSubmit() {
    if (!customerId || !packageId) {
      toast.error("Please select both a customer and a package.");
      return;
    }

    startTransition(async () => {
      const res = await assignPackageToCustomer({ packageId, customerId });
      if (res.error) {
        toast.error(res.error);
        return;
      }
      toast.success("Package assigned to customer");
      setOpen(false);
      setCustomerId("");
      setPackageId("");
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline">
          <UserPlus className="mr-2 h-4 w-4" />
          Assign Package
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Assign Package to Customer</DialogTitle>
          <DialogDescription>
            Select a customer and a package to assign.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="grid gap-2">
            <Label>Customer *</Label>
            <Select value={customerId} onValueChange={setCustomerId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a customer" />
              </SelectTrigger>
              <SelectContent>
                {customers.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid gap-2">
            <Label>Package *</Label>
            <Select value={packageId} onValueChange={setPackageId}>
              <SelectTrigger>
                <SelectValue placeholder="Select a package" />
              </SelectTrigger>
              <SelectContent>
                {packages.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <DialogFooter>
          <Button onClick={handleSubmit} disabled={isPending}>
            {isPending ? "Assigning..." : "Assign Package"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
