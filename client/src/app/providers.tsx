"use client";

import type { ReactNode } from "react";
import { TooltipProvider } from "@/components/ui/tooltip";

/**
 * The providers every page needs — which is deliberately almost nothing.
 *
 * TanStack Query lives with the one view that uses it (the cart, overview §6.3) rather than in this layout,
 * so a customer browsing the catalogue never downloads a query client they will not use. Account, checkout
 * and admin views add their own provider in the later batches.
 */
export function Providers({ children }: { children: ReactNode }) {
  return <TooltipProvider>{children}</TooltipProvider>;
}
