"use client";

import * as React from "react";
import { MinusIcon, PlusIcon } from "lucide-react";
import { cn } from "@/lib/cn";

type QuantityStepperProps = {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  /** Never let someone ask for more than is in stock (S-5). */
  max: number;
  label?: string;
  size?: "sm" | "md";
  className?: string;
};

/**
 * Minus, a number, plus. The number is a real input so a keyboard or a screen reader can set it directly, and
 * every path through the component clamps to `min`…`max`.
 */
export function QuantityStepper({
  value,
  onChange,
  min = 1,
  max,
  label = "Quantity",
  size = "md",
  className,
}: QuantityStepperProps) {
  const inputId = React.useId();
  const clamp = (next: number) => Math.min(Math.max(next, min), Math.max(max, min));
  const button =
    size === "sm"
      ? "size-9 text-brand-navy disabled:text-grey-300"
      : "size-11 text-brand-navy disabled:text-grey-300";

  return (
    <div
      className={cn(
        "inline-flex items-center rounded-md border border-grey-200 bg-white",
        size === "sm" ? "h-9" : "h-11",
        className,
      )}
    >
      <button
        type="button"
        aria-label="Decrease quantity"
        disabled={value <= min}
        onClick={() => onChange(clamp(value - 1))}
        className={cn(
          "inline-flex items-center justify-center rounded-l-md transition-colors duration-150 ease-out hover:bg-grey-100 disabled:cursor-not-allowed disabled:hover:bg-transparent",
          button,
        )}
      >
        <MinusIcon aria-hidden="true" className="size-4" />
      </button>

      <label htmlFor={inputId} className="sr-only">
        {label}
      </label>
      <input
        id={inputId}
        type="number"
        inputMode="numeric"
        min={min}
        max={max}
        value={value}
        onChange={(event) => {
          const next = Number(event.target.value);
          onChange(Number.isFinite(next) ? clamp(Math.trunc(next)) : min);
        }}
        className={cn(
          "h-full w-10 border-0 bg-transparent text-center text-body-sm font-semibold numeric text-brand-navy outline-none",
          "[appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none",
        )}
      />

      <button
        type="button"
        aria-label="Increase quantity"
        disabled={value >= max}
        onClick={() => onChange(clamp(value + 1))}
        className={cn(
          "inline-flex items-center justify-center rounded-r-md transition-colors duration-150 ease-out hover:bg-grey-100 disabled:cursor-not-allowed disabled:hover:bg-transparent",
          button,
        )}
      >
        <PlusIcon aria-hidden="true" className="size-4" />
      </button>
    </div>
  );
}
