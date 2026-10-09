"use client";

import Link from "next/link";
import { HeartIcon, ShoppingBagIcon, UserIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cartCount, useCartStore } from "@/stores/cart";
import { useUiStore } from "@/stores/ui";

/**
 * The cart button (S-1). The count only appears once the persisted cart has been read, so the server-rendered
 * header and the first client render agree.
 */
export function CartButton() {
  const lines = useCartStore((state) => state.lines);
  const hydrated = useCartStore((state) => state.hydrated);
  const setMiniCartOpen = useUiStore((state) => state.setMiniCartOpen);
  const count = hydrated ? cartCount(lines) : 0;

  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label={count > 0 ? `Cart, ${count} item${count === 1 ? "" : "s"}` : "Cart, empty"}
      data-testid="cart-button"
      onClick={() => setMiniCartOpen(true)}
      className="relative"
    >
      <ShoppingBagIcon aria-hidden="true" className="size-5" />
      {count > 0 ? (
        <span
          data-testid="cart-count"
          className="absolute top-1 right-1 inline-flex min-w-5 items-center justify-center rounded-full bg-brand-primary px-1 text-caption font-semibold numeric text-white"
        >
          {count}
        </span>
      ) : null}
    </Button>
  );
}

/** The wishlist icon. Signing in is built in Batch 2, so it points at the sign-in page with a return path. */
export function WishlistButton() {
  return (
    <Button variant="ghost" size="icon" asChild aria-label="Wishlist" className="hidden sm:inline-flex">
      <Link href="/login?next=/account/wishlist">
        <HeartIcon aria-hidden="true" className="size-5" />
      </Link>
    </Button>
  );
}

/**
 * The account menu (S-1). It is built now with the signed-out items; Batch 2 adds the signed-in ones to the
 * same component rather than replacing the header.
 */
export function AccountMenu() {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Account">
          <UserIcon aria-hidden="true" className="size-5" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Account</DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/login">Sign in</Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/register">Create account</Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/login?next=/account/orders">My orders</Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/login?next=/account/wishlist">Wishlist</Link>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
