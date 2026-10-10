"use client";

import { forwardRef, useState } from "react";
import { PIN_MAX_LENGTH } from "@aib/shared";
import { EyeIcon, EyeOffIcon } from "lucide-react";
import { Input, type InputProps } from "@/components/ui/input";
import { cn } from "@/lib/cn";

/**
 * The payment PIN field (A-4).
 *
 * Masked by default, because it is typed at a counter with a customer standing there, with a toggle for when
 * someone needs to check what they entered. `inputMode="numeric"` brings up the number pad on a phone, and
 * non-digits are dropped as they are typed rather than being rejected after the fact.
 *
 * It is one input rather than a row of single-character boxes: a screen reader announces one labelled field
 * correctly, and a password manager does not try to fill four of them.
 */
export const PinInput = forwardRef<HTMLInputElement, Omit<InputProps, "type">>(function PinInput(
  { className, onChange, ...props },
  ref,
) {
  const [visible, setVisible] = useState(false);

  return (
    <div className="relative">
      <Input
        {...props}
        ref={ref}
        type={visible ? "text" : "password"}
        inputMode="numeric"
        autoComplete="off"
        maxLength={PIN_MAX_LENGTH}
        placeholder="••••"
        onChange={(event) => {
          event.target.value = event.target.value.replace(/\D/g, "").slice(0, PIN_MAX_LENGTH);
          onChange?.(event);
        }}
        className={cn(
          "h-14 pr-11 text-center font-semibold tracking-[0.5em] tabular-nums",
          visible ? "text-h2" : "text-h1",
          className,
        )}
      />
      <button
        type="button"
        onClick={() => setVisible((shown) => !shown)}
        aria-label={visible ? "Hide PIN" : "Show PIN"}
        className="absolute top-1/2 right-1 inline-flex size-10 -translate-y-1/2 items-center justify-center rounded-sm text-text-muted hover:bg-grey-100 hover:text-brand-navy focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:outline-none"
      >
        {visible ? (
          <EyeOffIcon aria-hidden="true" className="size-4" />
        ) : (
          <EyeIcon aria-hidden="true" className="size-4" />
        )}
      </button>
    </div>
  );
});
