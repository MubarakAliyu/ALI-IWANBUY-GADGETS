import type * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/cn";

/**
 * Text fields (overview §4.6): 44px high on the storefront, 1px grey-200 border, 6px radius. Focus shows the
 * global 2px brand ring; `aria-invalid` turns the border red. Shared by Select and Textarea.
 */
export const fieldBaseClass =
  "w-full min-w-0 rounded-sm border border-grey-200 bg-white text-brand-navy transition-colors duration-150 ease-out placeholder:text-text-muted hover:border-grey-300 focus-visible:border-brand-primary disabled:cursor-not-allowed disabled:border-grey-200 disabled:bg-grey-50 disabled:text-grey-500 aria-invalid:border-danger aria-invalid:hover:border-danger";

export const fieldVariants = cva(fieldBaseClass, {
  variants: {
    fieldSize: {
      default: "h-11 px-3 text-body-sm",
      sm: "h-9 px-3 text-body-sm",
    },
  },
  defaultVariants: { fieldSize: "default" },
});

type InputProps = React.ComponentProps<"input"> & VariantProps<typeof fieldVariants>;

export function Input({ className, type, fieldSize, ...props }: InputProps) {
  return (
    <input
      type={type}
      data-slot="input"
      className={cn(fieldVariants({ fieldSize }), "read-only:bg-grey-50", className)}
      {...props}
    />
  );
}

export type { InputProps };
