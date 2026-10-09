"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import type { Customer } from "@aib/shared";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getSession } from "@/lib/account";

/**
 * Who is signed in, for the parts of the page that need to know — the header menu, the wishlist hearts, the
 * checkout guard.
 *
 * The session is fetched in the browser rather than rendered on the server on purpose: reading the cookie
 * during render would make every catalogue page dynamic, and those pages are static with a 60-second
 * revalidate (ADR-011). The header therefore renders signed-out for a moment and then settles.
 */

export const SESSION_QUERY_KEY = ["session"] as const;

type SessionValue = {
  customer: Customer | null;
  isLoading: boolean;
  isSignedIn: boolean;
  wishlist: Set<string>;
  /** Re-read the session — after signing in, signing out, or changing the profile. */
  refresh: () => Promise<void>;
};

const SessionContext = createContext<SessionValue | null>(null);

export function SessionProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: SESSION_QUERY_KEY,
    queryFn: getSession,
    staleTime: 30_000,
    retry: false,
  });

  const value = useMemo<SessionValue>(() => {
    const customer = data?.customer ?? null;
    return {
      customer,
      isLoading,
      isSignedIn: customer !== null,
      wishlist: new Set(customer?.wishlistProductIds ?? []),
      refresh: async () => {
        await queryClient.invalidateQueries({ queryKey: SESSION_QUERY_KEY });
      },
    };
  }, [data, isLoading, queryClient]);

  return <SessionContext.Provider value={value}>{children}</SessionContext.Provider>;
}

export function useSession(): SessionValue {
  const value = useContext(SessionContext);
  if (!value) {
    throw new Error("useSession must be used inside <SessionProvider>.");
  }
  return value;
}
