"use client";

import { useState } from "react";
import { MAX_ADDRESSES, type Address, type AddressInput } from "@aib/shared";
import { MapPinIcon, PlusIcon } from "lucide-react";
import { toast } from "sonner";
import { AddressForm } from "@/components/account/address-form";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { addAddress, deleteAddress, setDefaultAddress, updateAddress } from "@/lib/account";
import { ApiRequestError } from "@/lib/api";

/** The address book (S-12): up to five addresses, one of them the default checkout offers first. */
export function AddressBook({
  addresses,
  onChanged,
}: {
  addresses: Address[];
  onChanged: () => Promise<void>;
}) {
  const [editing, setEditing] = useState<Address | null>(null);
  const [adding, setAdding] = useState(false);
  const [deleting, setDeleting] = useState<Address | null>(null);
  const [busy, setBusy] = useState(false);

  async function run(action: () => Promise<unknown>, message: string) {
    setBusy(true);
    try {
      await action();
      await onChanged();
      toast.success(message);
      setEditing(null);
      setAdding(false);
      setDeleting(null);
    } catch (error) {
      toast.error(error instanceof ApiRequestError ? error.message : "That did not work. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="grid gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-body-sm text-text-muted">
          {addresses.length} of {MAX_ADDRESSES} saved
        </p>
        <Button
          onClick={() => setAdding(true)}
          disabled={addresses.length >= MAX_ADDRESSES}
          className="gap-1.5"
        >
          <PlusIcon aria-hidden="true" className="size-4" />
          Add an address
        </Button>
      </div>

      {addresses.length === 0 ? (
        <EmptyState
          icon={<MapPinIcon />}
          title="No addresses yet"
          description="Add one now, or type it in when you check out."
        />
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {addresses.map((address) => (
            <li
              key={address.id}
              data-testid="address-card"
              className="grid content-start gap-2 rounded-md border border-grey-200 bg-white p-4"
            >
              <div className="flex items-start justify-between gap-2">
                <p className="text-body-sm font-semibold text-brand-navy">
                  {address.label || address.fullName}
                </p>
                {address.isDefault ? <Badge variant="brand">Default</Badge> : null}
              </div>

              <address className="text-body-sm text-text-muted not-italic">
                {address.fullName}
                <br />
                {address.line1}
                {address.line2 ? (
                  <>
                    <br />
                    {address.line2}
                  </>
                ) : null}
                <br />
                {address.city}, {address.state}
                {address.landmark ? (
                  <>
                    <br />
                    Near {address.landmark}
                  </>
                ) : null}
                <br />
                <span className="numeric">{address.phone}</span>
              </address>

              <div className="mt-1 flex flex-wrap gap-1">
                <Button variant="outline" size="sm" onClick={() => setEditing(address)}>
                  Edit
                </Button>
                {address.isDefault ? null : (
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={busy}
                    onClick={() => void run(() => setDefaultAddress(address.id), "Default address updated")}
                  >
                    Make default
                  </Button>
                )}
                <Button
                  variant="ghost"
                  size="sm"
                  className="text-danger-text"
                  onClick={() => setDeleting(address)}
                >
                  Delete
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Dialog open={adding} onOpenChange={(open) => setAdding(open)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add an address</DialogTitle>
            <DialogDescription>We will use this for deliveries.</DialogDescription>
          </DialogHeader>
          <AddressForm
            onSubmit={(values: AddressInput) => run(() => addAddress(values), "Address saved")}
            onCancel={() => setAdding(false)}
          />
        </DialogContent>
      </Dialog>

      <Dialog open={editing !== null} onOpenChange={(open) => !open && setEditing(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit address</DialogTitle>
          </DialogHeader>
          {editing ? (
            <AddressForm
              address={editing}
              onSubmit={(values: AddressInput) =>
                run(() => updateAddress(editing.id, values), "Address updated")
              }
              onCancel={() => setEditing(null)}
            />
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog open={deleting !== null} onOpenChange={(open) => !open && setDeleting(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete this address?</DialogTitle>
            <DialogDescription>
              {deleting ? `${deleting.line1}, ${deleting.city}` : ""} will be removed from your address book.
              Orders already placed keep the address they were sent to.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleting(null)}>
              Keep it
            </Button>
            <Button
              variant="danger"
              loading={busy}
              onClick={() => deleting && void run(() => deleteAddress(deleting.id), "Address deleted")}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
