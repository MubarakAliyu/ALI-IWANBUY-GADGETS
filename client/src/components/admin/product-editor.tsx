"use client";

import { useState } from "react";
import type { ProductInput, VariantInput } from "@aib/shared";
import { PRODUCT_CONDITION, CONDITION_LABEL, PRODUCT_STATUS, PRODUCT_STATUS_LABEL } from "@aib/shared";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { AlertCircleIcon, ArrowLeftIcon, ExternalLinkIcon } from "lucide-react";
import { ProductImages, type EditorImage } from "@/components/admin/product-images";
import { VariantsEditor } from "@/components/admin/variants-editor";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import {
  createProduct,
  updateProduct,
  type AdminProduct,
  type BrandRow,
  type CategoryRow,
} from "@/lib/admin";
import { ApiRequestError } from "@/lib/api";
import { useUnsavedGuard } from "./use-unsaved-guard";

/**
 * The product editor (A-5), in the sections the brief asks for: Details, Media, Variants, Organisation and
 * Visibility, with a save bar that stays in view.
 *
 * It is one plain form rather than react-hook-form: the variants array and the image list are edited by their
 * own components with their own buttons, and threading a field array through a form library to gain validation
 * messages that the server sends anyway would be more machinery than it is worth. The shared schema still
 * decides — the server validates with it, and its messages are what this shows.
 */
