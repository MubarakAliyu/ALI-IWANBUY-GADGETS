"use client";

import { useState, type ReactNode } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { SessionProvider } from "@/components/account/session-provider";
import { TooltipProvider } from "@/components/ui/tooltip";

/**
 * The providers every page needs.
 *
 * TanStack Query is here rather than on the one page that uses it, because from Batch 2 the wishlist hearts
 * sit on every product card and the account menu needs the session — both of which the overview (§6.3) puts
 * on TanStack Query. ADR-013 records what that costs and why it is the right call.
 */
export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: { staleTime: 60_000, retry: 1, refetchOnWindowFocus: false },
        },
      }),
  );

  return (
    <QueryClientProvider client={queryClient}>
      <SessionProvider>
        <TooltipProvider>{children}</TooltipProvider>
      </SessionProvider>
    </QueryClientProvider>
  );
}
