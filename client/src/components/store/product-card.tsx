import type { ProductCard as ProductCardData } from "@aib/shared";
import { CONDITION_LABEL } from "@aib/shared";
import Image from "next/image";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { PriceTag } from "@/components/ui/price-tag";
import { Skeleton } from "@/components/ui/skeleton";
import { StockBadge } from "@/components/ui/status-badge";
import { cn } from "@/lib/cn";
import { AddToCartIconButton, WishlistHeart } from "./product-card-actions";

/**
 * The product card (overview §4.6): image on grey-50, brand caption, name on two lines at most, price, stock
 * pill, a wishlist heart and a quick add. The whole card is a link; the two controls sit above it so they are
 * separate targets for both a mouse and a screen reader.
 */
export function ProductCard({
  product,
  priority = false,
  className,
}: {
  product: ProductCardData;
  /** Load the image eagerly — only for the first row above the fold. */
  priority?: boolean;
  className?: string;
}) {
  const soldOut = product.totalStock <= 0;

  return (
    <article
      data-testid="product-card"
      className={cn(
        "group relative flex flex-col overflow-hidden rounded-md border border-grey-200 bg-white transition-shadow duration-150 ease-out hover:shadow-md",
        className,
      )}
    >
      <div className="relative aspect-square bg-grey-50">
        {product.image ? (
          <Image
            src={product.image.url}
            alt={product.image.alt || product.name}
            fill
            priority={priority}
            sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
            className="object-contain p-3 transition-transform duration-200 ease-out group-hover:scale-[1.03]"
          />
        ) : null}

        <div className="absolute top-2 left-2 flex flex-col items-start gap-1">
          {product.isNewArrival ? <Badge variant="brand">New</Badge> : null}
          {product.condition !== "NEW" ? (
            <Badge variant="outline">{CONDITION_LABEL[product.condition]}</Badge>
          ) : null}
        </div>

        <WishlistHeart productId={product.id} productName={product.name} className="absolute top-2 right-2" />
      </div>

      <div className="flex flex-1 flex-col gap-2 p-4">
        <p className="text-label text-text-muted uppercase">{product.brand.name}</p>

        <h3 className="text-body-sm font-medium text-brand-navy">
          <Link href={`/product/${product.slug}`} className="line-clamp-2 after:absolute after:inset-0">
            {product.name}
          </Link>
        </h3>

        <PriceTag
          priceKobo={product.priceFromKobo}
          compareAtPriceKobo={product.compareAtPriceKobo}
          from={product.variantCount > 1}
          className="mt-auto"
        />

        <div className="flex items-center justify-between gap-2">
          <StockBadge stock={product.totalStock} />
          <AddToCartIconButton product={product} disabled={soldOut} />
        </div>
      </div>
    </article>
  );
}

export function ProductCardSkeleton() {
  return (
    <div className="flex flex-col overflow-hidden rounded-md border border-grey-200 bg-white">
      <Skeleton className="aspect-square rounded-none" />
      <div className="grid gap-2 p-4">
        <Skeleton className="h-3 w-16" />
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-2/3" />
        <Skeleton className="mt-1 h-5 w-24" />
        <Skeleton className="h-6 w-20" />
      </div>
    </div>
  );
}
