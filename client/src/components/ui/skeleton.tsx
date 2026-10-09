import type * as React from "react";
import { cn } from "@/lib/cn";

/** The shape of content that has not arrived yet. Hidden from screen readers, which hear the loading text. */
export function Skeleton({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="skeleton"
      aria-hidden="true"
      className={cn("animate-pulse rounded-sm bg-grey-100", className)}
      {...props}
    />
  );
}
