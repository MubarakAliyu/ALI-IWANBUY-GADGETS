import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { Slot } from "radix-ui";
import { cn } from "@/lib/cn";

/**
 * Badges always carry a text label — colour is never the only signal (overview §12). The order status pairs
 * are fixed by overview §4.5 and every pair measures at least 4.5:1.
 */
const badgeVariants = cva(
  "inline-flex w-fit shrink-0 items-center gap-1 rounded-sm px-2 py-0.5 text-caption font-semibold whitespace-nowrap [&>svg]:pointer-events-none [&>svg]:size-3",
  {
    variants: {
      variant: {
        neutral: "bg-grey-100 text-navy-700",
        brand: "bg-primary-50 text-primary-600",
        outline: "border border-grey-200 bg-white text-brand-navy",
        success: "bg-success-tint text-success-text",
        warning: "bg-warning-tint text-warning-text",
        danger: "bg-danger-tint text-danger-text",
        pending: "bg-order-pending-bg text-order-pending",
        awaiting: "bg-order-awaiting-bg text-order-awaiting",
        paid: "bg-order-paid-bg text-order-paid",
        fulfilling: "bg-order-fulfilling-bg text-order-fulfilling",
        complete: "bg-order-complete-bg text-order-complete",
        cancelled: "bg-order-cancelled-bg text-order-cancelled",
      },
    },
    defaultVariants: { variant: "neutral" },
  },
);

type BadgeProps = React.ComponentProps<"span"> & VariantProps<typeof badgeVariants> & { asChild?: boolean };

function Badge({ className, variant = "neutral", asChild = false, ...props }: BadgeProps) {
  const Comp = asChild ? Slot.Root : "span";
  return (
    <Comp
      data-slot="badge"
      data-variant={variant}
      className={cn(badgeVariants({ variant }), className)}
      {...props}
    />
  );
}

export { Badge, badgeVariants, type BadgeProps };
