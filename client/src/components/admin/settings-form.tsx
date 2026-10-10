"use client";

import { useState } from "react";
import type { StoreSettingsInput } from "@aib/shared";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { AlertCircleIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { updateStoreSettings, type StoreSettings } from "@/lib/admin";
import { ApiRequestError } from "@/lib/api";
import { formatNairaPlain, parseNairaToKobo } from "@/lib/money";
import { useUnsavedGuard } from "./use-unsaved-guard";

/**
 * Store settings (A-12, owner only).
 *
 * This one form is where the shop's own details live: the footer on the storefront, the bank account at
 * checkout and the company block on every invoice all read from it. Which is why the page says so, and why
 * every change is audited field by field.
 *
 * Fees are typed in naira and held as integer kobo — the same one-way conversion the product editor uses.
 */
export function SettingsForm({ settings }: { settings: StoreSettings }) {
  const router = useRouter();
  const [values, setValues] = useState<StoreSettingsInput>(strip(settings));
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  useUnsavedGuard(dirty && !saving);

  function set<K extends keyof StoreSettingsInput>(key: K, value: StoreSettingsInput[K]) {
    setDirty(true);
    setValues((previous) => ({ ...previous, [key]: value }));
  }

  async function save() {
    setSaving(true);
    setError(null);
    setFieldErrors({});
    try {
      await updateStoreSettings(values);
      setDirty(false);
      toast.success("Store settings saved", { description: "The storefront and invoices use them now." });
      router.refresh();
    } catch (caught) {
      if (caught instanceof ApiRequestError) {
        setError(caught.message);
        setFieldErrors(
          Object.fromEntries((caught.fields ?? []).map((field) => [field.path, field.message])),
        );
      } else {
        setError("We could not save those settings.");
      }
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="grid gap-5 pb-24">
      {error ? (
        <p
          role="alert"
          className="flex items-start gap-2 rounded-md border border-danger-border bg-danger-tint p-3 text-body-sm text-danger-text"
        >
          <AlertCircleIcon aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
          {error}
        </p>
      ) : null}

      <Section title="Business" description="What the law and the invoice call the company.">
        <div className="grid gap-4 sm:grid-cols-2">
          <Text label="Shop name" value={values.storeName} error={fieldErrors.storeName} onChange={(v) => set("storeName", v)} />
          <Text label="Registered name" value={values.legalName} error={fieldErrors.legalName} onChange={(v) => set("legalName", v)} />
          <Text label="RC number" value={values.rcNumber} onChange={(v) => set("rcNumber", v)} />
          <Text label="TIN" value={values.tin} onChange={(v) => set("tin", v)} />
          <Text
            label="Registered address"
            hint="Printed on invoices."
            className="sm:col-span-2"
            value={values.registeredAddress}
            error={fieldErrors.registeredAddress}
            onChange={(v) => set("registeredAddress", v)}
          />
          <Text
            label="Shop address"
            hint="Where customers collect their orders."
            className="sm:col-span-2"
            value={values.shopAddress}
            error={fieldErrors.shopAddress}
            onChange={(v) => set("shopAddress", v)}
          />
        </div>
      </Section>

      <Section title="Contact" description="Shown in the storefront header, footer and contact page.">
        <div className="grid gap-4 sm:grid-cols-3">
          <Text label="Phone" value={values.phone} error={fieldErrors.phone} onChange={(v) => set("phone", v)} />
          <Text label="WhatsApp" value={values.whatsapp} error={fieldErrors.whatsapp} onChange={(v) => set("whatsapp", v)} />
          <Text label="Email" value={values.email} error={fieldErrors.email} onChange={(v) => set("email", v)} />
        </div>
      </Section>

      <Section
        title="Bank details"
        description="Shown to every customer paying by transfer, and printed on invoices."
      >
        <div className="grid gap-4 sm:grid-cols-3">
          <Text
            label="Bank"
            value={values.bank.bankName}
            onChange={(v) => set("bank", { ...values.bank, bankName: v })}
          />
          <Text
            label="Account name"
            value={values.bank.accountName}
            onChange={(v) => set("bank", { ...values.bank, accountName: v })}
          />
          <Text
            label="Account number"
            value={values.bank.accountNumber}
            error={fieldErrors["bank.accountNumber"]}
            onChange={(v) => set("bank", { ...values.bank, accountNumber: v.replace(/\D/g, "") })}
          />
        </div>
      </Section>

      <Section title="Delivery" description="What delivery costs, and when it is free.">
        <div className="grid gap-4 sm:grid-cols-3">
          <Money
            label="In Birnin Kebbi (₦)"
            kobo={values.deliveryFees.localKobo}
            onChange={(kobo) => set("deliveryFees", { ...values.deliveryFees, localKobo: kobo })}
          />
          <Money
            label="Elsewhere in Nigeria (₦)"
            kobo={values.deliveryFees.nationwideKobo}
            onChange={(kobo) => set("deliveryFees", { ...values.deliveryFees, nationwideKobo: kobo })}
          />
          <Money
            label="Free delivery over (₦)"
            hint="Leave at zero for no free-delivery threshold."
            kobo={values.freeDeliveryThresholdKobo ?? 0}
            onChange={(kobo) => set("freeDeliveryThresholdKobo", kobo === 0 ? null : kobo)}
          />
        </div>
      </Section>

      <Section title="Orders" description="How the shop behaves when nobody pays, and when to warn about stock.">
        <div className="grid gap-4 sm:grid-cols-2">
          <Number
            label="Cancel unpaid orders after (hours)"
            value={values.unpaidAutoCancelHours}
            min={1}
            max={720}
            onChange={(v) => set("unpaidAutoCancelHours", v)}
          />
          <Number
            label="Warn when stock falls to"
            value={values.lowStockDefault}
            min={0}
            max={100}
            onChange={(v) => set("lowStockDefault", v)}
          />
        </div>
      </Section>

      <Section title="Invoices" description="The line printed under the totals on every invoice.">
        <Text
          label="Footer note"
          hint="“Clean. Modern. Reliable.” is printed under this automatically — no need to repeat it."
          value={values.invoiceFooterNote}
          onChange={(v) => set("invoiceFooterNote", v)}
        />
      </Section>

      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-grey-200 bg-white/95 px-4 py-3 backdrop-blur sm:px-6 lg:left-[260px]">
        <div className="flex items-center justify-end gap-3">
          <p aria-live="polite" className="mr-auto text-body-sm text-text-muted">
            {dirty ? "Unsaved changes" : "Everything is saved"}
          </p>
          <Button loading={saving} loadingLabel="Saving…" onClick={() => void save()}>
            Save settings
          </Button>
        </div>
      </div>
    </div>
  );
}

/** Mongo's own fields are not part of the form. */
function strip(settings: StoreSettings): StoreSettingsInput {
  const { _id, ...rest } = settings as StoreSettings & Record<string, unknown>;
  void _id;
  return {
    storeName: rest.storeName,
    legalName: rest.legalName,
    rcNumber: rest.rcNumber,
    tin: rest.tin,
    registeredAddress: rest.registeredAddress,
    shopAddress: rest.shopAddress,
    phone: rest.phone,
    whatsapp: rest.whatsapp,
    email: rest.email,
    bank: rest.bank,
    openingHours: rest.openingHours,
    deliveryFees: rest.deliveryFees,
    freeDeliveryThresholdKobo: rest.freeDeliveryThresholdKobo,
    unpaidAutoCancelHours: rest.unpaidAutoCancelHours,
    lowStockDefault: rest.lowStockDefault,
    invoiceFooterNote: rest.invoiceFooterNote,
  };
}

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="grid gap-4 rounded-lg border border-grey-200 bg-white p-4 sm:p-5">
      <div className="grid gap-0.5">
        <h2 className="text-h3 text-brand-navy">{title}</h2>
        <p className="text-body-sm text-text-muted">{description}</p>
      </div>
      {children}
    </section>
  );
}

