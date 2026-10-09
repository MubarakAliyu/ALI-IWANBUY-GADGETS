"use client";

import { useQuery } from "@tanstack/react-query";
import Link from "next/link";
import { HeartIcon } from "lucide-react";
import { ProductGridSkeleton } from "@/components/store/product-grid";
import { ProductCard } from "@/components/store/product-card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { getWishlist } from "@/lib/account";
import { useSession } from "./session-provider";

/**
 * The saved-items page (S-7). Each card keeps its own heart and quick add, so removing something or moving it
 * into the cart happens where the customer is looking.
 */
export function WishlistView() {
  const { customer } = useSession();

  const { data, isLoading } = useQuery({
    queryKey: ["wishlist", customer?.wishlistProductIds.join(",") ?? ""],
    queryFn: getWishlist,
    enabled: customer !== null,
  });

  if (isLoading || !customer) {
    return <ProductGridSkeleton count={4} />;
  }

  const products = data?.data ?? [];

  if (products.length === 0) {
    return (
      <EmptyState
        icon={<HeartIcon />}
        title="Nothing saved yet"
        description="Press the heart on any product and it will wait for you here."
        action={
          <Button asChild>
            <Link href="/shop">Browse the shop</Link>
          </Button>
        }
      />
    );
  }

  return (
    <div className="grid gap-4">
      <p className="text-body-sm text-text-muted">
        {products.length} saved {products.length === 1 ? "product" : "products"}
      </p>
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-3">
        {products.map((product) => (
          <ProductCard key={product.id} product={product} />
        ))}
      </div>
    </div>
  );
}
