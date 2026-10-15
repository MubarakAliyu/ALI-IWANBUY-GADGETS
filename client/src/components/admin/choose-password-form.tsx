"use client";

import { useState } from "react";
import { adminChangePasswordSchema, type AdminChangePasswordInput } from "@aib/shared";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { AlertCircleIcon, KeyRoundIcon } from "lucide-react";
import { PasswordInput } from "@/components/account/password-input";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { changeAdminPassword } from "@/lib/admin";
import { ApiRequestError } from "@/lib/api";

/**
 * The first thing a new admin does (A-1). The owner creates the account with a password they chose, so until
 * this form is submitted two people know it. The server refuses every other dashboard route in the meantime,
 * and bumps the token version afterwards, which signs out any other browser carrying the old session.
 */
export function ChoosePasswordForm() {
  const [formError, setFormError] = useState<string | null>(null);

  const form = useForm<AdminChangePasswordInput>({
    resolver: zodResolver(adminChangePasswordSchema),
    defaultValues: { currentPassword: "", newPassword: "", confirmPassword: "" },
  });

  async function onSubmit(values: AdminChangePasswordInput) {
    setFormError(null);
    try {
      await changeAdminPassword(values);
      // Changing the password invalidates this session's token, so a full reload re-authenticates cleanly.
      window.location.assign("/admin/set-pin");
    } catch (error) {
      setFormError(
        error instanceof ApiRequestError
          ? error.message
          : "We could not change your password. Please try again.",
      );
    }
  }

  return (
    <div className="grid gap-6">
      <div className="grid gap-2">
        <p className="inline-flex items-center gap-2 text-caption font-semibold tracking-wide text-brand-primary uppercase">
          <KeyRoundIcon aria-hidden="true" className="size-4" />
          One more step
        </p>
        <h1 className="text-h1 text-brand-navy">Choose your own password</h1>
        <p className="text-body-sm text-text-muted">
          You are signed in with the password the owner set up. Choose one only you know — everything you do
          in the dashboard is recorded against your name.
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
        <Field label="The password you were given" error={form.formState.errors.currentPassword?.message}>
          {(control) => (
            <PasswordInput
              {...control}
              {...form.register("currentPassword")}
              autoComplete="current-password"
            />
          )}
        </Field>

        <Field
          label="New password"
          hint="At least 10 characters, with a capital letter and a number."
          error={form.formState.errors.newPassword?.message}
        >
          {(control) => (
            <PasswordInput {...control} {...form.register("newPassword")} autoComplete="new-password" />
          )}
        </Field>

        <Field label="Confirm your new password" error={form.formState.errors.confirmPassword?.message}>
          {(control) => (
            <PasswordInput {...control} {...form.register("confirmPassword")} autoComplete="new-password" />
          )}
        </Field>

        <Button type="submit" size="hero" loading={form.formState.isSubmitting} loadingLabel="Saving…">
          Save and continue
        </Button>
      </form>
    </div>
  );
}
