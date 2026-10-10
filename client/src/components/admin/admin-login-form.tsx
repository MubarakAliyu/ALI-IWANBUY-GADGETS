"use client";

import { useState } from "react";
import { adminLoginSchema, type AdminLoginInput } from "@aib/shared";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { AlertCircleIcon, ShieldCheckIcon } from "lucide-react";
import { PasswordInput } from "@/components/account/password-input";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { adminLogin } from "@/lib/admin";
import { ApiRequestError } from "@/lib/api";

/**
 * Staff sign-in (A-1).
 *
 * Where it sends them afterwards depends on what the account still owes: an admin carrying the password the
 * owner set has to choose their own first, and an OWNER or MANAGER without a payment PIN has to set one
 * before they can confirm any money. Both are full navigations, for the same reason the storefront's are —
 * every server component has to re-render as the signed-in admin.
 */
export function AdminLoginForm() {
  const [formError, setFormError] = useState<string | null>(null);

  const form = useForm<AdminLoginInput>({
    resolver: zodResolver(adminLoginSchema),
    defaultValues: { email: "", password: "" },
  });

  async function onSubmit(values: AdminLoginInput) {
    setFormError(null);
    try {
      const result = await adminLogin(values);

      if (result.mustChangePassword) {
        window.location.assign("/admin/choose-password");
        return;
      }
      if (result.mustSetPin) {
        window.location.assign("/admin/set-pin");
        return;
      }
      window.location.assign("/admin");
    } catch (error) {
      setFormError(
        error instanceof ApiRequestError
          ? error.message
          : "We could not sign you in. Please check your connection and try again.",
      );
    }
  }

  return (
    <div className="grid gap-6">
      <div className="grid gap-2">
        <p className="inline-flex items-center gap-2 text-caption font-semibold tracking-wide text-brand-primary uppercase">
          <ShieldCheckIcon aria-hidden="true" className="size-4" />
          Staff only
        </p>
        <h1 className="text-h1 text-brand-navy">Dashboard sign-in</h1>
        <p className="text-body-sm text-text-muted">
          Use the account the owner set up for you. Every action you take is recorded against your name.
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
        <Field label="Work email" error={form.formState.errors.email?.message}>
          {(control) => (
            <Input
              {...control}
              {...form.register("email")}
              type="email"
              autoComplete="username"
              placeholder="you@aliiwanbuy.com"
            />
          )}
        </Field>

        <Field label="Password" error={form.formState.errors.password?.message}>
          {(control) => (
            <PasswordInput {...control} {...form.register("password")} autoComplete="current-password" />
          )}
        </Field>

        <Button type="submit" size="hero" loading={form.formState.isSubmitting} loadingLabel="Signing in…">
          Sign in
        </Button>
      </form>

      <p className="text-caption text-text-muted">
        Forgotten your password? Ask the owner to reset it — for safety, staff passwords are not reset by
        email.
      </p>
    </div>
  );
}
