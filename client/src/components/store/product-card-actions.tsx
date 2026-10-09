"use client";

import type { ProductCard as ProductCardData } from "@aib/shared";
import { useRouter } from "next/navigation";
import { HeartIcon, PlusIcon, SlidersHorizontalIcon } from "lucide-react";
import { toast } from "sonner";
import { useWishlist } from "@/components/account/use-wishlist";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";
import { useCartStore } from "@/stores/cart";
import { useUiStore } from "@/stores/ui";

/**
 * The quick add on a product card (overview §4.6). A product with one variant goes straight into the cart; a
 * product with several opens its page, because picking 128GB or 256GB for someone is not a kindness.
 */
export function AddToCartIconButton({
  product,
  disabled,
  className,
}: {
  product: ProductCardData;
  disabled?: boolean;
  className?: string;
}) {
  const router = useRouter();
  const add = useCartStore((state) => state.add);
  const setMiniCartOpen = useUiStore((state) => state.setMiniCartOpen);
  const needsChoice = product.variantCount > 1;

  if (disabled) {
    return (
      <Button variant="outline" size="sm" disabled className={cn("relative z-10", className)}>
        Sold out
      </Button>
    );
  }

  return (
    <Button
      variant="outline"
      size="sm"
      className={cn("relative z-10 gap-1.5", className)}
      aria-label={needsChoice ? `Choose options for ${product.name}` : `Add ${product.name} to cart`}
      onClick={() => {
        if (needsChoice) {
          router.push(`/product/${product.slug}`);
          return;
        }
        add({
          productId: product.id,
          variantId: product.defaultVariant.id,
          slug: product.slug,
          name: product.name,
          variantLabel: product.defaultVariant.label,
          sku: product.defaultVariant.sku,
          image: product.image?.url ?? null,
          unitPriceKobo: product.defaultVariant.priceKobo,
          stock: product.defaultVariant.stock,
        });
        setMiniCartOpen(true);
        toast.success("Added to cart", { description: product.name });
      }}
    >
      {needsChoice ? (
        <>
          <SlidersHorizontalIcon aria-hidden="true" className="size-3.5" />
          Options
        </>
      ) : (
        <>
          <PlusIcon aria-hidden="true" className="size-3.5" />
          Add
        </>
      )}
    </Button>
  );
}

/**
 * The wishlist heart (S-7). It fills the moment it is pressed; signing in is offered to anyone who is not,
 * and the request happens behind the scenes.
 */
export function WishlistHeart({
  productId,
  productName,
  className,
}: {
  productId: string;
  productName: string;
  className?: string;
}) {
  const { toggle, isSaved } = useWishlist();
  const saved = isSaved(productId);

  return (
    <Button
      variant="ghost"
      size="icon-sm"
      aria-pressed={saved}
      aria-label={saved ? `Remove ${productName} from your wishlist` : `Save ${productName} to your wishlist`}
      data-testid="wishlist-heart"
      className={cn(
        "relative z-10 bg-white/90 hover:text-brand-primary",
        saved ? "text-brand-primary" : "text-text-muted",
        className,
      )}
      onClick={() => toggle(productId, productName)}
    >
      <HeartIcon aria-hidden="true" className="size-4" fill={saved ? "currentColor" : "none"} />
    </Button>
  );
}
