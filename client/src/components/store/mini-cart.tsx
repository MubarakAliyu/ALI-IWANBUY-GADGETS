"use client";

import Image from "next/image";
import Link from "next/link";
import { ShoppingBagIcon, Trash2Icon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { QuantityStepper } from "@/components/ui/quantity-stepper";
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { formatNaira } from "@/lib/money";
import { cartCount, cartSubtotalKobo, useCartStore } from "@/stores/cart";
import { useUiStore } from "@/stores/ui";

/**
 * The mini-cart drawer (S-6). It opens when something is added, shows what is in the bag, and lets the
 * quantity change without leaving the page. The subtotal here is the browser's figure; the cart page and
 * checkout both re-price against the server before any money is discussed.
 */
export function MiniCart() {
  const open = useUiStore((state) => state.miniCartOpen);
  const setOpen = useUiStore((state) => state.setMiniCartOpen);
  const lines = useCartStore((state) => state.lines);
  const setQty = useCartStore((state) => state.setQty);
  const remove = useCartStore((state) => state.remove);

  const count = cartCount(lines);
  const subtotal = cartSubtotalKobo(lines);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetContent side="right" className="p-0">
        <SheetHeader>
          <SheetTitle>
            Your cart
            {count > 0 ? <span className="ml-2 text-body-sm numeric text-text-muted">({count})</span> : null}
          </SheetTitle>
        </SheetHeader>

        {lines.length === 0 ? (
          <div className="p-5">
            <EmptyState
              icon={<ShoppingBagIcon />}
              title="Your cart is empty"
              description="Browse the shop and add something you like."
              action={
                <Button asChild onClick={() => setOpen(false)}>
                  <Link href="/shop">Start shopping</Link>
                </Button>
              }
            />
          </div>
        ) : (
          <ul className="flex-1 divide-y divide-grey-200 overflow-y-auto">
            {lines.map((line) => (
              <li key={`${line.productId}:${line.variantId}`} className="flex gap-3 p-5">
                <Link
                  href={`/product/${line.slug}`}
                  onClick={() => setOpen(false)}
                  className="relative size-20 shrink-0 overflow-hidden rounded-sm border border-grey-200 bg-grey-50"
                >
                  {line.image ? (
                    <Image src={line.image} alt="" fill sizes="80px" className="object-contain" />
                  ) : null}
                </Link>

                <div className="min-w-0 flex-1">
                  <Link
                    href={`/product/${line.slug}`}
                    onClick={() => setOpen(false)}
                    className="line-clamp-2 text-body-sm font-medium text-brand-navy hover:text-brand-primary"
                  >
                    {line.name}
                  </Link>
                  <p className="mt-0.5 text-caption text-text-muted">{line.variantLabel}</p>
                  <p className="mt-1 text-body-sm font-semibold numeric text-brand-navy">
                    {formatNaira(line.unitPriceKobo)}
                  </p>

                  <div className="mt-2 flex items-center gap-2">
                    <QuantityStepper
                      size="sm"
                      value={line.qty}
                      max={line.stock}
                      onChange={(qty) => setQty(line.productId, line.variantId, qty)}
                      label={`Quantity of ${line.name}`}
                    />
                    <Button
                      variant="ghost"
                      size="icon-sm"
                      aria-label={`Remove ${line.name} from cart`}
                      onClick={() => remove(line.productId, line.variantId)}
                      className="text-text-muted hover:text-danger"
                    >
                      <Trash2Icon aria-hidden="true" className="size-4" />
                    </Button>
                  </div>
                </div>
              </li>
            ))}
          </ul>
        )}

        {lines.length > 0 ? (
          <SheetFooter>
            <div className="flex items-baseline justify-between">
              <span className="text-body-sm text-text-muted">Subtotal</span>
              <span className="text-h3 numeric text-brand-navy">{formatNaira(subtotal)}</span>
            </div>
            <p className="text-caption text-text-muted">Delivery is added at checkout.</p>
            <Button asChild size="hero" onClick={() => setOpen(false)}>
              <Link href="/cart">View cart and check out</Link>
            </Button>
          </SheetFooter>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}
