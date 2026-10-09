"use client";

import { useMemo, useState } from "react";
import {
  type Address,
  type AddressInput,
  type CheckoutSettings,
  type DeliveryMethod,
  type PaymentMethod,
} from "@aib/shared";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangleIcon, BanknoteIcon, HandCoinsIcon, StoreIcon, TruckIcon } from "lucide-react";
import { AddressForm } from "@/components/account/address-form";
import { useSession } from "@/components/account/session-provider";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { getCheckoutSettings, placeOrder } from "@/lib/account";
import { ApiRequestError } from "@/lib/api";
import { validateCart } from "@/lib/catalog";
import { cn } from "@/lib/cn";
import { formatNaira } from "@/lib/money";
import { SITE } from "@/lib/site";
import { cartSubtotalKobo, useCartStore } from "@/stores/cart";

/**
 * Checkout (S-9) — one page, three decisions: where it goes, how it is paid for, and a last look at what is
 * being bought.
 *
 * Nothing here decides what anything costs. The totals shown are the server's answer to `/cart/validate`, and
 * the order request carries only product, variant and quantity; the server prices it again when it writes the
 * order (AC2.3). If the shelf moved under the customer, the 409 that comes back is turned into plain English
 * and the cart is corrected in place.
 */
export function CheckoutView() {
  const router = useRouter();
  const { customer, isLoading: sessionLoading } = useSession();
  const lines = useCartStore((state) => state.lines);
  const hydrated = useCartStore((state) => state.hydrated);
  const applyValidation = useCartStore((state) => state.applyValidation);

  const [deliveryMethod, setDeliveryMethod] = useState<DeliveryMethod>("PICKUP");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("BANK_TRANSFER");
  // Only an explicit choice is stored; the default address is derived below, so there is no effect syncing
  // state to a prop that arrives a tick later.
  const [chosenAddressId, setChosenAddressId] = useState<string | null>(null);
  const [newAddress, setNewAddress] = useState<AddressInput | null>(null);
  const [addingAddress, setAddingAddress] = useState(false);
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);

  const { data: settings } = useQuery({ queryKey: ["checkout-settings"], queryFn: getCheckoutSettings });

  const defaultAddressId =
    customer?.addresses.find((address) => address.isDefault)?.id ?? customer?.addresses[0]?.id ?? null;
  const addressId = chosenAddressId ?? defaultAddressId;

  const subtotalKobo = cartSubtotalKobo(lines);
  const deliveryFeeKobo = useMemo(
    () => feeFor(settings, deliveryMethod, subtotalKobo),
    [deliveryMethod, settings, subtotalKobo],
  );
  const totalKobo = subtotalKobo + deliveryFeeKobo;

  if (!hydrated || sessionLoading) {
    return <Skeleton className="h-96 w-full" />;
  }

  if (lines.length === 0) {
    return (
      <div className="grid justify-items-start gap-4 rounded-md border border-grey-200 bg-white p-8">
        <h2 className="text-h2 text-brand-navy">Your cart is empty</h2>
        <p className="text-body-sm text-text-muted">Add something to it and checkout will be waiting.</p>
        <Button asChild>
          <Link href="/shop">Browse the shop</Link>
        </Button>
      </div>
    );
  }

  const needsAddress = deliveryMethod !== "PICKUP";
  const addressChosen = !needsAddress || Boolean(newAddress ?? addressId);

  async function submit() {
    setProblem(null);
    setSubmitting(true);
    try {
      const order = await placeOrder({
        items: lines.map((line) => ({
          productId: line.productId,
          variantId: line.variantId,
          qty: line.qty,
        })),
        deliveryMethod,
        paymentMethod,
        ...(needsAddress && newAddress ? { newAddress, saveAddress: true } : {}),
        ...(needsAddress && !newAddress && addressId ? { addressId } : {}),
        ...(note.trim() ? { note: note.trim() } : {}),
      });

      useCartStore.getState().clear();
      router.replace(`/checkout/success/${order.orderNumber}`);
    } catch (error) {
      if (
        error instanceof ApiRequestError &&
        (error.code === "OUT_OF_STOCK" || error.code === "ITEM_UNAVAILABLE")
      ) {
        // The shelf moved while they were deciding: re-price the cart so the page shows what is really left.
        const revalidated = await validateCart({
          items: lines.map((line) => ({
            productId: line.productId,
            variantId: line.variantId,
            qty: line.qty,
            unitPriceKobo: line.unitPriceKobo,
          })),
        });
        applyValidation(revalidated);
      }
      setProblem(
        error instanceof ApiRequestError ? error.message : "We could not place your order. Please try again.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_340px]">
      <div className="grid content-start gap-8">
        {problem ? (
          <p
            role="alert"
            data-testid="checkout-error"
            className="flex items-start gap-2 rounded-md border border-warning-text/25 bg-warning-tint p-4 text-body-sm text-warning-text"
          >
            <AlertTriangleIcon aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
            {problem}
          </p>
        ) : null}

        <section className="grid gap-4" aria-labelledby="delivery-heading">
          <h2 id="delivery-heading" className="text-h3 text-brand-navy">
            1 · Delivery
          </h2>

          <div className="grid gap-2" role="radiogroup" aria-labelledby="delivery-heading">
            <MethodCard
              checked={deliveryMethod === "PICKUP"}
              onSelect={() => setDeliveryMethod("PICKUP")}
              icon={<StoreIcon aria-hidden="true" className="size-5" />}
              title="Pickup at the shop"
              description={settings?.pickupAddress ?? SITE.shopAddress}
              price="Free"
              testId="delivery-PICKUP"
            />
            <MethodCard
              checked={deliveryMethod === "LOCAL_DELIVERY"}
              onSelect={() => setDeliveryMethod("LOCAL_DELIVERY")}
              icon={<TruckIcon aria-hidden="true" className="size-5" />}
              title={`Delivery in ${SITE.city}`}
              description="Usually the same day for orders confirmed before 15:00."
              price={formatNaira(feeFor(settings, "LOCAL_DELIVERY", subtotalKobo))}
              testId="delivery-LOCAL_DELIVERY"
            />
            <MethodCard
              checked={deliveryMethod === "NATIONWIDE"}
              onSelect={() => setDeliveryMethod("NATIONWIDE")}
              icon={<TruckIcon aria-hidden="true" className="size-5" />}
              title="Nationwide delivery"
              description="By courier, two to five working days."
              price={formatNaira(feeFor(settings, "NATIONWIDE", subtotalKobo))}
              testId="delivery-NATIONWIDE"
            />
          </div>

          {needsAddress ? (
            <div className="grid gap-3">
              {customer && customer.addresses.length > 0 && !addingAddress ? (
                <>
                  <ul className="grid gap-2 sm:grid-cols-2">
                    {customer.addresses.map((address) => (
                      <li key={address.id}>
                        <AddressChoice
                          address={address}
                          checked={!newAddress && addressId === address.id}
                          onSelect={() => {
                            setNewAddress(null);
                            setChosenAddressId(address.id);
                          }}
                        />
                      </li>
                    ))}
                  </ul>
                  <div>
                    <Button variant="outline" size="sm" onClick={() => setAddingAddress(true)}>
                      Deliver somewhere else
                    </Button>
                  </div>
                </>
              ) : (
                <div className="rounded-md border border-grey-200 bg-white p-4">
                  <h3 className="mb-3 text-h4 text-brand-navy">Where should we deliver?</h3>
                  <AddressForm
                    submitLabel="Use this address"
                    showDefaultToggle={false}
                    onSubmit={async (values) => {
                      setNewAddress(values);
                      setAddingAddress(false);
                    }}
                    {...(customer && customer.addresses.length > 0
                      ? { onCancel: () => setAddingAddress(false) }
                      : {})}
                  />
                </div>
              )}

              {newAddress ? (
                <p className="rounded-md bg-primary-50 p-3 text-body-sm text-brand-navy">
                  Delivering to {newAddress.line1}, {newAddress.city}, {newAddress.state}.{" "}
                  <button
                    type="button"
                    className="font-semibold text-brand-primary underline underline-offset-4"
                    onClick={() => {
                      setNewAddress(null);
                      setAddingAddress(true);
                    }}
                  >
                    Change
                  </button>
                </p>
              ) : null}
            </div>
          ) : (
            <p className="rounded-md bg-grey-50 p-4 text-body-sm text-text-muted">
              Collect from {settings?.pickupAddress ?? SITE.shopAddress}. Monday to Saturday, 9:00 to 18:00.
              Bring your order number.
            </p>
          )}
        </section>

        <section className="grid gap-4" aria-labelledby="payment-heading">
          <h2 id="payment-heading" className="text-h3 text-brand-navy">
            2 · Payment
          </h2>

          <div className="grid gap-2" role="radiogroup" aria-labelledby="payment-heading">
            <MethodCard
              checked={paymentMethod === "BANK_TRANSFER"}
              onSelect={() => setPaymentMethod("BANK_TRANSFER")}
              icon={<BanknoteIcon aria-hidden="true" className="size-5" />}
              title="Bank transfer"
              description="We show you the account on the next page and confirm your payment by hand."
              testId="payment-BANK_TRANSFER"
            />
            <MethodCard
              checked={paymentMethod === "PAY_ON_DELIVERY"}
              onSelect={() => setPaymentMethod("PAY_ON_DELIVERY")}
              icon={<HandCoinsIcon aria-hidden="true" className="size-5" />}
              title="Pay on delivery or at pickup"
              description="Pay when the order reaches you, or when you collect it."
              testId="payment-PAY_ON_DELIVERY"
            />
          </div>
        </section>

        <section className="grid gap-4" aria-labelledby="review-heading">
          <h2 id="review-heading" className="text-h3 text-brand-navy">
            3 · Review
          </h2>

          <ul className="grid gap-3">
            {lines.map((line) => (
              <li
                key={`${line.productId}:${line.variantId}`}
                className="flex gap-3 rounded-md border border-grey-200 bg-white p-3"
              >
                <span className="relative size-16 shrink-0 overflow-hidden rounded-sm bg-grey-50">
                  {line.image ? (
                    <Image src={line.image} alt="" fill sizes="64px" className="object-contain p-1" />
                  ) : null}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-body-sm font-medium text-brand-navy">{line.name}</span>
                  <span className="block text-caption text-text-muted">
                    {line.variantLabel} · ×{line.qty}
                  </span>
                </span>
                <span className="text-body-sm font-semibold numeric text-brand-navy">
                  {formatNaira(line.unitPriceKobo * line.qty)}
                </span>
              </li>
            ))}
          </ul>

          <Field label="Note for the shop (optional)" hint="Anything we should know about this order.">
            {(control) => (
              <Input
                {...control}
                value={note}
                onChange={(event) => setNote(event.target.value)}
                maxLength={500}
                placeholder="Call before delivery"
              />
            )}
          </Field>
        </section>
      </div>

      <aside aria-label="Order summary" className="lg:sticky lg:top-24 lg:self-start">
        <div className="grid gap-4 rounded-md border border-grey-200 bg-white p-5">
          <h2 className="text-h3 text-brand-navy">Summary</h2>

          <dl className="grid gap-2 text-body-sm">
            <div className="flex justify-between">
              <dt className="text-text-muted">Subtotal</dt>
              <dd className="numeric">{formatNaira(subtotalKobo)}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-text-muted">Delivery</dt>
              <dd className="numeric">{deliveryFeeKobo === 0 ? "Free" : formatNaira(deliveryFeeKobo)}</dd>
            </div>
            <div className="flex justify-between border-t border-grey-200 pt-2 text-h4">
              <dt>Total</dt>
              <dd className="numeric" data-testid="checkout-total">
                {formatNaira(totalKobo)}
              </dd>
            </div>
          </dl>

          <Button
            size="hero"
            className="hidden w-full lg:inline-flex"
            disabled={!addressChosen}
            loading={submitting}
            loadingLabel="Placing your order…"
            data-testid="place-order"
            onClick={() => void submit()}
          >
            Place order
          </Button>

          <p className="hidden text-caption text-text-muted lg:block">
            Prices and stock are confirmed with the shop before your order is accepted.
          </p>
        </div>
      </aside>

      {/* On a phone the total and the button follow the customer down the page. */}
      <div className="sticky bottom-0 -mx-4 border-t border-grey-200 bg-white p-4 shadow-lg lg:hidden">
        <div className="mb-2 flex items-baseline justify-between">
          <span className="text-body-sm text-text-muted">Total</span>
          <span className="text-h3 numeric text-brand-navy">{formatNaira(totalKobo)}</span>
        </div>
        <Button
          size="hero"
          className="w-full"
          disabled={!addressChosen}
          loading={submitting}
          loadingLabel="Placing your order…"
          data-testid="place-order-mobile"
          onClick={() => void submit()}
        >
          Place order
        </Button>
      </div>
    </div>
  );
}

function feeFor(
  settings: CheckoutSettings | undefined,
  method: DeliveryMethod,
  subtotalKobo: number,
): number {
  if (!settings || method === "PICKUP") {
    return 0;
  }
  const threshold = settings.freeDeliveryThresholdKobo;
  if (threshold !== null && threshold > 0 && subtotalKobo >= threshold) {
    return 0;
  }
  return method === "LOCAL_DELIVERY" ? settings.deliveryFees.localKobo : settings.deliveryFees.nationwideKobo;
}

function MethodCard({
  checked,
  onSelect,
  icon,
  title,
  description,
  price,
  testId,
}: {
  checked: boolean;
  onSelect: () => void;
  icon: React.ReactNode;
  title: string;
  description: string;
  price?: string;
  testId: string;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={checked}
      data-testid={testId}
      onClick={onSelect}
      className={cn(
        "flex w-full items-start gap-3 rounded-md border p-4 text-left transition-colors duration-150 ease-out",
        checked ? "border-brand-primary bg-primary-50" : "border-grey-200 bg-white hover:border-grey-300",
      )}
    >
      <span className={cn("mt-0.5 shrink-0", checked ? "text-brand-primary" : "text-grey-500")}>{icon}</span>
      <span className="min-w-0 flex-1">
        <span className="block text-body-sm font-semibold text-brand-navy">{title}</span>
        <span className="block text-caption text-text-muted">{description}</span>
      </span>
      {price ? (
        <span className="shrink-0 text-body-sm font-semibold numeric text-brand-navy">{price}</span>
      ) : null}
    </button>
  );
}

function AddressChoice({
  address,
  checked,
  onSelect,
}: {
  address: Address;
  checked: boolean;
  onSelect: () => void;
}) {
  return (
    <button
      type="button"
      role="radio"
      aria-checked={checked}
      data-testid="address-choice"
      onClick={onSelect}
      className={cn(
        "grid w-full gap-1 rounded-md border p-3 text-left transition-colors duration-150 ease-out",
        checked ? "border-brand-primary bg-primary-50" : "border-grey-200 bg-white hover:border-grey-300",
      )}
    >
      <span className="text-body-sm font-semibold text-brand-navy">{address.label || address.fullName}</span>
      <span className="text-caption text-text-muted">
        {address.line1}, {address.city}, {address.state}
      </span>
      <span className="text-caption numeric text-text-muted">{address.phone}</span>
    </button>
  );
}
