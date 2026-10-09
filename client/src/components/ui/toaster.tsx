"use client";

import { Toaster as Sonner } from "sonner";

/**
 * Toasts for cart and wishlist actions (S-14). Styled with brand tokens rather than sonner's defaults, and
 * placed bottom-centre on a phone so a thumb does not cover it.
 */
export function Toaster() {
  return (
    <Sonner
      position="bottom-center"
      offset={16}
      duration={3500}
      toastOptions={{
        classNames: {
          toast:
            "!rounded-md !border !border-grey-200 !bg-white !text-brand-navy !shadow-lg !font-sans !text-body-sm",
          description: "!text-text-muted",
          actionButton: "!bg-brand-primary !text-white !rounded-sm !font-semibold",
          cancelButton: "!bg-grey-100 !text-brand-navy !rounded-sm",
          success: "[&_[data-icon]]:!text-success",
          error: "[&_[data-icon]]:!text-danger",
        },
      }}
    />
  );
}
