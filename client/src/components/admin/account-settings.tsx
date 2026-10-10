"use client";

import { useState } from "react";
import type { Admin } from "@aib/shared";
import { ADMIN_ROLE_DESCRIPTION, ADMIN_ROLE_LABEL, adminProfileSchema, type AdminProfileInput } from "@aib/shared";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { LockKeyholeIcon } from "lucide-react";
import { ChoosePasswordForm } from "@/components/admin/choose-password-form";
import { SetPinForm } from "@/components/admin/set-pin-form";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { updateAdminProfile } from "@/lib/admin";
import { ApiRequestError } from "@/lib/api";

/**
 * An admin's own account (A-11).
 *
 * The email is shown but cannot be edited: it identifies this person in every audit row ever written, so
 * changing it would quietly rewrite who did what. A new email means a new account, which is the owner's job.
 */
export function AccountSettings({ admin }: { admin: Admin }) {
  const router = useRouter();
  const [changing, setChanging] = useState<"password" | "pin" | null>(null);

  const form = useForm<AdminProfileInput>({
    resolver: zodResolver(adminProfileSchema),
    defaultValues: { firstName: admin.firstName, lastName: admin.lastName, phone: admin.phone },
  });

  async function onSubmit(values: AdminProfileInput) {
    try {
      await updateAdminProfile(values);
      toast.success("Your details are saved");
      router.refresh();
    } catch (error) {
      toast.error(error instanceof ApiRequestError ? error.message : "We could not save that.");
    }
  }

  return (
    <div className="grid gap-5">
      <Section title="Your details">
        <form noValidate onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="First name" error={form.formState.errors.firstName?.message}>
              {(control) => <Input {...control} {...form.register("firstName")} />}
            </Field>
            <Field label="Last name" error={form.formState.errors.lastName?.message}>
              {(control) => <Input {...control} {...form.register("lastName")} />}
            </Field>
          </div>

          <Field label="Phone" error={form.formState.errors.phone?.message}>
            {(control) => <Input {...control} {...form.register("phone")} />}
          </Field>

          <Field
            label="Email"
            hint="This is how you are named in every audit row, so it cannot be changed. Ask the owner for a new account if you need a different address."
          >
            {(control) => <Input {...control} value={admin.email} readOnly disabled />}
          </Field>

          <Button type="submit" className="w-fit" loading={form.formState.isSubmitting} loadingLabel="Saving…">
            Save my details
          </Button>
        </form>
      </Section>

      <Section title="What you can do">
        <div className="grid gap-1">
          <p className="text-body font-semibold text-brand-navy">{ADMIN_ROLE_LABEL[admin.role]}</p>
          <p className="text-body-sm text-text-muted">{ADMIN_ROLE_DESCRIPTION[admin.role]}</p>
          <p className="mt-2 text-caption text-text-muted">
            Only the owner can change this. If you need more access, ask them.
          </p>
        </div>
      </Section>

      <Section title="Password">
        <p className="text-body-sm text-text-muted">
          Choose something only you know. Changing it signs you out of every other browser.
        </p>
        <Button variant="outline" className="w-fit" onClick={() => setChanging("password")}>
          Change my password
        </Button>
      </Section>

      {admin.role === "STAFF" ? null : (
        <Section title="Payment PIN">
          <p className="text-body-sm text-text-muted">
            Asked for whenever money moves — confirming a payment, cancelling a paid order, or a refund.
            {admin.hasPin ? "" : " You have not set one yet, so you cannot confirm any payments."}
          </p>
          <Button
            variant={admin.hasPin ? "outline" : "primary"}
            className="w-fit"
            onClick={() => setChanging("pin")}
          >
            <LockKeyholeIcon aria-hidden="true" className="size-4" />
            {admin.hasPin ? "Change my PIN" : "Set my PIN"}
          </Button>
        </Section>
      )}

      <Dialog open={changing !== null} onOpenChange={(open) => (open ? null : setChanging(null))}>
        <DialogContent className="max-h-[85dvh] overflow-y-auto">
          <DialogHeader className="sr-only">
            <DialogTitle>{changing === "pin" ? "Change your PIN" : "Change your password"}</DialogTitle>
          </DialogHeader>
          {changing === "pin" ? (
            <SetPinForm mode={admin.hasPin ? "change" : "first"} />
          ) : changing === "password" ? (
            <ChoosePasswordForm />
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="grid content-start gap-3 rounded-lg border border-grey-200 bg-white p-4 sm:p-5">
      <h2 className="text-h3 text-brand-navy">{title}</h2>
      {children}
    </section>
  );
}
