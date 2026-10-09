"use client";

import { useState } from "react";
import { loginSchema, type LoginInput } from "@aib/shared";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { AlertCircleIcon } from "lucide-react";
import { PasswordInput } from "@/components/account/password-input";
import { useCartSync } from "@/components/account/use-cart-sync";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { login } from "@/lib/account";
import { ApiRequestError } from "@/lib/api";
import { safeNext } from "@/lib/safe-next";

/**
 * Sign in (S-8). The same zod schema the API validates with runs here, so the message a customer reads in the
 * form is the message the server would have given. Where they were going is carried in `?next=`, and only a
 * path on this site is ever honoured.
 */
export function LoginForm() {
  const params = useSearchParams();
  const syncCart = useCartSync();
  const [formError, setFormError] = useState<string | null>(null);

  const next = safeNext(params.get("next"));

  const form = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  async function onSubmit(values: LoginInput) {
    setFormError(null);
    try {
      await login(values);
      await syncCart();

      /**
       * A full navigation, not `router.replace`. While the visitor was signed out the router may have
       * prefetched the page they are heading for and cached the middleware's redirect back to sign-in;
       * replaying that cached answer would bounce them straight back here. Reloading also re-renders every
       * server component as the signed-in customer.
       */
      window.location.assign(next);
    } catch (error) {
      setFormError(
        error instanceof ApiRequestError ? error.message : "We could not sign you in. Please try again.",
      );
    }
  }

  return (
    <div className="grid gap-6">
      <div className="grid gap-2">
        <h1 className="text-h1 text-brand-navy">Welcome back</h1>
        <p className="text-body-sm text-text-muted">Sign in to check out faster and follow your orders.</p>
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
        <Field label="Email address" error={form.formState.errors.email?.message}>
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

        <Field label="Password" error={form.formState.errors.password?.message}>
          {(control) => (
            <PasswordInput {...control} {...form.register("password")} autoComplete="current-password" />
          )}
        </Field>

        <Button type="submit" size="hero" loading={form.formState.isSubmitting} loadingLabel="Signing in…">
          Sign in
        </Button>
      </form>

      <p className="text-body-sm text-text-muted">
        New here?{" "}
        <Link
          href={`/register${next ? `?next=${encodeURIComponent(next)}` : ""}`}
          className="font-semibold text-brand-primary hover:underline"
        >
          Create an account
        </Link>
      </p>
    </div>
  );
}
