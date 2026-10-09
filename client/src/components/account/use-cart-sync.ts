"use client";

import { useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { mergeServerCart } from "@/lib/account";
import { ApiRequestError } from "@/lib/api";
import { useCartStore } from "@/stores/cart";
import { SESSION_QUERY_KEY } from "./session-provider";

/**
 * What happens to a guest's cart when they sign in (AC2.2).
 *
 * The browser's cart is sent to the server once, which adds its quantities to whatever the account already
 * had and caps the result at stock. The answer replaces the local cart, so from that moment the two agree —
 * and the customer never loses the items they chose before signing in.
 */
export function useCartSync(): () => Promise<void> {
  const queryClient = useQueryClient();
  const lines = useCartStore((state) => state.lines);
  const applyValidation = useCartStore((state) => state.applyValidation);

  return useCallback(async () => {
    try {
      const merged = await mergeServerCart({
        items: lines.map((line) => ({
          productId: line.productId,
          variantId: line.variantId,
          qty: line.qty,
        })),
      });

      applyValidation({
        items: merged.items.map((item) => ({ ...item })),
        issues: [],
        subtotalKobo: merged.subtotalKobo,
      });
    } catch (error) {
      // A cart that could not be merged is not a reason to block someone from signing in.
      if (!(error instanceof ApiRequestError)) {
        throw error;
      }
    } finally {
      await queryClient.invalidateQueries({ queryKey: SESSION_QUERY_KEY });
    }
  }, [applyValidation, lines, queryClient]);
}
