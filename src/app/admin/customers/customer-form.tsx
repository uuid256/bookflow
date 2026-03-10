"use client";

import { useState, useTransition } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { createCustomer, updateCustomer, deleteCustomer } from "./actions";
import type { CustomerFormState } from "./actions";
import { Pencil, Plus, Trash2 } from "lucide-react";

type Customer = {
  id: string;
  name: string;
  email: string;
  phone: string | null;
  notes: string | null;
};

export function CustomerFormDialog({ customer }: { customer?: Customer }) {
  const isEditing = !!customer;
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [state, setState] = useState<CustomerFormState | null>(null);

  async function handleSubmit(formData: FormData) {
    startTransition(async () => {
      const result = isEditing
        ? await updateCustomer(customer.id, formData)
        : await createCustomer(formData);

      setState(result);
      if (result.success) {
        setOpen(false);
        setState(null);
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setState(null); }}>
      <DialogTrigger asChild>
        {isEditing ? (
          <Button variant="ghost" size="icon">
            <Pencil className="h-4 w-4" />
          </Button>
        ) : (
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Add Customer
          </Button>
        )}
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit Customer" : "Add Customer"}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? "Update the customer details below."
              : "Fill in the details to add a new customer."}
          </DialogDescription>
        </DialogHeader>

        <form action={handleSubmit} className="space-y-4">
          {state?.error && (
            <p className="text-sm text-destructive">{state.error}</p>
          )}

          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input
              id="name"
              name="name"
              defaultValue={customer?.name ?? ""}
              required
            />
            {state?.fieldErrors?.name && (
              <p className="text-sm text-destructive">{state.fieldErrors.name[0]}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              defaultValue={customer?.email ?? ""}
              required
            />
            {state?.fieldErrors?.email && (
              <p className="text-sm text-destructive">{state.fieldErrors.email[0]}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="phone">Phone</Label>
            <Input
              id="phone"
              name="phone"
              defaultValue={customer?.phone ?? ""}
            />
            {state?.fieldErrors?.phone && (
              <p className="text-sm text-destructive">{state.fieldErrors.phone[0]}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea
              id="notes"
              name="notes"
              defaultValue={customer?.notes ?? ""}
              rows={3}
            />
            {state?.fieldErrors?.notes && (
              <p className="text-sm text-destructive">{state.fieldErrors.notes[0]}</p>
            )}
          </div>

          <DialogFooter>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Saving..." : isEditing ? "Update" : "Create"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

export function DeleteCustomerButton({ customerId }: { customerId: string }) {
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  function handleDelete() {
    if (!confirm("Are you sure you want to delete this customer? This action cannot be undone.")) {
      return;
    }

    startTransition(async () => {
      const result = await deleteCustomer(customerId);
      if (!result.success) {
        setError(result.error ?? "Failed to delete customer.");
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
      >
        <Trash2 className="h-4 w-4" />
      </Button>
      {error && <p className="text-sm text-destructive">{error}</p>}
    </div>
  );
}
