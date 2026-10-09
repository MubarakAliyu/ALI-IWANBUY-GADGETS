"use client";

import { useId, useState } from "react";
import type { Brand, CategoryNode } from "@aib/shared";
import { CONDITION_LABEL, PRODUCT_CONDITION } from "@aib/shared";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { buildFilterHref, hasActiveFilters, toggleBrand, withFilter, type ShopFilters } from "@/lib/filters";
import { cn } from "@/lib/cn";

type FilterPanelProps = {
  filters: ShopFilters;
  brands: Brand[];
  categories: CategoryNode[];
  /** The path the filters apply to — `/shop`, `/category/phones` or `/search`. */
  pathname: string;
  /** Set on a category page: the category comes from the path, so the panel does not offer it. */
  lockedCategory?: string;
  onNavigate?: () => void;
  className?: string;
};

/**
 * Every filter control writes to the URL and nothing else (AC1.2). There is no local filter state to get out
 * of step with the address bar: the panel renders from `filters`, and a change pushes a new URL that the
 * server re-renders from.
 */
export function FilterPanel({
  filters,
  brands,
  categories,
  pathname,
  lockedCategory,
  onNavigate,
  className,
}: FilterPanelProps) {
  const router = useRouter();
  // The desktop sidebar and the mobile sheet can both hold a panel, so every control id is scoped to its
  // own instance — two elements must never share an id.
  const uid = useId();
  const controlId = (name: string) => `${uid}-${name}`;

  function go(next: ShopFilters) {
    router.push(buildFilterHref(pathname, next), { scroll: false });
    onNavigate?.();
  }

  const brandsWithProducts = brands.filter((brand) => (brand.productCount ?? 0) > 0);

  return (
    <div data-testid="filter-panel" className={cn("grid gap-6", className)}>
      {lockedCategory ? null : (
        <FilterGroup title="Category">
          <RadioGroup
            value={filters.category ?? ""}
            onValueChange={(value) => go(withFilter(filters, { category: value || undefined }))}
            className="gap-2"
          >
            <FilterRadio value="" id={controlId("category-all")} label="All categories" />
            {categories.map((category) => (
              <div key={category.slug} className="grid gap-2">
                <FilterRadio
                  value={category.slug}
                  id={controlId(`category-${category.slug}`)}
                  label={category.name}
                  count={category.productCount}
                />
                {category.children.length > 0 ? (
                  <div className="ml-6 grid gap-2">
                    {category.children.map((child) => (
                      <FilterRadio
                        key={child.slug}
                        value={child.slug}
                        id={controlId(`category-${child.slug}`)}
                        label={child.name}
                        count={child.productCount}
                        muted
                      />
                    ))}
                  </div>
                ) : null}
              </div>
            ))}
          </RadioGroup>
        </FilterGroup>
      )}

      <FilterGroup title="Brand">
        <ul className="grid gap-2">
          {brandsWithProducts.map((brand) => {
            const id = controlId(`brand-${brand.slug}`);
            return (
              <li key={brand.slug} className="flex items-center gap-2">
                <Checkbox
                  id={id}
                  checked={filters.brands.includes(brand.slug)}
                  onCheckedChange={() => go(toggleBrand(filters, brand.slug))}
                />
                <Label htmlFor={id} className="flex-1 justify-between font-normal">
                  <span>{brand.name}</span>
                  <span className="text-caption numeric text-text-muted">{brand.productCount}</span>
                </Label>
              </li>
            );
          })}
        </ul>
      </FilterGroup>

      <FilterGroup title="Price (₦)">
        {/* Keyed on the URL values: a filter cleared elsewhere remounts the boxes with the new numbers. */}
        <PriceRange
          key={`${filters.minPriceNaira ?? ""}-${filters.maxPriceNaira ?? ""}`}
          minId={controlId("min-price")}
          maxId={controlId("max-price")}
          min={filters.minPriceNaira}
          max={filters.maxPriceNaira}
          onApply={(min, max) => go(withFilter(filters, { minPriceNaira: min, maxPriceNaira: max }))}
        />
      </FilterGroup>

      <FilterGroup title="Condition">
        <RadioGroup
          value={filters.condition ?? ""}
          onValueChange={(value) =>
            go(withFilter(filters, { condition: (value || undefined) as ShopFilters["condition"] }))
          }
          className="gap-2"
        >
          <FilterRadio value="" id={controlId("condition-any")} label="Any condition" />
          {PRODUCT_CONDITION.map((condition) => (
            <FilterRadio
              key={condition}
              value={condition}
              id={controlId(`condition-${condition}`)}
              label={CONDITION_LABEL[condition]}
            />
          ))}
        </RadioGroup>
      </FilterGroup>

      <FilterGroup title="Availability">
        <div className="flex items-center gap-2">
          <Checkbox
            id={controlId("in-stock")}
            checked={filters.inStock}
            onCheckedChange={(checked) => go(withFilter(filters, { inStock: checked === true }))}
          />
          <Label htmlFor={controlId("in-stock")} className="font-normal">
            In stock only
          </Label>
        </div>
      </FilterGroup>

      {hasActiveFilters(filters) ? (
        <Button
          variant="ghost"
          onClick={() =>
            go({
              ...filters,
              q: filters.q,
              category: lockedCategory ? filters.category : undefined,
              brands: [],
              minPriceNaira: undefined,
              maxPriceNaira: undefined,
              condition: undefined,
              inStock: false,
              page: 1,
            })
          }
          className="justify-start px-0 text-brand-primary"
        >
          Clear all filters
        </Button>
      ) : null}
    </div>
  );
}

