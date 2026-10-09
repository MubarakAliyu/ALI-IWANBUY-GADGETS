import { describe, expect, it } from "vitest";
import { PRODUCT_PAGE_SIZE, productListQuerySchema } from "../src/catalog.js";

function parse(input: Record<string, unknown>) {
  return productListQuerySchema.parse(input);
}

describe("productListQuerySchema", () => {
  it("applies the defaults of an empty query", () => {
    expect(parse({})).toMatchObject({ sort: "newest", page: 1, limit: PRODUCT_PAGE_SIZE });
  });

  it("splits a comma-separated brand list and de-duplicates it", () => {
    expect(parse({ brand: "apple,samsung,apple" }).brand).toEqual(["apple", "samsung"]);
    expect(parse({ brand: ["Apple", " tecno "] }).brand).toEqual(["apple", "tecno"]);
  });

  it("coerces numeric parameters", () => {
    expect(parse({ page: "3", limit: "12", minPriceKobo: "5000000" })).toMatchObject({
      page: 3,
      limit: 12,
      minPriceKobo: 5_000_000,
    });
  });

  it("reads boolean flags from the string forms a URL carries", () => {
    expect(parse({ inStock: "true" }).inStock).toBe(true);
    expect(parse({ inStock: "1" }).inStock).toBe(true);
    expect(parse({ inStock: "no" }).inStock).toBe(false);
  });

  it("falls back instead of failing on a hand-edited URL", () => {
    expect(parse({ sort: "cheapest", page: "-4", limit: "900" })).toMatchObject({
      sort: "newest",
      page: 1,
      limit: PRODUCT_PAGE_SIZE,
    });
    expect(parse({ condition: "BROKEN" }).condition).toBeUndefined();
    expect(parse({ category: "Not A Slug" }).category).toBeUndefined();
  });

  it("caps the page size at the documented maximum", () => {
    expect(parse({ limit: "48" }).limit).toBe(48);
    expect(parse({ limit: "49" }).limit).toBe(PRODUCT_PAGE_SIZE);
  });
});
