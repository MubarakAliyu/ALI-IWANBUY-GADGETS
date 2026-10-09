import type { ProductCard as ProductCardData } from "@aib/shared";
import { cn } from "@/lib/cn";
import { ProductCard, ProductCardSkeleton } from "./product-card";

/** The catalogue grid (S-3): two columns on a phone, three on a tablet, four on a desktop. */
export function ProductGrid({
  products,
  priorityCount = 0,
  className,
}: {
  products: ProductCardData[];
  /** How many images to load eagerly — the first row, and no more. */
  priorityCount?: number;
  className?: string;
}) {
  return (
    <div className={cn("grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4", className)}>
      {products.map((product, index) => (
        <ProductCard key={product.id} product={product} priority={index < priorityCount} />
      ))}
    </div>
  );
}

export function ProductGridSkeleton({ count = 8, className }: { count?: number; className?: string }) {
  return (
    <div className={cn("grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4", className)}>
      {Array.from({ length: count }, (_, index) => (
        <ProductCardSkeleton key={index} />
      ))}
    </div>
  );
}

/** A horizontally scrolling row for "New arrivals" on a phone, a plain grid from `sm` up (S-2). */
export function ProductScroller({ products }: { products: ProductCardData[] }) {
  return (
    <>
      <ul className="scroll-slim -mx-4 flex snap-x snap-mandatory gap-4 overflow-x-auto px-4 pb-2 sm:hidden">
        {products.map((product) => (
          <li key={product.id} className="w-[62%] shrink-0 snap-start">
            <ProductCard product={product} className="h-full" />
          </li>
        ))}
      </ul>
      <div className="hidden sm:block">
        <ProductGrid products={products} />
      </div>
    </>
  );
}