/**
 * The two price boxes. They hold what is being typed, which is why they are a component of their own: the
 * panel remounts them whenever the URL's price changes, instead of syncing state in an effect.
 */
function PriceRange({
  minId,
  maxId,
  min,
  max,
  onApply,
}: {
  minId: string;
  maxId: string;
  min: number | undefined;
  max: number | undefined;
  onApply: (min: number | undefined, max: number | undefined) => void;
}) {
  const [from, setFrom] = useState(min?.toString() ?? "");
  const [to, setTo] = useState(max?.toString() ?? "");

  function read(value: string): number | undefined {
    if (value.trim() === "") {
      return undefined;
    }
    const amount = Math.floor(Number(value.replace(/[,\s]/g, "")));
    return Number.isFinite(amount) && amount >= 0 ? amount : undefined;
  }

  return (
    <form
      className="grid gap-2"
      onSubmit={(event) => {
        event.preventDefault();
        onApply(read(from), read(to));
      }}
    >
      <div className="flex items-center gap-2">
        <div className="grid flex-1 gap-1">
          <Label htmlFor={minId} className="text-caption font-normal text-text-muted">
            From
          </Label>
          <Input
            id={minId}
            inputMode="numeric"
            fieldSize="sm"
            placeholder="0"
            value={from}
            onChange={(event) => setFrom(event.target.value)}
            className="numeric"
          />
        </div>
        <div className="grid flex-1 gap-1">
          <Label htmlFor={maxId} className="text-caption font-normal text-text-muted">
            To
          </Label>
          <Input
            id={maxId}
            inputMode="numeric"
            fieldSize="sm"
            placeholder="Any"
            value={to}
            onChange={(event) => setTo(event.target.value)}
            className="numeric"
          />
        </div>
      </div>
      <Button type="submit" variant="outline" size="sm">
        Apply price
      </Button>
    </form>
  );
}

function FilterGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset className="grid gap-3 border-b border-grey-200 pb-6 last:border-0 last:pb-0">
      <legend className="text-label text-brand-navy uppercase">{title}</legend>
      {children}
    </fieldset>
  );
}

function FilterRadio({
  value,
  id,
  label,
  count,
  muted,
}: {
  value: string;
  id: string;
  label: string;
  count?: number;
  muted?: boolean;
}) {
  return (
    <div className="flex items-center gap-2">
      <RadioGroupItem value={value} id={id} />
      <Label htmlFor={id} className={cn("flex-1 justify-between font-normal", muted && "text-text-muted")}>
        <span>{label}</span>
        {count === undefined ? null : <span className="text-caption numeric text-text-muted">{count}</span>}
      </Label>
    </div>
  );
}
