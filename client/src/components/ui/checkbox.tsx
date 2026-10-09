"use client";

import type * as React from "react";
import { CheckIcon } from "lucide-react";
import { Checkbox as CheckboxPrimitive } from "radix-ui";
import { cn } from "@/lib/cn";

export function Checkbox({ className, ...props }: React.ComponentProps<typeof CheckboxPrimitive.Root>) {
  return (
    <CheckboxPrimitive.Root
      data-slot="checkbox"
      className={cn(
        "peer size-5 shrink-0 rounded-sm border border-grey-300 bg-white transition-colors duration-150 ease-out",
        "hover:border-grey-500 data-[state=checked]:border-brand-primary data-[state=checked]:bg-brand-primary",
        "disabled:cursor-not-allowed disabled:border-grey-200 disabled:bg-grey-100",
        className,
      )}
      {...props}
    >
      <CheckboxPrimitive.Indicator className="flex items-center justify-center text-white">
        <CheckIcon aria-hidden="true" className="size-3.5" strokeWidth={3} />
      </CheckboxPrimitive.Indicator>
    </CheckboxPrimitive.Root>
  );
}
