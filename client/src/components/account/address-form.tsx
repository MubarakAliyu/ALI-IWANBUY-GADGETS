"use client";

import { addressSchema, NIGERIAN_STATES, type Address, type AddressInput } from "@aib/shared";
import { zodResolver } from "@hookform/resolvers/zod";
import { Controller, useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

/**
 * One address form, used by the address book and by checkout (S-12, S-9). The state is a select of the 36
 * states and the FCT, because a delivery address with a typed-in state is a delivery that goes astray.
 */
export function AddressForm({
  address,
  submitLabel = "Save address",
  showDefaultToggle = true,
  onSubmit,
  onCancel,
}: {
  address?: Address;
  submitLabel?: string;
  showDefaultToggle?: boolean;
  onSubmit: (values: AddressInput) => Promise<void>;
  onCancel?: () => void;
}) {
  const form = useForm<AddressInput>({
    resolver: zodResolver(addressSchema),
    defaultValues: {
      label: address?.label ?? "",
      fullName: address?.fullName ?? "",
      phone: address?.phone ?? "",
      line1: address?.line1 ?? "",
      line2: address?.line2 ?? "",
      city: address?.city ?? "",
      state: address?.state ?? "Kebbi",
      landmark: address?.landmark ?? "",
      isDefault: address?.isDefault ?? false,
    },
  });

  return (
    <form noValidate onSubmit={form.handleSubmit(onSubmit)} className="grid gap-4">
      <Field label="Full name" error={form.formState.errors.fullName?.message}>
        {(control) => <Input {...control} {...form.register("fullName")} autoComplete="name" />}
      </Field>

      <Field label="Phone" error={form.formState.errors.phone?.message}>
        {(control) => (
          <Input {...control} {...form.register("phone")} inputMode="tel" placeholder="0803 925 4143" />
        )}
      </Field>

      <Field label="Address" error={form.formState.errors.line1?.message}>
        {(control) => (
          <Input
            {...control}
            {...form.register("line1")}
            autoComplete="address-line1"
            placeholder="House number and street"
          />
        )}
      </Field>

      <Field label="Apartment, suite (optional)" error={form.formState.errors.line2?.message}>
        {(control) => <Input {...control} {...form.register("line2")} autoComplete="address-line2" />}
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="City or town" error={form.formState.errors.city?.message}>
          {(control) => <Input {...control} {...form.register("city")} autoComplete="address-level2" />}
        </Field>

        <div className="grid content-start gap-1.5">
          <Label htmlFor="address-state">State</Label>
          <Controller
            control={form.control}
            name="state"
            render={({ field }) => (
              <Select value={field.value} onValueChange={field.onChange}>
                <SelectTrigger
                  id="address-state"
                  ref={field.ref}
                  onBlur={field.onBlur}
                  aria-invalid={form.formState.errors.state ? true : undefined}
                >
                  <SelectValue placeholder="Choose a state" />
                </SelectTrigger>
                <SelectContent>
                  {NIGERIAN_STATES.map((state) => (
                    <SelectItem key={state} value={state}>
                      {state}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          />
          {form.formState.errors.state ? (
            <p className="text-caption text-danger">{form.formState.errors.state.message}</p>
          ) : null}
        </div>
      </div>

      <Field
        label="Landmark (optional)"
        hint="Something nearby that helps the rider find you."
        error={form.formState.errors.landmark?.message}
      >
        {(control) => <Input {...control} {...form.register("landmark")} />}
      </Field>

      <Field label="Label (optional)" error={form.formState.errors.label?.message}>
        {(control) => <Input {...control} {...form.register("label")} placeholder="Home, Shop, Office" />}
      </Field>

      {showDefaultToggle ? (
        <div className="flex items-center gap-2">
          <Controller
            control={form.control}
            name="isDefault"
            render={({ field }) => (
              <Checkbox
                id="address-default"
                checked={field.value === true}
                onCheckedChange={(checked) => field.onChange(checked === true)}
              />
            )}
          />
          <Label htmlFor="address-default" className="font-normal">
            Use this as my default address
          </Label>
        </div>
      ) : null}

      <div className="flex flex-wrap gap-2">
        <Button type="submit" loading={form.formState.isSubmitting} loadingLabel="Saving…">
          {submitLabel}
        </Button>
        {onCancel ? (
          <Button type="button" variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
        ) : null}
      </div>
    </form>
  );
}