function Text({
  label,
  value,
  onChange,
  hint,
  error,
  className,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  hint?: string;
  error?: string;
  className?: string;
}) {
  return (
    <Field label={label} hint={hint} error={error} className={className}>
      {(control) => <Input {...control} value={value} onChange={(event) => onChange(event.target.value)} />}
    </Field>
  );
}

function Number({
  label,
  value,
  min,
  max,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  onChange: (value: number) => void;
}) {
  return (
    <Field label={label}>
      {(control) => (
        <Input
          {...control}
          type="number"
          min={min}
          max={max}
          value={value}
          onChange={(event) => onChange(globalThis.Number(event.target.value) || 0)}
        />
      )}
    </Field>
  );
}

function Money({
  label,
  kobo,
  onChange,
  hint,
}: {
  label: string;
  kobo: number;
  onChange: (kobo: number) => void;
  hint?: string;
}) {
  return (
    <Field label={label} hint={hint}>
      {(control) => (
        <Input
          {...control}
          inputMode="decimal"
          defaultValue={formatNairaPlain(kobo)}
          onBlur={(event) => {
            const cleaned = event.target.value.replace(/[^0-9.]/g, "");
            try {
              onChange(cleaned ? parseNairaToKobo(cleaned) : 0);
            } catch {
              onChange(0);
            }
          }}
        />
      )}
    </Field>
  );
}
