"use client";

import { useState } from "react";
import type { Admin, AdminRole, CreateAdminInput } from "@aib/shared";
import { ADMIN_ROLES, ADMIN_ROLE_DESCRIPTION, ADMIN_ROLE_LABEL, createAdminSchema } from "@aib/shared";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { CheckIcon, CopyIcon, KeyRoundIcon, PlusIcon, ShieldAlertIcon } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  createAdminUser,
  resetAdminUserPassword,
  setAdminUserStatus,
  updateAdminUserRole,
} from "@/lib/admin";
import { ApiRequestError } from "@/lib/api";
import { formatDate } from "@/lib/date";

/**
 * Admin users (A-10, owner only).
 *
 * A temporary password is shown **once**, in a dialog the owner copies and hands over in person. It is not
 * emailed, it is not stored anywhere readable, and it stops working as soon as its owner chooses their own —
 * which the server forces at their first sign-in.
 */
export function AdminUsers({ admins, currentId }: { admins: Admin[]; currentId: string }) {
  const router = useRouter();
  const [adding, setAdding] = useState(false);
  const [secret, setSecret] = useState<{ email: string; password: string } | null>(null);
  const [busy, setBusy] = useState<string | null>(null);

  async function changeRole(admin: Admin, role: AdminRole) {
    setBusy(admin.id);
    try {
      await updateAdminUserRole(admin.id, role);
      toast.success(`${admin.firstName} is now ${ADMIN_ROLE_LABEL[role].toLowerCase()}`);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof ApiRequestError ? error.message : "That did not work.");
    } finally {
      setBusy(null);
    }
  }

  async function toggleStatus(admin: Admin) {
    setBusy(admin.id);
    try {
      const next = admin.status === "ACTIVE" ? "SUSPENDED" : "ACTIVE";
      await setAdminUserStatus(admin.id, next);
      toast.success(`${admin.email} ${next === "SUSPENDED" ? "suspended" : "reactivated"}`);
      router.refresh();
    } catch (error) {
      toast.error(error instanceof ApiRequestError ? error.message : "That did not work.");
    } finally {
      setBusy(null);
    }
  }

  async function resetPassword(admin: Admin) {
    setBusy(admin.id);
    try {
      const result = await resetAdminUserPassword(admin.id);
      setSecret({ email: admin.email, password: result.temporaryPassword });
      router.refresh();
    } catch (error) {
      toast.error(error instanceof ApiRequestError ? error.message : "That did not work.");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="grid gap-4">
      <Button className="w-fit" onClick={() => setAdding(true)}>
        <PlusIcon aria-hidden="true" className="size-4" />
        Add someone
      </Button>

      <ul className="grid gap-3">
        {admins.map((admin) => (
          <li
            key={admin.id}
            className="grid gap-3 rounded-lg border border-grey-200 bg-white p-4 sm:flex sm:items-center"
          >
            <div className="grid min-w-0 flex-1 gap-0.5">
              <span className="flex flex-wrap items-center gap-2">
                <span className="font-semibold text-brand-navy">
                  {admin.firstName} {admin.lastName}
                </span>
                {admin.id === currentId ? <Badge variant="pending">You</Badge> : null}
                {admin.status === "SUSPENDED" ? <Badge variant="cancelled">Suspended</Badge> : null}
                {admin.mustChangePassword ? <Badge variant="awaiting">Temporary password</Badge> : null}
                {admin.role !== "STAFF" && !admin.hasPin ? (
                  <Badge variant="awaiting">No PIN yet</Badge>
                ) : null}
              </span>
              <span className="truncate text-caption text-text-muted">
                {admin.email}
                {admin.lastLoginAt ? ` · last in ${formatDate(admin.lastLoginAt)}` : " · never signed in"}
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <label className="sr-only" htmlFor={`role-${admin.id}`}>
                Role for {admin.email}
              </label>
              <select
                id={`role-${admin.id}`}
                value={admin.role}
                disabled={admin.id === currentId || busy === admin.id}
                onChange={(event) => void changeRole(admin, event.target.value as AdminRole)}
                className="h-9 rounded-md border border-grey-200 bg-white px-2 text-body-sm text-brand-navy focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:outline-none disabled:bg-grey-100 disabled:text-grey-500"
              >
                {ADMIN_ROLES.map((role) => (
                  <option key={role} value={role}>
                    {ADMIN_ROLE_LABEL[role]}
                  </option>
                ))}
              </select>

              <Button
                variant="outline"
                size="sm"
                disabled={busy === admin.id}
                onClick={() => void resetPassword(admin)}
              >
                <KeyRoundIcon aria-hidden="true" className="size-4" />
                Reset password
              </Button>

              <Button
                variant="outline"
                size="sm"
                disabled={admin.id === currentId || busy === admin.id}
                onClick={() => void toggleStatus(admin)}
              >
                {admin.status === "ACTIVE" ? "Suspend" : "Reactivate"}
              </Button>
            </div>
          </li>
        ))}
      </ul>

      <AddAdminDialog
        open={adding}
        onClose={() => setAdding(false)}
        onCreated={(email, password) => {
          setAdding(false);
          setSecret({ email, password });
          router.refresh();
        }}
      />

      <SecretDialog secret={secret} onClose={() => setSecret(null)} />
    </div>
  );
}