export function ProductEditor({
  product,
  categories,
  brands,
}: {
  product: AdminProduct | null;
  categories: CategoryRow[];
  brands: BrandRow[];
}) {
  const router = useRouter();
  const editing = product !== null;

  const [name, setName] = useState(product?.name ?? "");
  const [brand, setBrand] = useState(product?.brand ?? brands[0]?.id ?? "");
  const [category, setCategory] = useState(product?.category ?? categories[0]?.id ?? "");
  const [shortDescription, setShortDescription] = useState(product?.shortDescription ?? "");
  const [description, setDescription] = useState(product?.description ?? "");
  const [highlights, setHighlights] = useState((product?.highlights ?? []).join("\n"));
  const [specs, setSpecs] = useState(
    (product?.specs ?? []).map((spec) => `${spec.label}: ${spec.value}`).join("\n"),
  );
  const [images, setImages] = useState<EditorImage[]>(
    (product?.images ?? []).map((image) => ({ url: image.url, alt: image.alt })),
  );
  const [condition, setCondition] = useState<ProductInput["condition"]>(product?.condition ?? "NEW");
  const [warrantyMonths, setWarrantyMonths] = useState(product?.warrantyMonths ?? 12);
  const [tags, setTags] = useState((product?.tags ?? []).join(", "));
  const [isFeatured, setIsFeatured] = useState(product?.isFeatured ?? false);
  const [isNewArrival, setIsNewArrival] = useState(product?.isNewArrival ?? false);
  const [status, setStatus] = useState<ProductInput["status"]>(product?.status ?? "DRAFT");
  const [variants, setVariants] = useState<VariantInput[]>(
    product?.variants.map((variant) => ({
      id: variant._id,
      sku: variant.sku,
      label: variant.label,
      attributes: variant.attributes,
      priceKobo: variant.priceKobo,
      compareAtPriceKobo: variant.compareAtPriceKobo,
      stock: variant.stock,
      lowStockThreshold: variant.lowStockThreshold,
      isActive: variant.isActive,
    })) ?? [
      {
        sku: "",
        label: "",
        attributes: { storage: null, colour: null, ram: null },
        priceKobo: 0,
        compareAtPriceKobo: null,
        stock: 0,
        lowStockThreshold: 3,
        isActive: true,
      },
    ],
  );

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [dirty, setDirty] = useState(false);

  useUnsavedGuard(dirty && !saving);

  /** Every edit marks the form dirty, which is what the leave-the-page warning reads. */
  function touch<T>(setter: (value: T) => void) {
    return (value: T) => {
      setDirty(true);
      setter(value);
    };
  }

  async function save() {
    setSaving(true);
    setError(null);
    setFieldErrors({});

    const payload: ProductInput = {
      name: name.trim(),
      brand,
      category,
      shortDescription: shortDescription.trim(),
      description: description.trim(),
      highlights: highlights
        .split("\n")
        .map((line) => line.trim())
        .filter(Boolean),
      specs: specs
        .split("\n")
        .map((line) => line.split(/:(.*)/s))
        .filter((parts) => parts.length > 1)
        .map((parts) => ({ label: (parts[0] ?? "").trim(), value: (parts[1] ?? "").trim() })),
      images,
      condition,
      warrantyMonths,
      tags: tags
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean),
      isFeatured,
      isNewArrival,
      status,
      variants,
    };

    try {
      const saved = editing ? await updateProduct(product._id, payload) : await createProduct(payload);
      setDirty(false);
      toast.success(editing ? `${saved.name} saved` : `${saved.name} added to the catalogue`);
      router.push(`/admin/products/${saved._id}`);
      router.refresh();
    } catch (caught) {
      if (caught instanceof ApiRequestError) {
        setError(caught.message);
        setFieldErrors(Object.fromEntries((caught.fields ?? []).map((field) => [field.path, field.message])));
      } else {
        setError("We could not save that. Please try again.");
      }
    } finally {
      setSaving(false);
    }
  }

  const brandCode = brands.find((row) => row.id === brand)?.code ?? "";

  return (
    <div className="grid gap-5 pb-24">
      <Link
        href="/admin/products"
        className="inline-flex w-fit items-center gap-1.5 text-body-sm text-text-muted hover:text-brand-navy"
      >
        <ArrowLeftIcon aria-hidden="true" className="size-4" />
        All products
      </Link>

      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="grid gap-1">
          <h1 className="text-h1 text-brand-navy">{editing ? product.name : "New product"}</h1>
          {editing ? (
            <Link
              href={`/product/${product.slug}`}
              className="inline-flex w-fit items-center gap-1.5 text-body-sm text-brand-primary hover:underline"
            >
              See it in the shop
              <ExternalLinkIcon aria-hidden="true" className="size-3.5" />
            </Link>
          ) : null}
        </div>
      </div>

      {error ? (
        <p
          role="alert"
          className="flex items-start gap-2 rounded-md border border-danger-border bg-danger-tint p-3 text-body-sm text-danger-text"
        >
          <AlertCircleIcon aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
          {error}
        </p>
      ) : null}

      <Section title="Details" description="What the product is, and how it reads on the storefront.">
        <Field label="Name" error={fieldErrors.name}>
          {(control) => (
            <Input
              {...control}
              value={name}
              maxLength={140}
              placeholder="Apple iPhone 15 Pro Max"
              onChange={(event) => touch(setName)(event.target.value)}
            />
          )}
        </Field>

        <Field
          label="One-line summary"
          hint="Shown under the name on the product page."
          error={fieldErrors.shortDescription}
        >
          {(control) => (
            <Input
              {...control}
              value={shortDescription}
              maxLength={240}
              onChange={(event) => touch(setShortDescription)(event.target.value)}
            />
          )}
        </Field>

        <Field label="Description" error={fieldErrors.description}>
          {(control) => (
            <textarea
              {...control}
              value={description}
              rows={6}
              maxLength={8000}
              onChange={(event) => touch(setDescription)(event.target.value)}
              className="rounded-md border border-grey-200 bg-white px-3 py-2 text-body-sm text-brand-navy focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:outline-none"
            />
          )}
        </Field>

        <Field label="Highlights" hint="One per line — the bullet points on the product page.">
          {(control) => (
            <textarea
              {...control}
              value={highlights}
              rows={4}
              onChange={(event) => touch(setHighlights)(event.target.value)}
              className="rounded-md border border-grey-200 bg-white px-3 py-2 text-body-sm text-brand-navy focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:outline-none"
            />
          )}
        </Field>

        <Field label="Specifications" hint="One per line, as `Label: value` — Screen: 6.7 inch OLED.">
          {(control) => (
            <textarea
              {...control}
              value={specs}
              rows={5}
              onChange={(event) => touch(setSpecs)(event.target.value)}
              className="font-mono rounded-md border border-grey-200 bg-white px-3 py-2 text-body-sm text-brand-navy focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:outline-none"
            />
          )}
        </Field>
      </Section>

      <Section title="Pictures" description="The first one is what customers see everywhere else.">
        <ProductImages images={images} onChange={touch(setImages)} />
      </Section>

      <Section
        title="Variants"
        description="Every price and every unit of stock belongs to a variant, never to the product."
      >
        {fieldErrors.variants ? (
          <p role="alert" className="text-body-sm text-danger-text">
            {fieldErrors.variants}
          </p>
        ) : null}
        <VariantsEditor
          variants={variants}
          brandCode={brandCode}
          productName={name}
          onChange={touch(setVariants)}
        />
      </Section>

      <Section title="Organisation" description="Where it sits in the shop, and how it is found.">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Brand" error={fieldErrors.brand}>
            {(control) => (
              <Select {...control} value={brand} onChange={(value) => touch(setBrand)(value)}>
                {brands.map((row) => (
                  <option key={row.id} value={row.id}>
                    {row.name}
                  </option>
                ))}
              </Select>
            )}
          </Field>

          <Field label="Category" error={fieldErrors.category}>
            {(control) => (
              <Select {...control} value={category} onChange={(value) => touch(setCategory)(value)}>
                {categories.map((row) => (
                  <option key={row.id} value={row.id}>
                    {row.parentName ? `${row.parentName} › ${row.name}` : row.name}
                  </option>
                ))}
              </Select>
            )}
          </Field>

          <Field label="Condition">
            {(control) => (
              <Select
                {...control}
                value={condition}
                onChange={(value) => touch(setCondition)(value as ProductInput["condition"])}
              >
                {PRODUCT_CONDITION.map((option) => (
                  <option key={option} value={option}>
                    {CONDITION_LABEL[option]}
                  </option>
                ))}
              </Select>
            )}
          </Field>

          <Field label="Warranty (months)">
            {(control) => (
              <Input
                {...control}
                type="number"
                min={0}
                max={60}
                value={warrantyMonths}
                onChange={(event) => touch(setWarrantyMonths)(Number(event.target.value) || 0)}
              />
            )}
          </Field>

          <Field
            label="Tags"
            hint="Comma separated — used by search and the filter chips."
            className="sm:col-span-2"
          >
            {(control) => (
              <Input
                {...control}
                value={tags}
                placeholder="flagship, 5g, dual sim"
                onChange={(event) => touch(setTags)(event.target.value)}
              />
            )}
          </Field>
        </div>
      </Section>

      <Section title="Visibility" description="Whether it is in the shop, and where it is shown.">
        <div className="grid gap-4">
          <Field label="Status" hint="Only an active product appears in the shop.">
            {(control) => (
              <Select
                {...control}
                value={status}
                onChange={(value) => touch(setStatus)(value as ProductInput["status"])}
              >
                {PRODUCT_STATUS.map((option) => (
                  <option key={option} value={option}>
                    {PRODUCT_STATUS_LABEL[option]}
                  </option>
                ))}
              </Select>
            )}
          </Field>

          <label className="flex items-center gap-2 text-body-sm text-brand-navy">
            <input
              type="checkbox"
              checked={isFeatured}
              onChange={(event) => touch(setIsFeatured)(event.target.checked)}
              className="size-4 rounded-sm border-grey-300 accent-[#156FBF]"
            />
            Show on the home page
          </label>

          <label className="flex items-center gap-2 text-body-sm text-brand-navy">
            <input
              type="checkbox"
              checked={isNewArrival}
              onChange={(event) => touch(setIsNewArrival)(event.target.checked)}
              className="size-4 rounded-sm border-grey-300 accent-[#156FBF]"
            />
            Mark as a new arrival
          </label>
        </div>
      </Section>

      {/* The save bar stays in view, because this form is long enough to scroll past its own buttons. */}
      <div className="fixed inset-x-0 bottom-0 z-40 border-t border-grey-200 bg-white/95 px-4 py-3 backdrop-blur sm:px-6 lg:left-[260px]">
        <div className="flex items-center justify-end gap-3">
          <p aria-live="polite" className="mr-auto text-body-sm text-text-muted">
            {dirty ? "Unsaved changes" : editing ? "Everything is saved" : "Not saved yet"}
          </p>
          <Button variant="outline" asChild>
            <Link href="/admin/products">Cancel</Link>
          </Button>
          <Button loading={saving} loadingLabel="Saving…" onClick={() => void save()}>
            {editing ? "Save changes" : "Add the product"}
          </Button>
        </div>
      </div>
    </div>
  );
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

function Select({
  value,
  onChange,
  children,
  ...control
}: {
  value: string;
  onChange: (value: string) => void;
  children: React.ReactNode;
  id?: string;
  "aria-invalid"?: boolean | undefined;
  "aria-describedby"?: string | undefined;
}) {
  return (
    <select
      {...control}
      value={value}
      onChange={(event) => onChange(event.target.value)}
      className="h-11 rounded-md border border-grey-200 bg-white px-3 text-body-sm text-brand-navy focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:outline-none"
    >
      {children}
    </select>
  );
}
