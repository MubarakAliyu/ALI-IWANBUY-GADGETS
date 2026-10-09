import { describe, expect, it } from "vitest";
import {
  buildFilterHref,
  DEFAULT_FILTERS,
  filtersToSearchParams,
  hasActiveFilters,
  parseFilters,
  toApiQuery,
  toggleBrand,
  withFilter,
  type ShopFilters,
} from "@/lib/filters";

function fromUrl(query: string): ShopFilters {
  return parseFilters(new URLSearchParams(query));
}

describe("reading filters out of a URL", () => {
  it("falls back to the defaults for an empty query", () => {
    expect(fromUrl("")).toEqual(DEFAULT_FILTERS);
  });

  it("reads every filter the shop offers", () => {
    expect(
      fromUrl(
        "q=iphone&category=phones&brand=apple,samsung&minPrice=100000&maxPrice=900000&condition=UK_USED&inStock=true&sort=price-asc&page=3",
      ),
    ).toEqual({
      q: "iphone",
      category: "phones",
      brands: ["apple", "samsung"],
      minPriceNaira: 100_000,
      maxPriceNaira: 900_000,
      condition: "UK_USED",
      inStock: true,
      sort: "price-asc",
      page: 3,
    });
  });

  it("ignores values a hand-edited URL might carry", () => {
    const filters = fromUrl("sort=cheapest&page=0&condition=BROKEN&minPrice=-20");
    expect(filters.sort).toBe("newest");
    expect(filters.page).toBe(1);
    expect(filters.condition).toBeUndefined();
    expect(filters.minPriceNaira).toBeUndefined();
  });

  it("de-duplicates and lower-cases brands", () => {
    expect(fromUrl("brand=Apple,apple,SAMSUNG").brands).toEqual(["apple", "samsung"]);
  });
});

describe("writing filters back into a URL", () => {
  it("leaves out everything still at its default", () => {
    expect(filtersToSearchParams(DEFAULT_FILTERS).toString()).toBe("");
    expect(buildFilterHref("/shop", DEFAULT_FILTERS)).toBe("/shop");
  });

  it("round-trips a filtered view", () => {
    const filters = fromUrl("q=iphone&brand=apple,samsung&minPrice=100000&sort=price-asc&page=2");
    const href = buildFilterHref("/shop", filters);

    expect(href).toBe("/shop?q=iphone&brand=apple%2Csamsung&minPrice=100000&sort=price-asc&page=2");
    expect(parseFilters(new URLSearchParams(href.split("?")[1]))).toEqual(filters);
  });
});

describe("changing a filter", () => {
  it("resets to the first page, because page 7 rarely exists in the new results", () => {
    const filters = withFilter(fromUrl("page=7"), { condition: "NEW" });
    expect(filters.page).toBe(1);
  });

  it("keeps the page when the page itself is what changed", () => {
    expect(withFilter(fromUrl("brand=apple"), { page: 4 })).toMatchObject({ page: 4, brands: ["apple"] });
  });

  it("toggles a brand on and off", () => {
    const once = toggleBrand(DEFAULT_FILTERS, "apple");
    expect(once.brands).toEqual(["apple"]);
    expect(toggleBrand(once, "apple").brands).toEqual([]);
  });

  it("knows when anything is filtered", () => {
    expect(hasActiveFilters(DEFAULT_FILTERS)).toBe(false);
    expect(hasActiveFilters(fromUrl("sort=price-asc&page=2"))).toBe(false);
    expect(hasActiveFilters(fromUrl("brand=apple"))).toBe(true);
    expect(hasActiveFilters(fromUrl("inStock=true"))).toBe(true);
  });
});

describe("the query sent to the API", () => {
  it("converts the naira in the URL to the kobo the API expects", () => {
    const query = new URLSearchParams(toApiQuery(fromUrl("minPrice=100000&maxPrice=900000")));
    expect(query.get("minPriceKobo")).toBe("10000000");
    expect(query.get("maxPriceKobo")).toBe("90000000");
  });

  it("always asks for an explicit sort, page and page size", () => {
    const query = new URLSearchParams(toApiQuery(DEFAULT_FILTERS));
    expect(query.get("sort")).toBe("newest");
    expect(query.get("page")).toBe("1");
    expect(query.get("limit")).toBe("24");
  });

  it("lets a category page override the category in the URL", () => {
    const query = new URLSearchParams(toApiQuery(fromUrl("category=audio"), { category: "phones" }));
    expect(query.get("category")).toBe("phones");
  });
});
