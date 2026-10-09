import type * as React from "react";
import { cn } from "@/lib/cn";

/**
 * The page gutter. Storefront content is capped at 1280px (overview §4.3) and keeps a 16px gutter on a phone,
 * so nothing ever touches the edge of the screen and no page scrolls sideways.
 */
export function Container({ className, ...props }: React.ComponentProps<"div">) {
  return <div className={cn("mx-auto w-full max-w-[1280px] px-4 sm:px-6", className)} {...props} />;
}

/** A section heading with an optional link on the right — "Featured products … See all". */
export function SectionHeading({
  title,
  description,
  action,
  as: Heading = "h2",
  className,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
  as?: "h1" | "h2" | "h3";
  className?: string;
}) {
  return (
    <div className={cn("flex flex-wrap items-end justify-between gap-3", className)}>
      <div className="grid gap-1">
        <Heading className="text-h2 text-brand-navy">{title}</Heading>
        {description ? <p className="text-body-sm text-text-muted">{description}</p> : null}
      </div>
      {action}
    </div>
  );
}
