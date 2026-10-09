"use client";

import { useState } from "react";
import type { ProductDetail } from "@aib/shared";
import { useRouter } from "next/navigation";
import { HeartIcon, ShoppingBagIcon } from "lucide-react";
import { toast } from "sonner";
import { useWishlist } from "@/components/account/use-wishlist";
import { Button } from "@/components/ui/button";
import { PriceTag } from "@/components/ui/price-tag";
import { QuantityStepper } from "@/components/ui/quantity-stepper";
import { StockBadge } from "@/components/ui/status-badge";
import { cn } from "@/lib/cn";
import { useCartStore } from "@/stores/cart";
import { useUiStore } from "@/stores/ui";

/**
 * Choosing a variant and adding it to the cart (S-5).
 *
 * The variant chips drive everything on this panel: the price, the compare-at price, the SKU, the stock
 * state, the quantity ceiling and what "Add to cart" will add. An out-of-stock variant can be selected — so
 * a customer can see it exists and what it costs — but it cannot be added.
 */
export function ProductPurchase({ product }: { product: ProductDetail }) {
  const router = useRouter();
  const add = useCartStore((state) => state.add);
  const setMiniCartOpen = useUiStore((state) => state.setMiniCartOpen);
  const { toggle: toggleWishlist, isSaved } = useWishlist();
  const saved = isSaved(product.id);

  const firstInStock = product.variants.findIndex((variant) => variant.stock > 0);
  const [selectedId, setSelectedId] = useState(
    () => product.variants[firstInStock >= 0 ? firstInStock : 0]?.id ?? "",
  );
  const [qty, setQty] = useState(1);

  const variant = product.variants.find((candidate) => candidate.id === selectedId) ?? product.variants[0];
  if (!variant) {
    return null;
  }

  const soldOut = variant.stock <= 0;

  function selectVariant(id: string) {
    setSelectedId(id);
    setQty(1);
  }

  function addToCart(): boolean {
    if (!variant || soldOut) {
      return false;
    }
    add(
      {
        productId: product.id,
        variantId: variant.id,
        slug: product.slug,
        name: product.name,
        variantLabel: variant.label,
        sku: variant.sku,
        image: product.images[0]?.url ?? null,
        unitPriceKobo: variant.priceKobo,
        stock: variant.stock,
      },
      qty,
    );
    return true;
  }

  return (
    <div className="grid gap-5">
      <div className="grid gap-2" data-testid="product-price">
        <PriceTag priceKobo={variant.priceKobo} compareAtPriceKobo={variant.compareAtPriceKobo} size="lg" />
        <div className="flex flex-wrap items-center gap-2">
          <StockBadge stock={variant.stock} lowStockThreshold={variant.lowStockThreshold} />
          <span className="text-caption numeric text-text-muted">SKU {variant.sku}</span>
        </div>
      </div>

      {product.variants.length > 1 ? (
        <fieldset className="grid gap-2">
          <legend className="text-label text-brand-navy uppercase">Choose an option</legend>
          <div role="radiogroup" aria-label="Product options" className="flex flex-wrap gap-2">
            {product.variants.map((option) => {
              const selected = option.id === variant.id;
              return (
                <button
                  key={option.id}
                  type="button"
                  role="radio"
                  aria-checked={selected}
                  data-testid="variant-option"
                  onClick={() => selectVariant(option.id)}
                  className={cn(
                    "rounded-md border px-3 py-2 text-body-sm font-medium transition-colors duration-150 ease-out",
                    selected
                      ? "border-brand-primary bg-primary-50 text-brand-navy"
                      : "border-grey-200 bg-white text-brand-navy hover:border-grey-300",
                    option.stock <= 0 && "text-text-muted line-through",
                  )}
                >
                  {option.label}
                </button>
              );
            })}
          </div>
        </fieldset>
      ) : null}

      <div className="flex flex-wrap items-center gap-3">
        <QuantityStepper value={qty} onChange={setQty} max={Math.max(variant.stock, 1)} />
        <p className="text-caption text-text-muted">
          {soldOut
            ? "This option is out of stock."
            : `${variant.stock} available${variant.stock <= variant.lowStockThreshold ? " — selling fast" : ""}`}
        </p>
      </div>

      <div className="grid gap-2 sm:grid-cols-2">
        <Button
          size="hero"
          disabled={soldOut}
          data-testid="add-to-cart"
          onClick={() => {
            if (addToCart()) {
              setMiniCartOpen(true);
              toast.success("Added to cart", { description: `${product.name} — ${variant.label}` });
            }
          }}
        >
          <ShoppingBagIcon aria-hidden="true" className="size-4" />
          {soldOut ? "Out of stock" : "Add to cart"}
        </Button>
        <Button
          size="hero"
          variant="dark"
          disabled={soldOut}
          onClick={() => {
            if (addToCart()) {
              router.push("/cart");
            }
          }}
        >
          Buy now
        </Button>
      </div>

      <Button
        variant="ghost"
        aria-pressed={saved}
        data-testid="wishlist-toggle"
        className={cn(
          "justify-start gap-2 px-0 hover:bg-transparent hover:text-brand-primary",
          saved ? "text-brand-primary" : "text-text-muted",
        )}
        onClick={() => toggleWishlist(product.id, product.name)}
      >
        <HeartIcon aria-hidden="true" className="size-4" fill={saved ? "currentColor" : "none"} />
        {saved ? "Saved to your wishlist" : "Save to wishlist"}
      </Button>
    </div>
  );
}
