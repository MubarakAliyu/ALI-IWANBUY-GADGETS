"use client";

import type * as React from "react";
import { XIcon } from "lucide-react";
import { Dialog as SheetPrimitive } from "radix-ui";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/cn";

/** Side and bottom panels: 16px radius on the open edge, large shadow, navy scrim, 200ms (overview §4.3). */
function Sheet(props: React.ComponentProps<typeof SheetPrimitive.Root>) {
  return <SheetPrimitive.Root data-slot="sheet" {...props} />;
}

function SheetTrigger(props: React.ComponentProps<typeof SheetPrimitive.Trigger>) {
  return <SheetPrimitive.Trigger data-slot="sheet-trigger" {...props} />;
}

function SheetClose(props: React.ComponentProps<typeof SheetPrimitive.Close>) {
  return <SheetPrimitive.Close data-slot="sheet-close" {...props} />;
}

type SheetSide = "top" | "right" | "bottom" | "left";

const sideClasses: Record<SheetSide, string> = {
  right:
    "inset-y-0 right-0 h-full w-[85%] rounded-l-lg data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right sm:max-w-md",
  left: "inset-y-0 left-0 h-full w-[85%] rounded-r-lg data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left sm:max-w-md",
  top: "inset-x-0 top-0 h-auto rounded-b-lg data-[state=closed]:slide-out-to-top data-[state=open]:slide-in-from-top",
  bottom:
    "inset-x-0 bottom-0 max-h-[85dvh] rounded-t-lg data-[state=closed]:slide-out-to-bottom data-[state=open]:slide-in-from-bottom",
};

function SheetContent({
  className,
  children,
  side = "right",
  showCloseButton = true,
  ...props
}: React.ComponentProps<typeof SheetPrimitive.Content> & {
  side?: SheetSide;
  showCloseButton?: boolean;
}) {
  return (
    <SheetPrimitive.Portal>
      <SheetPrimitive.Overlay
        data-slot="sheet-overlay"
        className="fixed inset-0 z-50 bg-brand-navy/60 duration-200 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:animate-in data-[state=open]:fade-in-0"
      />
      <SheetPrimitive.Content
        data-slot="sheet-content"
        className={cn(
          "scroll-slim fixed z-50 flex flex-col gap-4 overflow-y-auto bg-white text-brand-navy shadow-lg duration-200 data-[state=closed]:animate-out data-[state=open]:animate-in",
          sideClasses[side],
          className,
        )}
        {...props}
      >
        {children}
        {showCloseButton ? (
          <SheetPrimitive.Close asChild>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Close"
              className="absolute top-3 right-3 text-text-muted"
            >
              <XIcon className="size-5" />
            </Button>
          </SheetPrimitive.Close>
        ) : null}
      </SheetPrimitive.Content>
    </SheetPrimitive.Portal>
  );
}

function SheetHeader({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sheet-header"
      className={cn("flex flex-col gap-1 border-b border-grey-200 p-5 pr-14", className)}
      {...props}
    />
  );
}

function SheetFooter({ className, ...props }: React.ComponentProps<"div">) {
  return (
    <div
      data-slot="sheet-footer"
      className={cn("mt-auto flex flex-col gap-2 border-t border-grey-200 p-5", className)}
      {...props}
    />
  );
}

function SheetTitle({ className, ...props }: React.ComponentProps<typeof SheetPrimitive.Title>) {
  return <SheetPrimitive.Title data-slot="sheet-title" className={cn("text-h3", className)} {...props} />;
}

function SheetDescription({ className, ...props }: React.ComponentProps<typeof SheetPrimitive.Description>) {
  return (
    <SheetPrimitive.Description
      data-slot="sheet-description"
      className={cn("text-body-sm text-text-muted", className)}
      {...props}
    />
  );
}

export {
  Sheet,
  SheetClose,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
};
