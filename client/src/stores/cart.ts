"use client";

import { useEffect } from "react";
import { multiplyKobo, type CartValidateResponse } from "@aib/shared";
import { create } from "zustand";
import { persist } from "zustand/middleware";

/**
 * The guest cart (S-6). It lives in localStorage so it survives a reload, and it is keyed by
 * `productId:variantId` — the 256GB iPhone and the 128GB one are different lines.
 *
 * Everything here is the browser's best guess. `unitPriceKobo` and `stock` are what the catalogue said when
 * the line was added; the server re-prices the whole cart at `/cart/validate` and again at checkout, and
 * `applyValidation` replaces this state with that answer. Nothing in this file is ever trusted for money.
 */

export const CART_STORAGE_KEY = "aib-cart-v1";
const MAX_QTY_PER_LINE = 99;

export type CartLine = {
  productId: string;
  variantId: string;
  slug: string;
  name: string;
  variantLabel: string;
  sku: string;
  image: string | null;
  unitPriceKobo: number;
  qty: number;
  /** The stock figure the catalogue showed when this line was added or last validated. */
  stock: number;
};

export type CartState = {
  lines: CartLine[];
  hydrated: boolean;
  add: (line: Omit<CartLine, "qty">, qty?: number) => void;
  setQty: (productId: string, variantId: string, qty: number) => void;
  remove: (productId: string, variantId: string) => void;
  clear: () => void;
  applyValidation: (result: CartValidateResponse) => void;
};

export function lineKey(productId: string, variantId: string): string {
  return `${productId}:${variantId}`;
}

function clampQty(qty: number, stock: number): number {
  const ceiling = Math.min(stock > 0 ? stock : 0, MAX_QTY_PER_LINE);
  return Math.max(0, Math.min(Math.trunc(qty), ceiling));
}

export const useCartStore = create<CartState>()(
  persist(
    (set) => ({
      lines: [],
      hydrated: false,

      add: (line, qty = 1) =>
        set((state) => {
          const key = lineKey(line.productId, line.variantId);
          const existing = state.lines.find((item) => lineKey(item.productId, item.variantId) === key);

          if (!existing) {
            const wanted = clampQty(qty, line.stock);
            return wanted === 0 ? state : { lines: [...state.lines, { ...line, qty: wanted }] };
          }

          // Adding the same line again tops it up rather than starting a second row.
          const wanted = clampQty(existing.qty + qty, line.stock);
          return {
            lines: state.lines.map((item) =>
              lineKey(item.productId, item.variantId) === key
                ? { ...item, ...line, qty: wanted || existing.qty }
                : item,
            ),
          };
        }),

      setQty: (productId, variantId, qty) =>
        set((state) => {
          const key = lineKey(productId, variantId);
          const lines = state.lines
            .map((item) =>
              lineKey(item.productId, item.variantId) === key
                ? { ...item, qty: clampQty(qty, item.stock) }
                : item,
            )
            .filter((item) => item.qty > 0);
          return { lines };
        }),

      remove: (productId, variantId) =>
        set((state) => ({
          lines: state.lines.filter(
            (item) => lineKey(item.productId, item.variantId) !== lineKey(productId, variantId),
          ),
        })),

      clear: () => set({ lines: [] }),

      applyValidation: (result) =>
        set(() => ({
          lines: result.items
            .filter((item) => item.qty > 0)
            .map((item) => ({
              productId: item.productId,
              variantId: item.variantId,
              slug: item.slug,
              name: item.name,
              variantLabel: item.variantLabel,
              sku: item.sku,
              image: item.image,
              unitPriceKobo: item.unitPriceKobo,
              qty: item.qty,
              stock: item.stock,
            })),
        })),
    }),
    {
      name: CART_STORAGE_KEY,
      version: 1,
      partialize: (state) => ({ lines: state.lines }) as CartState,
      /**
       * Hydration is deferred to `useCartHydration` below. The server renders an empty cart, so reading
       * localStorage during the first client render would make React's markup disagree with the server's;
       * instead the stored cart is loaded in an effect, after the page has matched.
       */
      skipHydration: true,
    },
  ),
);

// On the server there is no localStorage, so zustand skips the persist middleware entirely and the `persist`
// API is not attached. Only the browser subscribes to hydration.
if (typeof window !== "undefined") {
  useCartStore.persist.onFinishHydration(() => {
    useCartStore.setState({ hydrated: true });
  });
}

/**
 * Loads the stored cart once, after mount. `<CartHydrator />` calls it from the storefront layout, so every
 * page has the real cart a tick after it renders — and `hydrated` tells the header when the count is safe to
 * show.
 */
export function useCartHydration(): void {
  useEffect(() => {
    void useCartStore.persist.rehydrate();
  }, []);
}

export function cartCount(lines: CartLine[]): number {
  return lines.reduce((sum, line) => sum + line.qty, 0);
}

export function cartSubtotalKobo(lines: CartLine[]): number {
  return lines.reduce((sum, line) => sum + multiplyKobo(line.unitPriceKobo, line.qty), 0);
}
