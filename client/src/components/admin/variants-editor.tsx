"use client";

import type { VariantInput } from "@aib/shared";
import { PlusIcon, Trash2Icon, WandSparklesIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { formatNairaPlain, parseNairaToKobo } from "@/lib/money";

/**
 * The variants table (A-5). This is where the money lives: every price and every unit of stock belongs to a
 * variant, never to the product.
 *
 * Prices are typed in naira and held as integer kobo — `parseNairaToKobo` is the only conversion, and it
 * happens on the way in, so nothing downstream ever sees a float.
 *
 * A row that was saved before keeps its `id`. Deleting such a row is allowed here, but the server refuses it
 * if the variant appears on an order, which is the right place for that rule to live.
 */
export function VariantsEditor({
  variants,
  brandCode,
  productName,
  onChange,
}: {
  variants: VariantInput[];
  brandCode: string;
  productName: string;
  onChange: (next: VariantInput[]) => void;
}) {
  function update(index: number, changes: Partial<VariantInput>) {
    const next = [...variants];
    next[index] = { ...(next[index] as VariantInput), ...changes };
    onChange(next);
  }

  function add() {
    onChange([
      ...variants,
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
    ]);
  }

  /** The same shape the server builds, so what the editor shows is what would be saved anyway. */
  function suggestSku(index: number) {
    const variant = variants[index];
    if (!variant) {
      return;
    }
    const model = productName
      .replace(/[^a-z0-9 ]/gi, "")
      .split(/\s+/)
      .filter(Boolean)
      .map((word) => (/^\d/.test(word) ? word : word.slice(0, 1)))
      .join("")
      .toUpperCase()
      .slice(0, 6);

    const attribute = [
      variant.attributes?.storage?.replace(/[^0-9A-Z]/gi, "").toUpperCase() ?? "",
      variant.attributes?.colour?.slice(0, 3).toUpperCase() ?? "",
    ]
      .filter(Boolean)
      .join("");

    update(index, {
      sku: [brandCode || "XXX", model || "MODEL", attribute, String(index + 1).padStart(4, "0")]
        .filter(Boolean)
        .join("-"),
    });
  }

  return (
    <div className="grid gap-4">
      {variants.map((variant, index) => (
        <div key={index} className="grid gap-3 rounded-md border border-grey-200 p-3">
          <div className="flex items-center justify-between gap-3">
            <p className="text-body-sm font-semibold text-brand-navy">
              {variant.label || `Variant ${index + 1}`}
              {variant.id ? null : (
                <span className="ml-2 rounded-full bg-primary-50 px-2 py-0.5 text-caption font-normal text-brand-primary">
                  new
                </span>
              )}
            </p>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              aria-label={`Remove variant ${index + 1}`}
              disabled={variants.length === 1}
              onClick={() => onChange(variants.filter((_, at) => at !== index))}
            >
              <Trash2Icon aria-hidden="true" className="size-4 text-danger-text" />
            </Button>
          </div>

          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Cell label="Label" id={`variant-label-${index}`} hint="What a customer chooses, e.g. 256GB">
              <Input
                id={`variant-label-${index}`}
                value={variant.label}
                maxLength={80}
                onChange={(event) => update(index, { label: event.target.value })}
              />
            </Cell>

            <Cell label="Storage" id={`variant-storage-${index}`}>
              <Input
                id={`variant-storage-${index}`}
                value={variant.attributes?.storage ?? ""}
                placeholder="256GB"
                onChange={(event) =>
                  update(index, {
                    attributes: { ...variant.attributes, storage: event.target.value || null },
                  })
                }
              />
            </Cell>

            <Cell label="Colour" id={`variant-colour-${index}`}>
              <Input
                id={`variant-colour-${index}`}
                value={variant.attributes?.colour ?? ""}
                placeholder="Graphite"
                onChange={(event) =>
                  update(index, {
                    attributes: { ...variant.attributes, colour: event.target.value || null },
                  })
                }
              />
            </Cell>

            <Cell label="RAM" id={`variant-ram-${index}`}>
              <Input
                id={`variant-ram-${index}`}
                value={variant.attributes?.ram ?? ""}
                placeholder="8GB"
                onChange={(event) =>
                  update(index, {
                    attributes: { ...variant.attributes, ram: event.target.value || null },
                  })
                }
              />
            </Cell>

            <Cell label="SKU" id={`variant-sku-${index}`} className="sm:col-span-2">
              <div className="flex gap-2">
                <Input
                  id={`variant-sku-${index}`}
                  value={variant.sku}
                  maxLength={32}
                  className="font-mono uppercase"
                  onChange={(event) => update(index, { sku: event.target.value.toUpperCase() })}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  aria-label={`Suggest a SKU for variant ${index + 1}`}
                  onClick={() => suggestSku(index)}
                >
                  <WandSparklesIcon aria-hidden="true" className="size-4" />
                </Button>
              </div>
            </Cell>

            <Cell label="Price (₦)" id={`variant-price-${index}`}>
              <Input
                id={`variant-price-${index}`}
                inputMode="decimal"
                defaultValue={variant.priceKobo ? formatNairaPlain(variant.priceKobo) : ""}
                onBlur={(event) => update(index, { priceKobo: toKobo(event.target.value) })}
              />
            </Cell>

            <Cell label="Was (₦)" id={`variant-compare-${index}`} hint="Leave empty if it is not on offer">
              <Input
                id={`variant-compare-${index}`}
                inputMode="decimal"
                defaultValue={variant.compareAtPriceKobo ? formatNairaPlain(variant.compareAtPriceKobo) : ""}
                onBlur={(event) =>
                  update(index, {
                    compareAtPriceKobo: event.target.value.trim() ? toKobo(event.target.value) : null,
                  })
                }
              />
            </Cell>

            <Cell label="In stock" id={`variant-stock-${index}`}>
              <Input
                id={`variant-stock-${index}`}
                type="number"
                min={0}
                value={variant.stock}
                onChange={(event) => update(index, { stock: Math.max(0, Number(event.target.value) || 0) })}
              />
            </Cell>

            <Cell label="Warn below" id={`variant-low-${index}`}>
              <Input
                id={`variant-low-${index}`}
                type="number"
                min={0}
                value={variant.lowStockThreshold}
                onChange={(event) =>
                  update(index, { lowStockThreshold: Math.max(0, Number(event.target.value) || 0) })
                }
              />
            </Cell>

            <div className="flex items-end">
              <label className="flex items-center gap-2 text-body-sm text-brand-navy">
                <input
                  type="checkbox"
                  checked={variant.isActive}
                  onChange={(event) => update(index, { isActive: event.target.checked })}
                  className="size-4 rounded-sm border-grey-300 accent-[#156FBF]"
                />
                Customers can buy this
              </label>
            </div>
          </div>
        </div>
      ))}

      <Button type="button" variant="outline" className="w-fit" onClick={add}>
        <PlusIcon aria-hidden="true" className="size-4" />
        Add a variant
      </Button>
    </div>
  );
}

/** Naira in, integer kobo out — the one conversion in the editor. */
function toKobo(value: string): number {
  const cleaned = value.replace(/[^0-9.]/g, "");
  if (!cleaned) {
    return 0;
  }
  try {
    return parseNairaToKobo(cleaned);
  } catch {
    return 0;
  }
}

function Cell({
  label,
  id,
  hint,
  className,
  children,
}: {
  label: string;
  id: string;
  hint?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={`grid content-start gap-1.5 ${className ?? ""}`}>
      <Label htmlFor={id} className="text-caption">
        {label}
      </Label>
      {children}
      {hint ? <p className="text-caption text-text-muted">{hint}</p> : null}
    </div>
  );
}