function AddAdminDialog({
  open,
  onClose,
  onCreated,
}: {
  open: boolean;
  onClose: () => void;
  onCreated: (email: string, password: string) => void;
}) {
  const [error, setError] = useState<string | null>(null);

  const form = useForm<CreateAdminInput>({
    resolver: zodResolver(createAdminSchema),
    defaultValues: { firstName: "", lastName: "", email: "", phone: "", role: "STAFF" },
  });

  async function onSubmit(values: CreateAdminInput) {
    setError(null);
    try {
      const result = await createAdminUser(values);
      form.reset();
      onCreated(result.admin.email, result.temporaryPassword);
    } catch (caught) {
      setError(caught instanceof ApiRequestError ? caught.message : "We could not create that account.");
    }
  }

  return (
    <Dialog open={open} onOpenChange={(next) => (next ? null : onClose())}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Add someone to the dashboard</DialogTitle>
          <DialogDescription>
            They get a temporary password you hand over in person, and have to choose their own the first time
            they sign in.
          </DialogDescription>
        </DialogHeader>

        {error ? (
          <p role="alert" className="rounded-md bg-danger-tint p-3 text-body-sm text-danger-text">
            {error}
          </p>
        ) : null}

        <form noValidate onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="First name" error={form.formState.errors.firstName?.message}>
              {(control) => <Input {...control} {...form.register("firstName")} />}
            </Field>
            <Field label="Last name" error={form.formState.errors.lastName?.message}>
              {(control) => <Input {...control} {...form.register("lastName")} />}
            </Field>
          </div>

          <Field label="Work email" error={form.formState.errors.email?.message}>
            {(control) => <Input {...control} {...form.register("email")} type="email" />}
          </Field>

          <Field label="Phone (optional)" error={form.formState.errors.phone?.message}>
            {(control) => <Input {...control} {...form.register("phone")} />}
          </Field>

          <Field label="What they can do" error={form.formState.errors.role?.message}>
            {(control) => (
              <div className="grid gap-2">
                {ADMIN_ROLES.map((role) => (
                  <label
                    key={role}
                    className="flex cursor-pointer items-start gap-3 rounded-md border border-grey-200 p-3 hover:bg-grey-50"
                  >
                    <input
                      {...(role === "STAFF" ? control : {})}
                      type="radio"
                      value={role}
                      {...form.register("role")}
                      className="mt-0.5 size-4 accent-[#156FBF]"
                    />
                    <span className="grid gap-0.5">
                      <span className="text-body-sm font-semibold text-brand-navy">
                        {ADMIN_ROLE_LABEL[role]}
                      </span>
                      <span className="text-caption text-text-muted">{ADMIN_ROLE_DESCRIPTION[role]}</span>
                    </span>
                  </label>
                ))}
              </div>
            )}
          </Field>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" loading={form.formState.isSubmitting} loadingLabel="Creating…">
              Create the account
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/** Shown once. Closing it is the only way out, and the password cannot be retrieved afterwards. */
function SecretDialog({
  secret,
  onClose,
}: {
  secret: { email: string; password: string } | null;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    if (!secret) {
      return;
    }
    try {
      await navigator.clipboard.writeText(secret.password);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      toast.error("Your browser would not let us copy it. Read it out instead.");
    }
  }

  return (
    <Dialog open={secret !== null} onOpenChange={(open) => (open ? null : onClose())}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Temporary password for {secret?.email}</DialogTitle>
          <DialogDescription>
            This is the only time it is shown. Give it to them in person — it is not in the email they were
            sent, and they must choose their own the first time they sign in.
          </DialogDescription>
        </DialogHeader>

        <div className="flex items-center gap-3 rounded-md border border-grey-200 bg-grey-50 p-4">
          <code className="font-mono flex-1 text-h3 tracking-wide text-brand-navy">{secret?.password}</code>
          <Button variant="outline" onClick={() => void copy()}>
            {copied ? (
              <>
                <CheckIcon aria-hidden="true" className="size-4" />
                Copied
              </>
            ) : (
              <>
                <CopyIcon aria-hidden="true" className="size-4" />
                Copy
              </>
            )}
          </Button>
        </div>

        <p className="flex items-start gap-2 rounded-md bg-warning-tint p-3 text-body-sm text-warning-text">
          <ShieldAlertIcon aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
          Do not send this over WhatsApp. A password in a chat is a password that stays there.
        </p>

        <DialogFooter>
          <Button onClick={onClose}>I have handed it over</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
