"use client";

import { useState } from "react";
import {
  changePasswordSchema,
  profileSchema,
  type ChangePasswordInput,
  type ProfileInput,
} from "@aib/shared";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { LockIcon } from "lucide-react";
import { toast } from "sonner";
import { AddressBook } from "@/components/account/address-book";
import { PasswordInput } from "@/components/account/password-input";
import { useSession } from "@/components/account/session-provider";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { changePassword, updateProfile } from "@/lib/account";
import { ApiRequestError } from "@/lib/api";

/** Account settings (S-12): profile, addresses and password, in three tabs. */
export function SettingsView() {
  const { customer, isLoading, refresh } = useSession();

  if (isLoading || !customer) {
    return (
      <div className="grid gap-4">
        <Skeleton className="h-10 w-64" />
        <Skeleton className="h-64 w-full" />
      </div>
    );
  }

  return (
    <Tabs defaultValue="profile">
      <TabsList>
        <TabsTrigger value="profile">Profile</TabsTrigger>
        <TabsTrigger value="addresses">Addresses</TabsTrigger>
        <TabsTrigger value="password">Password</TabsTrigger>
      </TabsList>

      <TabsContent value="profile">
        <ProfileForm customer={customer} onSaved={refresh} />
      </TabsContent>

      <TabsContent value="addresses">
        <AddressBook addresses={customer.addresses} onChanged={refresh} />
      </TabsContent>

      <TabsContent value="password">
        <PasswordForm />
      </TabsContent>
    </Tabs>
  );
}

function ProfileForm({
  customer,
  onSaved,
}: {
  customer: NonNullable<ReturnType<typeof useSession>["customer"]>;
  onSaved: () => Promise<void>;
}) {
  const form = useForm<ProfileInput>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      firstName: customer.firstName,
      lastName: customer.lastName,
      phone: customer.phone,
    },
  });

  async function onSubmit(values: ProfileInput) {
    try {
      await updateProfile(values);
      await onSaved();
      toast.success("Your details are saved");
    } catch (error) {
      toast.error(
        error instanceof ApiRequestError ? error.message : "We could not save that. Please try again.",
      );
    }
  }

  return (
    <form noValidate onSubmit={form.handleSubmit(onSubmit)} className="grid max-w-lg gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="First name" error={form.formState.errors.firstName?.message}>
          {(control) => <Input {...control} {...form.register("firstName")} autoComplete="given-name" />}
        </Field>
        <Field label="Last name" error={form.formState.errors.lastName?.message}>
          {(control) => <Input {...control} {...form.register("lastName")} autoComplete="family-name" />}
        </Field>
      </div>

      <Field
        label="Phone"
        hint="We use this to reach you about a delivery."
        error={form.formState.errors.phone?.message}
      >
        {(control) => (
          <Input {...control} {...form.register("phone")} inputMode="tel" placeholder="0803 925 4143" />
        )}
      </Field>

      {/* The email identifies every order on the account, so it is shown and not offered (AC2.1). */}
      <div className="grid gap-1.5">
        <Label htmlFor="account-email">
          Email address
          <LockIcon aria-hidden="true" className="size-3.5 text-text-muted" />
        </Label>
        <Input
          id="account-email"
          value={customer.email}
          readOnly
          disabled
          data-testid="email-readonly"
          aria-describedby="email-note"
        />
        <p id="email-note" className="text-caption text-text-muted">
          Your email can&apos;t be changed. Call the shop if it is wrong.
        </p>
      </div>

      <div>
        <Button type="submit" loading={form.formState.isSubmitting} loadingLabel="Saving…">
          Save changes
        </Button>
      </div>
    </form>
  );
}

function PasswordForm() {
  const [done, setDone] = useState(false);
  const form = useForm<ChangePasswordInput>({
    resolver: zodResolver(changePasswordSchema),
    defaultValues: { currentPassword: "", newPassword: "", confirmPassword: "" },
  });

  async function onSubmit(values: ChangePasswordInput) {
    try {
      await changePassword(values);
      form.reset();
      setDone(true);
      toast.success("Your password is changed", { description: "Any other devices have been signed out." });
    } catch (error) {
      if (error instanceof ApiRequestError && error.code === "WRONG_PASSWORD") {
        form.setError("currentPassword", { message: "That is not your current password" });
        return;
      }
      toast.error(
        error instanceof ApiRequestError
          ? error.message
          : "We could not change your password. Please try again.",
      );
    }
  }

  return (
    <form noValidate onSubmit={form.handleSubmit(onSubmit)} className="grid max-w-lg gap-4">
      <Field label="Current password" error={form.formState.errors.currentPassword?.message}>
        {(control) => (
          <PasswordInput {...control} {...form.register("currentPassword")} autoComplete="current-password" />
        )}
      </Field>

      <Field
        label="New password"
        hint="At least 8 characters, with a letter and a number."
        error={form.formState.errors.newPassword?.message}
      >
        {(control) => (
          <PasswordInput {...control} {...form.register("newPassword")} autoComplete="new-password" />
        )}
      </Field>

      <Field label="Confirm new password" error={form.formState.errors.confirmPassword?.message}>
        {(control) => (
          <PasswordInput {...control} {...form.register("confirmPassword")} autoComplete="new-password" />
        )}
      </Field>

      {done ? (
        <p role="status" className="rounded-md bg-success-tint p-3 text-body-sm text-success-text">
          Your password is changed. You are still signed in here; any other device will have to sign in again.
        </p>
      ) : null}

      <div>
        <Button type="submit" loading={form.formState.isSubmitting} loadingLabel="Changing…">
          Change password
        </Button>
      </div>
    </form>
  );
}
