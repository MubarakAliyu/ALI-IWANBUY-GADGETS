"use client";

import type * as React from "react";
import { Label as LabelPrimitive } from "radix-ui";
import { cn } from "@/lib/cn";

/** Field labels sit above their control in Medium 14 navy (overview §4.6). Placeholders are never labels. */
export function Label({ className, ...props }: React.ComponentProps<typeof LabelPrimitive.Root>) {
  return (
    <LabelPrimitive.Root
      data-slot="label"
      className={cn(
        "flex items-center gap-2 text-body-sm font-medium text-brand-navy select-none peer-disabled:cursor-not-allowed peer-disabled:text-grey-500",
        className,
      )}
      {...props}
    />
  );
}
