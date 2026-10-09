"use client";

import { useCallback } from "react";
import type { Session } from "@aib/shared";
import { usePathname, useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { SESSION_QUERY_KEY, useSession } from "@/components/account/session-provider";
import { addToWishlist, removeFromWishlist } from "@/lib/account";

/**
 * Saving a product (S-7), optimistically: the heart fills the instant it is pressed, and the session cache is
 * updated in place so every other heart for the same product on the page agrees. If the request fails, the
 * previous session is put back and the customer is told.
 *
 * A signed-out visitor is sent to sign in, with `?next=` pointing back at the page they were on and the
 * product they wanted, so the heart can be applied once they return.
 */
export function useWishlist() {
  const router = useRouter();
  const pathname = usePathname();
  const queryClient = useQueryClient();
  const { isSignedIn, wishlist } = useSession();

  const mutation = useMutation({
    mutationFn: ({ productId, saved }: { productId: string; saved: boolean }) =>
      saved ? removeFromWishlist(productId) : addToWishlist(productId),

    onMutate: async ({ productId, saved }) => {
      await queryClient.cancelQueries({ queryKey: SESSION_QUERY_KEY });
      const previous = queryClient.getQueryData<Session>(SESSION_QUERY_KEY);

      queryClient.setQueryData<Session>(SESSION_QUERY_KEY, (current) => {
        if (!current?.customer) {
          return current;
        }
        const ids = saved
          ? current.customer.wishlistProductIds.filter((id) => id !== productId)
          : [...current.customer.wishlistProductIds, productId];
        return { customer: { ...current.customer, wishlistProductIds: ids, wishlistCount: ids.length } };
      });

      return { previous };
    },

    onError: (_error, _variables, context) => {
      if (context?.previous) {
        queryClient.setQueryData(SESSION_QUERY_KEY, context.previous);
      }
      toast.error("We could not update your wishlist. Please try again.");
    },

    onSettled: () => {
      void queryClient.invalidateQueries({ queryKey: SESSION_QUERY_KEY });
    },
  });

  const toggle = useCallback(
    (productId: string, productName: string) => {
      if (!isSignedIn) {
        const next = `${pathname}?wish=${productId}`;
        toast("Sign in to save items", {
          description: "Your wishlist is kept with your account.",
          action: { label: "Sign in", onClick: () => router.push(`/login?next=${encodeURIComponent(next)}`) },
        });
        return;
      }

      const saved = wishlist.has(productId);
      mutation.mutate({ productId, saved });
      toast.success(saved ? "Removed from your wishlist" : "Saved to your wishlist", {
        description: productName,
      });
    },
    [isSignedIn, mutation, pathname, router, wishlist],
  );

  return { toggle, isSaved: (productId: string) => wishlist.has(productId), isPending: mutation.isPending };
}
