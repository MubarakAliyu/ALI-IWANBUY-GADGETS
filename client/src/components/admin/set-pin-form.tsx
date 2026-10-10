"use client";

import { useState } from "react";
import { setPinSchema, type SetPinInput } from "@aib/shared";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { AlertCircleIcon, LockKeyholeIcon } from "lucide-react";
import { PasswordInput } from "@/components/account/password-input";
import { PinInput } from "@/components/admin/pin-input";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { setOwnPin } from "@/lib/admin";
import { ApiRequestError } from "@/lib/api";

/**
 * Choosing the payment PIN (A-1, §6.5).
 *
 * The PIN is the second thing asked for whenever money moves, so it must not be the password and must not be
 * guessable — the shared schema refuses runs like 1234 and repeated digits before the request is even sent.
 * Setting the first one is authorised by the account password; changing it later needs the current PIN.
 */
export function SetPinForm({ mode }: { mode: "first" | "change" }) {
  const [formError, setFormError] = useState<string | null>(null);
  const first = mode === "first";

  const form = useForm<SetPinInput>({
    resolver: zodResolver(setPinSchema),
    defaultValues: { pin: "", confirmPin: "", password: "", currentPin: "" },
  });

  async function onSubmit(values: SetPinInput) {
    setFormError(null);
    try {
      await setOwnPin({
        pin: values.pin,
        confirmPin: values.confirmPin,
        ...(first ? { password: values.password } : { currentPin: values.currentPin }),
      });
      window.location.assign(first ? "/admin" : "/admin/account");
    } catch (error) {
      setFormError(
        error instanceof ApiRequestError ? error.message : "We could not save your PIN. Please try again.",
      );
    }
  }

  return (
    <div className="grid gap-6">
      <div className="grid gap-2">
        <p className="inline-flex items-center gap-2 text-caption font-semibold tracking-wide text-brand-primary uppercase">
          <LockKeyholeIcon aria-hidden="true" className="size-4" />
          Payment PIN
        </p>
        <h1 className="text-h1 text-brand-navy">{first ? "Set your payment PIN" : "Change your PIN"}</h1>
        <p className="text-body-sm text-text-muted">
          You will be asked for this again whenever money moves — confirming a payment, cancelling an order
          that has been paid for, or issuing a refund. Four to six digits, and not your date of birth.
        </p>
      </div>

      {formError ? (
        <p
          role="alert"
          className="flex items-start gap-2 rounded-md border border-danger-border bg-danger-tint p-3 text-body-sm text-danger-text"
        >
          <AlertCircleIcon aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
          {formError}
        </p>
      ) : null}

      <form noValidate onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4">
        {first ? (
          <Field
            label="Your password"
            hint="So that nobody who finds your screen unlocked can set a PIN for you."
            error={form.formState.errors.password?.message}
          >
            {(control) => (
              <PasswordInput {...control} {...form.register("password")} autoComplete="current-password" />
            )}
          </Field>
        ) : (
          <Field label="Your current PIN" error={form.formState.errors.currentPin?.message}>
            {(control) => <PinInput {...control} {...form.register("currentPin")} />}
          </Field>
        )}

        <Field label="New PIN" error={form.formState.errors.pin?.message}>
          {(control) => <PinInput {...control} {...form.register("pin")} />}
        </Field>

        <Field label="Confirm your new PIN" error={form.formState.errors.confirmPin?.message}>
          {(control) => <PinInput {...control} {...form.register("confirmPin")} />}
        </Field>

        <Button type="submit" size="hero" loading={form.formState.isSubmitting} loadingLabel="Saving…">
          Save my PIN
        </Button>
      </form>
    </div>
  );
}
