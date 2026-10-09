"use client";

import { useCartHydration } from "@/stores/cart";

/**
 * Reads the stored cart into the store once, after the first render has matched the server's HTML. It renders
 * nothing; it exists so the storefront layout can do this in one place rather than in every component that
 * happens to read the cart.
 */
export function CartHydrator() {
  useCartHydration();
  return null;
}
