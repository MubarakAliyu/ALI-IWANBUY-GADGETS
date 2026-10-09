"use client";

import { useEffect, useRef } from "react";
import type { CartReportedIssue } from "@aib/shared";
import Image from "next/image";
import Link from "next/link";
import { useMutation } from "@tanstack/react-query";
import { AlertTriangleIcon, ShoppingBagIcon, Trash2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { QuantityStepper } from "@/components/ui/quantity-stepper";
import { Skeleton } from "@/components/ui/skeleton";
import { validateCart } from "@/lib/catalog";
import { formatNaira, multiplyKobo } from "@/lib/money";
import { cartSubtotalKobo, useCartStore } from "@/stores/cart";

const ISSUE_MESSAGE: Record<CartReportedIssue["issue"], (issue: CartReportedIssue) => string> = {
  REMOVED: (issue) => `${issue.name} is no longer on sale and has been removed.`,
  OUT_OF_STOCK: (issue) => `${issue.name} has sold out and has been removed.`,
  QTY_REDUCED: (issue) => `We only have enough ${issue.name} for a smaller quantity, so it has been reduced.`,
  PRICE_CHANGED: (issue) =>
    `The price of ${issue.name} has changed${
      issue.previousUnitPriceKobo === undefined ? "" : ` from ${formatNaira(issue.previousUnitPriceKobo)}`
    }.`,
};

/**
 * The cart (S-6, AC1.4).
 *
 * The browser's copy of the cart is only a convenience. On load, the whole cart is sent to
 * `POST /cart/validate`, the server re-prices it from the database, and whatever it says replaces what was
 * in localStorage — with every correction shown plainly rather than silently applied.
 */
export function CartView() {
  const lines = useCartStore((state) => state.lines);
  const hydrated = useCartStore((state) => state.hydrated);
  const setQty = useCartStore((state) => state.setQty);
  const remove = useCartStore((state) => state.remove);
  const applyValidation = useCartStore((state) => state.applyValidation);
  const validated = useRef(false);

  const { mutate, data, isPending } = useMutation({
    mutationFn: validateCart,
    onSuccess: (result) => applyValidation(result),
  });

  useEffect(() => {
    if (!hydrated || validated.current) {
      return;
    }
    validated.current = true;
    if (lines.length === 0) {
      return;
    }
    mutate({
      items: lines.map((line) => ({
        productId: line.productId,
        variantId: line.variantId,
        qty: line.qty,
        unitPriceKobo: line.unitPriceKobo,
      })),
    });
  }, [hydrated, lines, mutate]);

  if (!hydrated) {
    return (
      <div className="grid gap-4">
        <span className="sr-only" role="status">
          Loading your cart
        </span>
        <Skeleton className="h-28 w-full" />
        <Skeleton className="h-28 w-full" />
      </div>
    );
  }

  if (lines.length === 0) {
    return (
      <EmptyState
        icon={<ShoppingBagIcon />}
        title="Your cart is empty"
        description="Browse the shop and add something you like. Your cart is kept on this device."
        action={
          <Button asChild>
            <Link href="/shop">Start shopping</Link>
          </Button>
        }
      />
    );
  }

  const subtotal = cartSubtotalKobo(lines);
  const issues = data?.issues ?? [];

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_340px]">
      <div className="grid content-start gap-4">
        {issues.length > 0 ? (
          <div
            role="status"
            className="flex gap-3 rounded-md border border-warning-text/25 bg-warning-tint p-4 text-body-sm text-warning-text"
          >
            <AlertTriangleIcon aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
            <div className="grid gap-1">
              <p className="font-semibold">We updated your cart</p>
              <ul className="grid gap-1">
                {issues.map((issue) => (
                  <li key={`${issue.variantId}-${issue.issue}`}>{ISSUE_MESSAGE[issue.issue](issue)}</li>
                ))}
              </ul>
            </div>
          </div>
        ) : null}

        <ul className="grid gap-4">
          {lines.map((line) => (
            <li
              key={`${line.productId}:${line.variantId}`}
              data-testid="cart-line"
              className="flex gap-4 rounded-md border border-grey-200 bg-white p-4"
            >
              <Link
                href={`/product/${line.slug}`}
                className="relative size-24 shrink-0 overflow-hidden rounded-sm border border-grey-200 bg-grey-50"
              >
                {line.image ? (
                  <Image src={line.image} alt="" fill sizes="96px" className="object-contain p-1" />
                ) : null}
              </Link>

              <div className="grid flex-1 content-start gap-1">
                <Link
                  href={`/product/${line.slug}`}
                  className="text-body-sm font-medium text-brand-navy hover:text-brand-primary"
                >
                  {line.name}
                </Link>
                <p className="text-caption text-text-muted">{line.variantLabel}</p>
                <p className="text-caption numeric text-text-muted">SKU {line.sku}</p>

                <div className="mt-2 flex flex-wrap items-center gap-3">
                  <QuantityStepper
                    size="sm"
                    value={line.qty}
                    max={line.stock}
                    onChange={(qty) => setQty(line.productId, line.variantId, qty)}
                    label={`Quantity of ${line.name}`}
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    className="gap-1.5 px-2 text-text-muted hover:text-danger"
                    onClick={() => remove(line.productId, line.variantId)}
                  >
                    <Trash2Icon aria-hidden="true" className="size-4" />
                    Remove
                  </Button>
                </div>
              </div>

              <div className="grid content-start justify-items-end gap-1 text-right">
                <p className="text-body-sm font-semibold numeric text-brand-navy">
                  {formatNaira(multiplyKobo(line.unitPriceKobo, line.qty))}
                </p>
                <p className="text-caption numeric text-text-muted">{formatNaira(line.unitPriceKobo)} each</p>
              </div>
            </li>
          ))}
        </ul>
      </div>

      <aside aria-label="Order summary" className="lg:sticky lg:top-24 lg:self-start">
        <div className="grid gap-4 rounded-md border border-grey-200 bg-white p-5">
          <h2 className="text-h3 text-brand-navy">Summary</h2>

          <dl className="grid gap-2 text-body-sm">
            <div className="flex items-baseline justify-between">
              <dt className="text-text-muted">Subtotal</dt>
              <dd className="font-semibold numeric text-brand-navy" data-testid="cart-subtotal">
                {formatNaira(subtotal)}
              </dd>
            </div>
            <div className="flex items-baseline justify-between">
              <dt className="text-text-muted">Delivery</dt>
              <dd className="text-text-muted">Calculated at checkout</dd>
            </div>
          </dl>

          <p className="text-caption text-text-muted">
            {isPending ? "Checking prices and stock…" : "Prices and stock are confirmed with the shop."}
          </p>

          <Button asChild size="hero" className="w-full">
            <Link href="/checkout">Proceed to checkout</Link>
          </Button>

          <Button asChild variant="ghost" className="w-full">
            <Link href="/shop">Continue shopping</Link>
          </Button>
        </div>
      </aside>
    </div>
  );
}
