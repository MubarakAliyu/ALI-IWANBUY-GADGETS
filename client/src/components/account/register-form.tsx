"use client";

import { useState } from "react";
import { registerSchema, type RegisterInput } from "@aib/shared";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { AlertCircleIcon } from "lucide-react";
import { PasswordInput } from "@/components/account/password-input";
import { useCartSync } from "@/components/account/use-cart-sync";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { register as createAccount } from "@/lib/account";
import { ApiRequestError } from "@/lib/api";
import { safeNext } from "@/lib/safe-next";

/**
 * Create an account (S-8): one screen, then straight back to whatever they were doing. The cart they built as
 * a guest is merged into the new account before they land.
 */
export function RegisterForm() {
  const params = useSearchParams();
  const syncCart = useCartSync();
  const [formError, setFormError] = useState<string | null>(null);

  const next = safeNext(params.get("next"));

  const form = useForm<RegisterInput>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      firstName: "",
      lastName: "",
      email: "",
      password: "",
      confirmPassword: "",
      acceptTerms: false as unknown as true,
    },
  });

  async function onSubmit(values: RegisterInput) {
    setFormError(null);
    try {
      await createAccount(values);
      await syncCart();

      /**
       * A full navigation, not `router.replace`. While the visitor was signed out the router may have
       * prefetched the page they are heading for and cached the middleware's redirect back to sign-in;
       * replaying that cached answer would bounce them straight back here. Reloading also re-renders every
       * server component as the signed-in customer.
       */
      window.location.assign(next);
    } catch (error) {
      if (error instanceof ApiRequestError && error.code === "EMAIL_TAKEN") {
        form.setError("email", { message: "This email already has an account" });
      }
      setFormError(
        error instanceof ApiRequestError
          ? error.message
          : "We could not create your account. Please try again.",
      );
    }
  }

  return (
    <div className="grid gap-6">
      <div className="grid gap-2">
        <h1 className="text-h1 text-brand-navy">Create your account</h1>
        <p className="text-body-sm text-text-muted">It takes a minute, and your cart comes with you.</p>
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
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="First name" error={form.formState.errors.firstName?.message}>
            {(control) => <Input {...control} {...form.register("firstName")} autoComplete="given-name" />}
          </Field>
          <Field label="Last name" error={form.formState.errors.lastName?.message}>
            {(control) => <Input {...control} {...form.register("lastName")} autoComplete="family-name" />}
          </Field>
        </div>

        <Field
          label="Email address"
          hint="You will use this to sign in. It cannot be changed later."
          error={form.formState.errors.email?.message}
        >
          {(control) => (
            <Input
              {...control}
              {...form.register("email")}
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
            />
          )}
        </Field>

        <Field
          label="Password"
          hint="At least 8 characters, with a letter and a number."
          error={form.formState.errors.password?.message}
        >
          {(control) => (
            <PasswordInput {...control} {...form.register("password")} autoComplete="new-password" />
          )}
        </Field>

        <Field label="Confirm password" error={form.formState.errors.confirmPassword?.message}>
          {(control) => (
            <PasswordInput {...control} {...form.register("confirmPassword")} autoComplete="new-password" />
          )}
        </Field>

        <div className="grid gap-1.5">
          <div className="flex items-start gap-2">
            <Controller
              control={form.control}
              name="acceptTerms"
              render={({ field }) => (
                <Checkbox
                  id="accept-terms"
                  checked={field.value === true}
                  onCheckedChange={(checked) => field.onChange(checked === true)}
                  aria-invalid={form.formState.errors.acceptTerms ? true : undefined}
                />
              )}
            />
            <Label htmlFor="accept-terms" className="font-normal">
              <span>
                I accept the{" "}
                <Link href="/terms" className="text-brand-primary underline underline-offset-4">
                  terms
                </Link>{" "}
                and the{" "}
                <Link href="/privacy" className="text-brand-primary underline underline-offset-4">
                  privacy policy
                </Link>
                .
              </span>
            </Label>
          </div>
          {form.formState.errors.acceptTerms ? (
            <p className="text-caption text-danger">{form.formState.errors.acceptTerms.message}</p>
          ) : null}
        </div>

        <Button type="submit" size="hero" loading={form.formState.isSubmitting} loadingLabel="Creating…">
          Create account
        </Button>
      </form>

      <p className="text-body-sm text-text-muted">
        Already have an account?{" "}
        <Link
          href={`/login${next ? `?next=${encodeURIComponent(next)}` : ""}`}
          className="font-semibold text-brand-primary hover:underline"
        >
          Sign in
        </Link>
      </p>
    </div>
  );
}
