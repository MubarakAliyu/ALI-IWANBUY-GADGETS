"use client";

import { useState } from "react";
import type { Brand, CategoryNode } from "@aib/shared";
import { CONDITION_LABEL, PRODUCT_SORT, PRODUCT_SORT_LABEL } from "@aib/shared";
import { useRouter } from "next/navigation";
import { SlidersHorizontalIcon, XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { buildFilterHref, hasActiveFilters, withFilter, type ShopFilters } from "@/lib/filters";
import { formatNairaPlain } from "@/lib/money";
import { parseNairaToKobo } from "@aib/shared";
import { FilterPanel } from "./filter-panel";

type ToolbarProps = {
  filters: ShopFilters;
  brands: Brand[];
  categories: CategoryNode[];
  pathname: string;
  lockedCategory?: string;
  total: number;
};

/** Sort, the mobile filter sheet and the active-filter chips — the row above the grid (S-3). */
export function ShopToolbar({ filters, brands, categories, pathname, lockedCategory, total }: ToolbarProps) {
  const router = useRouter();
  const [sheetOpen, setSheetOpen] = useState(false);

  function go(next: ShopFilters) {
    router.push(buildFilterHref(pathname, next), { scroll: false });
  }

  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-body-sm text-text-muted" aria-live="polite">
          <span className="font-semibold numeric text-brand-navy">{total}</span>{" "}
          {total === 1 ? "product" : "products"}
        </p>

        <div className="flex items-center gap-2">
          <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" size="sm" className="gap-1.5 lg:hidden">
                <SlidersHorizontalIcon aria-hidden="true" className="size-4" />
                Filters
                {hasActiveFilters(filters) ? (
                  <span
                    className="ml-0.5 size-2 rounded-full bg-brand-primary"
                    aria-label="Filters applied"
                  />
                ) : null}
              </Button>
            </SheetTrigger>
            <SheetContent side="bottom" className="p-0">
              <SheetHeader>
                <SheetTitle>Filters</SheetTitle>
              </SheetHeader>
              <div className="scroll-slim overflow-y-auto p-5">
                <FilterPanel
                  filters={filters}
                  brands={brands}
                  categories={categories}
                  pathname={pathname}
                  {...(lockedCategory ? { lockedCategory } : {})}
                  onNavigate={() => setSheetOpen(false)}
                />
              </div>
            </SheetContent>
          </Sheet>

          <div className="flex items-center gap-2">
            <label htmlFor="sort" className="sr-only">
              Sort products
            </label>
            <Select
              value={filters.sort}
              onValueChange={(sort) => go(withFilter(filters, { sort: sort as ShopFilters["sort"] }))}
            >
              <SelectTrigger id="sort" className="h-9 w-48 text-body-sm">
                <SelectValue placeholder="Sort" />
              </SelectTrigger>
              <SelectContent>
                {PRODUCT_SORT.map((sort) => (
                  <SelectItem key={sort} value={sort}>
                    {PRODUCT_SORT_LABEL[sort]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <ActiveFilterChips
        filters={filters}
        brands={brands}
        categories={categories}
        pathname={pathname}
        {...(lockedCategory ? { lockedCategory } : {})}
      />
    </div>
  );
}

/** Each active filter as a chip that removes itself, plus "Clear all" (S-3). */
function ActiveFilterChips({
  filters,
  brands,
  categories,
  pathname,
  lockedCategory,
}: Omit<ToolbarProps, "total">) {
  const router = useRouter();
  if (!hasActiveFilters(filters)) {
    return null;
  }

  function go(next: ShopFilters) {
    router.push(buildFilterHref(pathname, next), { scroll: false });
  }

  const categoryName = categories
    .flatMap((category) => [category, ...category.children])
    .find((category) => category.slug === filters.category)?.name;

  const chips: { key: string; label: string; clear: () => void }[] = [];

  if (filters.q) {
    chips.push({
      key: "q",
      label: `Search: ${filters.q}`,
      clear: () => go(withFilter(filters, { q: undefined })),
    });
  }
  if (filters.category && !lockedCategory) {
    chips.push({
      key: "category",
      label: categoryName ?? filters.category,
      clear: () => go(withFilter(filters, { category: undefined })),
    });
  }
  for (const slug of filters.brands) {
    const name = brands.find((brand) => brand.slug === slug)?.name ?? slug;
    chips.push({
      key: `brand-${slug}`,
      label: name,
      clear: () => go(withFilter(filters, { brands: filters.brands.filter((brand) => brand !== slug) })),
    });
  }
  if (filters.minPriceNaira !== undefined) {
    chips.push({
      key: "min",
      label: `From ₦${formatNairaPlain(parseNairaToKobo(filters.minPriceNaira))}`,
      clear: () => go(withFilter(filters, { minPriceNaira: undefined })),
    });
  }
  if (filters.maxPriceNaira !== undefined) {
    chips.push({
      key: "max",
      label: `Up to ₦${formatNairaPlain(parseNairaToKobo(filters.maxPriceNaira))}`,
      clear: () => go(withFilter(filters, { maxPriceNaira: undefined })),
    });
  }
  if (filters.condition) {
    chips.push({
      key: "condition",
      label: CONDITION_LABEL[filters.condition],
      clear: () => go(withFilter(filters, { condition: undefined })),
    });
  }
  if (filters.inStock) {
    chips.push({
      key: "in-stock",
      label: "In stock only",
      clear: () => go(withFilter(filters, { inStock: false })),
    });
  }

  return (
    <ul className="flex flex-wrap items-center gap-2" aria-label="Active filters">
      {chips.map((chip) => (
        <li key={chip.key}>
          <button
            type="button"
            onClick={chip.clear}
            className="inline-flex items-center gap-1.5 rounded-full border border-grey-200 bg-grey-50 py-1 pr-2 pl-3 text-caption font-medium text-brand-navy hover:border-grey-300 hover:bg-grey-100"
          >
            {chip.label}
            <XIcon aria-hidden="true" className="size-3.5 text-text-muted" />
            <span className="sr-only">Remove filter</span>
          </button>
        </li>
      ))}
      <li>
        <button
          type="button"
          onClick={() =>
            go({
              ...filters,
              q: undefined,
              category: lockedCategory ? filters.category : undefined,
              brands: [],
              minPriceNaira: undefined,
              maxPriceNaira: undefined,
              condition: undefined,
              inStock: false,
              page: 1,
            })
          }
          className="px-1 text-caption font-semibold text-brand-primary hover:underline"
        >
          Clear all
        </button>
      </li>
    </ul>
  );
}
