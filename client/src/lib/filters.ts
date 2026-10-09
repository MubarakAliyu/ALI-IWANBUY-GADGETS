/**
 * Shop filters live in the URL and nowhere else (AC1.2). Every filter, the sort and the page are readable
 * from `/shop?brand=apple,samsung&minPrice=100000&sort=price-asc&page=2`, so a filtered view can be shared,
 * bookmarked, reloaded and reached with the back button.
 *
 * Prices are written in naira in the URL, because that is what a customer types, and converted to integer
 * kobo on the way to the API.
 */

import {
  PRODUCT_CONDITION,
  PRODUCT_PAGE_SIZE,
  PRODUCT_SORT,
  parseNairaToKobo,
  type ProductCondition,
  type ProductSort,
} from "@aib/shared";

export type ShopFilters = {
  q: string | undefined;
  category: string | undefined;
  brands: string[];
  minPriceNaira: number | undefined;
  maxPriceNaira: number | undefined;
  condition: ProductCondition | undefined;
  inStock: boolean;
  sort: ProductSort;
  page: number;
};

export type SearchParamsInput = Record<string, string | string[] | undefined> | URLSearchParams;

export const DEFAULT_FILTERS: ShopFilters = {
  q: undefined,
  category: undefined,
  brands: [],
  minPriceNaira: undefined,
  maxPriceNaira: undefined,
  condition: undefined,
  inStock: false,
  sort: "newest",
  page: 1,
};

function read(params: SearchParamsInput, key: string): string | undefined {
  if (params instanceof URLSearchParams) {
    return params.get(key) ?? undefined;
  }
  const value = params[key];
  return Array.isArray(value) ? value[0] : value;
}

function readPositiveNumber(raw: string | undefined): number | undefined {
  if (raw === undefined || raw.trim() === "") {
    return undefined;
  }
  const value = Number(raw.replace(/[,\s]/g, ""));
  return Number.isFinite(value) && value >= 0 ? Math.floor(value) : undefined;
}

/** Read filters out of a URL. Anything unreadable falls back to its default rather than erroring. */
export function parseFilters(params: SearchParamsInput): ShopFilters {
  const q = read(params, "q")?.trim();
  const sort = read(params, "sort");
  const condition = read(params, "condition");
  const page = readPositiveNumber(read(params, "page"));
  const brands = (read(params, "brand") ?? "")
    .split(",")
    .map((slug) => slug.trim().toLowerCase())
    .filter(Boolean);

  return {
    q: q ? q : undefined,
    category: read(params, "category")?.trim() || undefined,
    brands: [...new Set(brands)],
    minPriceNaira: readPositiveNumber(read(params, "minPrice")),
    maxPriceNaira: readPositiveNumber(read(params, "maxPrice")),
    condition: (PRODUCT_CONDITION as readonly string[]).includes(condition ?? "")
      ? (condition as ProductCondition)
      : undefined,
    inStock: read(params, "inStock") === "true",
    sort: (PRODUCT_SORT as readonly string[]).includes(sort ?? "") ? (sort as ProductSort) : "newest",
    page: page && page >= 1 ? page : 1,
  };
}

/** Write filters back into a query string, leaving out everything that is still at its default. */
export function filtersToSearchParams(filters: ShopFilters): URLSearchParams {
  const params = new URLSearchParams();
  if (filters.q) {
    params.set("q", filters.q);
  }
  if (filters.category) {
    params.set("category", filters.category);
  }
  if (filters.brands.length > 0) {
    params.set("brand", filters.brands.join(","));
  }
  if (filters.minPriceNaira !== undefined) {
    params.set("minPrice", String(filters.minPriceNaira));
  }
  if (filters.maxPriceNaira !== undefined) {
    params.set("maxPrice", String(filters.maxPriceNaira));
  }
  if (filters.condition) {
    params.set("condition", filters.condition);
  }
  if (filters.inStock) {
    params.set("inStock", "true");
  }
  if (filters.sort !== "newest") {
    params.set("sort", filters.sort);
  }
  if (filters.page > 1) {
    params.set("page", String(filters.page));
  }
  return params;
}

/** `/shop?brand=apple&sort=price-asc` — the href a filter control links to. */
export function buildFilterHref(pathname: string, filters: ShopFilters): string {
  const query = filtersToSearchParams(filters).toString();
  return query ? `${pathname}?${query}` : pathname;
}

/**
 * Apply a change and reset to page 1, because the page someone was on rarely exists in the new result set.
 * `page` itself is the one field that can be changed without the reset.
 */
export function withFilter(filters: ShopFilters, change: Partial<ShopFilters>): ShopFilters {
  const next = { ...filters, ...change };
  return "page" in change ? next : { ...next, page: 1 };
}

export function toggleBrand(filters: ShopFilters, slug: string): ShopFilters {
  const brands = filters.brands.includes(slug)
    ? filters.brands.filter((brand) => brand !== slug)
    : [...filters.brands, slug];
  return withFilter(filters, { brands });
}

export function hasActiveFilters(filters: ShopFilters): boolean {
  return Boolean(
    filters.q ||
    filters.category ||
    filters.brands.length > 0 ||
    filters.minPriceNaira !== undefined ||
    filters.maxPriceNaira !== undefined ||
    filters.condition ||
    filters.inStock,
  );
}

/** The query string the API wants: same filters, prices in kobo, plus the page size. */
export function toApiQuery(filters: ShopFilters, overrides: { category?: string } = {}): string {
  const params = new URLSearchParams();
  const category = overrides.category ?? filters.category;

  if (filters.q) {
    params.set("q", filters.q);
  }
  if (category) {
    params.set("category", category);
  }
  if (filters.brands.length > 0) {
    params.set("brand", filters.brands.join(","));
  }
  if (filters.minPriceNaira !== undefined) {
    params.set("minPriceKobo", String(parseNairaToKobo(filters.minPriceNaira)));
  }
  if (filters.maxPriceNaira !== undefined) {
    params.set("maxPriceKobo", String(parseNairaToKobo(filters.maxPriceNaira)));
  }
  if (filters.condition) {
    params.set("condition", filters.condition);
  }
  if (filters.inStock) {
    params.set("inStock", "true");
  }
  params.set("sort", filters.sort);
  params.set("page", String(filters.page));
  params.set("limit", String(PRODUCT_PAGE_SIZE));
  return params.toString();
}
