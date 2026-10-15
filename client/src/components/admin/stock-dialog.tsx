"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { MinusIcon, PlusIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { adjustStock, getAdminProduct, type AdminProduct } from "@/lib/admin";
import { ApiRequestError } from "@/lib/api";

/**
 * Counting a shelf (A-5).
 *
 * It takes a **change**, not a new total: "three arrived" and "one was broken" are what actually happens, and
 * a delta cannot silently overwrite a sale that landed a second earlier. The server applies it atomically and
 * records the before and after against the person who counted.
 */
export function StockDialog({
  productId,
  productName,
  open,
  onClose,
}: {
  productId: string | null;
  productName: string;
  open: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const [product, setProduct] = useState<AdminProduct | null>(null);
  const [variantId, setVariantId] = useState("");
  const [delta, setDelta] = useState(0);
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function load() {
    if (!productId) {
      return;
    }
    setError(null);
    setDelta(0);
    setReason("");
    try {
      const loaded = await getAdminProduct(productId);
      setProduct(loaded);
      setVariantId(loaded.variants[0]?._id ?? "");
    } catch {
      setError("We could not load that product's variants.");
    }
  }

  const variant = product?.variants.find((row) => row._id === variantId);
  const after = (variant?.stock ?? 0) + delta;

  async function submit() {
    if (!productId) {
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await adjustStock(productId, { variantId, delta, reason: reason.trim() });
      toast.success(`${variant?.sku} is now ${after}`, { description: reason.trim() });
      onClose();
      router.refresh();
    } catch (caught) {
      setError(caught instanceof ApiRequestError ? caught.message : "That did not work.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (next) {
          void load();
        } else {
          onClose();
        }
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Adjust stock — {productName}</DialogTitle>
          <DialogDescription>
            Enter what changed, not the new total. Everything you record here is kept against your name.
          </DialogDescription>
        </DialogHeader>

        {error ? (
          <p role="alert" className="rounded-md bg-danger-tint p-3 text-body-sm text-danger-text">
            {error}
          </p>
        ) : null}

        <div className="grid gap-4">
          <Field label="Variant">
            {(control) => (
              <select
                {...control}
                value={variantId}
                onChange={(event) => setVariantId(event.target.value)}
                className="h-11 rounded-md border border-grey-200 bg-white px-3 text-body-sm text-brand-navy focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:outline-none"
              >
                {(product?.variants ?? []).map((row) => (
                  <option key={row._id} value={row._id}>
                    {row.label} · {row.sku} · {row.stock} in stock
                  </option>
                ))}
              </select>
            )}
          </Field>

          <Field label="Change">
            {(control) => (
              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  aria-label="One fewer"
                  onClick={() => setDelta((value) => value - 1)}
                >
                  <MinusIcon aria-hidden="true" className="size-4" />
                </Button>
                <Input
                  {...control}
                  type="number"
                  value={delta}
                  onChange={(event) => setDelta(Number(event.target.value) || 0)}
                  className="w-24 text-center tabular-nums"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  aria-label="One more"
                  onClick={() => setDelta((value) => value + 1)}
                >
                  <PlusIcon aria-hidden="true" className="size-4" />
                </Button>

                <p aria-live="polite" className="ml-2 text-body-sm text-text-muted">
                  {variant ? (
                    <>
                      {variant.stock} →{" "}
                      <span
                        className={
                          after < 0 ? "font-semibold text-danger-text" : "font-semibold text-brand-navy"
                        }
                      >
                        {after}
                      </span>
                    </>
                  ) : null}
                </p>
              </div>
            )}
          </Field>

          <Field label="Why?" hint="A delivery arrived, something was damaged, a recount.">
            {(control) => (
              <Input
                {...control}
                value={reason}
                maxLength={200}
                placeholder="Delivery from Lagos"
                onChange={(event) => setReason(event.target.value)}
              />
            )}
          </Field>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button
            disabled={delta === 0 || reason.trim().length < 3 || after < 0}
            loading={busy}
            onClick={() => void submit()}
          >
            Record the change
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
