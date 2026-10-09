import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { Loader2Icon } from "lucide-react";
import { Slot } from "radix-ui";
import { cn } from "@/lib/cn";

/**
 * Buttons (overview §4.6): 10px radius, 44px high on the storefront so they are comfortable on a phone, with
 * a 48px `hero` size for the main product call to action.
 */
const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 rounded-md font-semibold whitespace-nowrap transition-colors duration-150 ease-out select-none [&_svg]:pointer-events-none [&_svg]:shrink-0 [&_svg:not([class*=size-])]:size-4",
  {
    variants: {
      variant: {
        primary: "bg-brand-primary text-white shadow-sm hover:bg-primary-600 active:bg-primary-700",
        dark: "bg-brand-navy text-white shadow-sm hover:bg-navy-800 active:bg-navy-700",
        outline:
          "border border-grey-200 bg-white text-brand-navy hover:border-grey-300 hover:bg-grey-50 active:bg-grey-100",
        ghost: "text-brand-navy hover:bg-grey-100 active:bg-grey-200",
        danger: "bg-danger text-white shadow-sm hover:bg-danger-text active:bg-danger-text",
        link: "text-brand-primary underline-offset-4 hover:underline active:text-primary-700",
        onDark: "bg-white text-brand-primary shadow-sm hover:bg-primary-50 active:bg-primary-100",
      },
      size: {
        default: "h-11 px-5 text-body-sm",
        sm: "h-9 gap-1.5 px-3 text-body-sm",
        hero: "h-12 px-6 text-body",
        icon: "size-11",
        "icon-sm": "size-9",
      },
    },
    compoundVariants: [{ variant: "link", className: "h-auto px-0" }],
    defaultVariants: { variant: "primary", size: "default" },
  },
);

const disabledSolid =
  "disabled:cursor-not-allowed disabled:border-transparent disabled:bg-grey-200 disabled:text-grey-500 disabled:shadow-none";
const disabledQuiet = "disabled:cursor-not-allowed disabled:bg-transparent disabled:text-grey-500";

type ButtonProps = React.ComponentProps<"button"> &
  VariantProps<typeof buttonVariants> & {
    asChild?: boolean;
    /** Shows a spinner, disables the button and sets `aria-busy`. */
    loading?: boolean;
    /** Text shown while loading, e.g. "Adding…". Defaults to the children. */
    loadingLabel?: React.ReactNode;
  };

function Button({
  className,
  variant = "primary",
  size = "default",
  asChild = false,
  loading = false,
  loadingLabel,
  disabled,
  type,
  children,
  ...props
}: ButtonProps) {
  const quiet = variant === "ghost" || variant === "link";
  const classes = cn(
    buttonVariants({ variant, size }),
    loading ? "disabled:cursor-wait" : quiet ? disabledQuiet : disabledSolid,
    className,
  );

  if (asChild) {
    return (
      <Slot.Root data-slot="button" data-variant={variant} className={classes} {...props}>
        {children}
      </Slot.Root>
    );
  }

  return (
    <button
      data-slot="button"
      data-variant={variant}
      data-size={size}
      data-loading={loading || undefined}
      type={type ?? "button"}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      className={classes}
      {...props}
    >
      {loading ? (
        <>
          <Loader2Icon aria-hidden="true" data-essential-motion="" className="animate-spin" />
          {loadingLabel ?? children}
        </>
      ) : (
        children
      )}
    </button>
  );
}

export { Button, buttonVariants, type ButtonProps };
