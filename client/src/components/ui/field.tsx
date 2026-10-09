"use client";

import * as React from "react";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/cn";

export type FieldControlProps = {
  id: string;
  "aria-invalid": boolean | undefined;
  "aria-describedby": string | undefined;
};

type FieldProps = {
  /** Visible label, rendered above the control. */
  label: React.ReactNode;
  /** Helper text under the control, in 12px muted. */
  hint?: React.ReactNode;
  /** Error message; when set, the control is marked invalid and described by it. */
  error?: React.ReactNode;
  id?: string;
  className?: string;
  /** Receives the id and ARIA wiring to spread onto the control. */
  children: (control: FieldControlProps) => React.ReactNode;
};

/**
 * Label, control, helper and error with the ids wired correctly by construction: the control gets
 * `aria-invalid` and an `aria-describedby` that only references messages that are actually rendered.
 */
export function Field({ label, hint, error, id, className, children }: FieldProps) {
  const generatedId = React.useId();
  const controlId = id ?? generatedId;
  const hintId = hint ? `${controlId}-hint` : undefined;
  const errorId = error ? `${controlId}-error` : undefined;
  const describedBy = [errorId, hintId].filter(Boolean).join(" ") || undefined;

  return (
    <div data-slot="field" className={cn("grid content-start gap-1.5", className)}>
      <Label htmlFor={controlId}>{label}</Label>
      {children({
        id: controlId,
        "aria-invalid": error ? true : undefined,
        "aria-describedby": describedBy,
      })}
      {error ? (
        <p id={errorId} data-slot="field-error" className="text-caption text-danger">
          {error}
        </p>
      ) : null}
      {hint ? (
        <p id={hintId} data-slot="field-hint" className="text-caption text-text-muted">
          {hint}
        </p>
      ) : null}
    </div>
  );
}
