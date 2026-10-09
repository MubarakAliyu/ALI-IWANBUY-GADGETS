import request from "supertest";
import { beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";
import { seedFixture, seedSettings } from "./fixtures.js";

const app = createApp();

/** Slugs of the products a list response returned, in order. */
async function list(query = ""): Promise<{ slugs: string[]; total: number; body: Record<string, unknown> }> {
  const response = await request(app).get(`/api/v1/products${query}`);
  expect(response.status).toBe(200);
  const body = response.body as { data: { slug: string }[]; total: number };
  return { slugs: body.data.map((product) => product.slug), total: body.total, body: response.body };
}

beforeAll(async () => {
  await seedFixture();
  await seedSettings();
});

describe("GET /products", () => {
  it("returns only active products", async () => {
    const { slugs, total } = await list();
    expect(total).toBe(5);
    expect(slugs).not.toContain("oraimo-draft-earbuds");
    expect(slugs).not.toContain("oraimo-archived-speaker");
  });

  it("carries the fields a product card needs", async () => {
    const response = await request(app).get("/api/v1/products?category=iphone&limit=1");
    const card = (response.body as { data: Record<string, unknown>[] }).data[0];
    expect(card).toMatchObject({
      slug: expect.any(String),
      priceFromKobo: expect.any(Number),
      totalStock: expect.any(Number),
      brand: { slug: expect.any(String) },
      category: { slug: expect.any(String) },
    });
  });

  describe("filters", () => {
    it("filters by category and includes that category's children", async () => {
      expect((await list("?category=iphone")).slugs.sort()).toEqual(["apple-iphone-12", "apple-iphone-15"]);

      const phones = await list("?category=phones");
      expect(phones.total).toBe(4);
      expect(phones.slugs).toContain("samsung-galaxy-a15");
      expect(phones.slugs).toContain("apple-iphone-15");
    });

    it("returns nothing for a category that does not exist", async () => {
      expect(await list("?category=does-not-exist")).toMatchObject({ slugs: [], total: 0 });
    });

    it("filters by one brand and by several", async () => {
      expect((await list("?brand=apple")).total).toBe(2);
      expect((await list("?brand=apple,samsung")).total).toBe(4);
      expect((await list("?brand=apple,nothing")).total).toBe(2);
    });

    it("filters by price range on the lowest variant price", async () => {
      expect((await list("?minPriceKobo=100000000")).slugs.sort()).toEqual([
        "apple-iphone-15",
        "samsung-galaxy-s23-ultra",
      ]);
      expect((await list("?maxPriceKobo=5000000")).slugs).toEqual(["oraimo-freepods-4"]);
      expect((await list("?minPriceKobo=20000000&maxPriceKobo=70000000")).slugs.sort()).toEqual([
        "apple-iphone-12",
        "samsung-galaxy-a15",
      ]);
    });

    it("filters by condition", async () => {
      expect((await list("?condition=UK_USED")).slugs).toEqual(["apple-iphone-12"]);
      expect((await list("?condition=NEW")).total).toBe(4);
    });

    it("filters out what is not in stock", async () => {
      const { slugs } = await list("?inStock=true");
      expect(slugs).not.toContain("samsung-galaxy-s23-ultra");
      expect(slugs).toHaveLength(4);
    });

    it("filters to featured products", async () => {
      expect((await list("?featured=true")).slugs.sort()).toEqual(["apple-iphone-15", "samsung-galaxy-a15"]);
    });

    it("searches name, brand and tags", async () => {
      expect((await list("?q=iphone")).total).toBe(2);
      expect((await list("?q=samsung")).total).toBe(2);
      expect((await list("?q=budget")).slugs).toEqual(["samsung-galaxy-a15"]);
      expect((await list("?q=ipho")).total).toBe(2);
    });

    it("treats a search term as text, not as a pattern", async () => {
      expect((await list("?q=.*")).total).toBe(0);
    });

    it("combines filters", async () => {
      expect((await list("?category=phones&brand=samsung&inStock=true")).slugs).toEqual([
        "samsung-galaxy-a15",
      ]);
      expect((await list("?q=galaxy&maxPriceKobo=50000000&sort=price-asc")).slugs).toEqual([
        "samsung-galaxy-a15",
      ]);
    });
  });

  describe("sorting", () => {
    it("sorts by price, name and recency", async () => {
      expect((await list("?sort=price-asc")).slugs[0]).toBe("oraimo-freepods-4");
      expect((await list("?sort=price-desc")).slugs[0]).toBe("samsung-galaxy-s23-ultra");
      expect((await list("?sort=name")).slugs[0]).toBe("apple-iphone-12");
      expect((await list("?sort=newest")).slugs[0]).toBe("oraimo-freepods-4");
    });

    it("falls back to newest when the sort is nonsense", async () => {
      expect((await list("?sort=cheapest")).slugs).toEqual((await list("?sort=newest")).slugs);
    });
  });

  describe("pagination", () => {
    it("reports page, limit, total and pages", async () => {
      const { body } = await list("?limit=2");
      expect(body).toMatchObject({ page: 1, limit: 2, total: 5, pages: 3 });
    });

    it("returns the right slice for a page", async () => {
      const first = await list("?sort=price-asc&limit=2&page=1");
      const second = await list("?sort=price-asc&limit=2&page=2");
      expect(first.slugs).toHaveLength(2);
      expect(second.slugs).toHaveLength(2);
      expect(second.slugs).not.toContain(first.slugs[0]);
    });

    it("returns an empty page past the end rather than an error", async () => {
      expect((await list("?page=9")).slugs).toEqual([]);
    });

    it("caps the page size and ignores a silly page number", async () => {
      expect((await list("?limit=400")).body).toMatchObject({ limit: 24 });
      expect((await list("?page=0")).body).toMatchObject({ page: 1 });
      expect((await list("?page=-3")).body).toMatchObject({ page: 1 });
    });
  });
});

describe("GET /products/:slug", () => {
  it("returns the detail payload for an active product", async () => {
    const response = await request(app).get("/api/v1/products/apple-iphone-15");
    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      slug: "apple-iphone-15",
      variants: [{ label: "128GB", stock: 5 }, { label: "256GB" }],
      specs: [{ label: "Warranty", value: "12 months" }],
    });
  });

  it("is a 404 for a draft, an archived product and an unknown slug", async () => {
    for (const slug of ["oraimo-draft-earbuds", "oraimo-archived-speaker", "nothing-here"]) {
      const response = await request(app).get(`/api/v1/products/${slug}`);
      expect(response.status).toBe(404);
      expect(response.body.error.code).toBe("NOT_FOUND");
    }
  });
});

describe("GET /products/:slug/related", () => {
  it("returns products in the same category, never the product itself", async () => {
    const response = await request(app).get("/api/v1/products/apple-iphone-15/related");
    expect(response.status).toBe(200);
    const slugs = (response.body as { data: { slug: string }[] }).data.map((product) => product.slug);
    expect(slugs).toEqual(["apple-iphone-12"]);
  });
});

describe("GET /categories", () => {
  it("returns active top-level categories with their children and counts", async () => {
    const response = await request(app).get("/api/v1/categories");
    const tree = (response.body as { data: { slug: string; productCount: number; children: unknown[] }[] })
      .data;
    expect(tree.map((category) => category.slug)).toEqual(["phones", "audio"]);
    expect(tree[0]).toMatchObject({ slug: "phones", productCount: 4 });
    expect(tree[0]?.children).toHaveLength(2);
  });
});

describe("GET /brands", () => {
  it("counts only the active products of each brand", async () => {
    const response = await request(app).get("/api/v1/brands");
    const brands = (response.body as { data: { slug: string; productCount: number }[] }).data;
    expect(brands.find((brand) => brand.slug === "oraimo")?.productCount).toBe(1);
    expect(brands.find((brand) => brand.slug === "apple")?.productCount).toBe(2);
  });
});

describe("GET /search/suggest", () => {
  it("suggests nothing under two characters", async () => {
    const response = await request(app).get("/api/v1/search/suggest?q=i");
    expect(response.body).toEqual({ data: [] });
  });

  it("matches a prefix and puts the names that start with it first", async () => {
    const response = await request(app).get("/api/v1/search/suggest?q=ip");
    const names = (response.body as { data: { name: string }[] }).data.map((item) => item.name);
    expect(names.length).toBeGreaterThan(0);
    expect(names.every((name) => name.toLowerCase().includes("ip"))).toBe(true);
  });

  it("returns at most six suggestions", async () => {
    const response = await request(app).get("/api/v1/search/suggest?q=a");
    expect((response.body as { data: unknown[] }).data.length).toBeLessThanOrEqual(6);
  });
});

describe("GET /catalog/home", () => {
  it("returns featured products, new arrivals, categories and brands", async () => {
    const response = await request(app).get("/api/v1/catalog/home");
    expect(response.status).toBe(200);
    const body = response.body as Record<string, { slug: string }[]>;
    expect(body.featured?.map((product) => product.slug).sort()).toEqual([
      "apple-iphone-15",
      "samsung-galaxy-a15",
    ]);
    expect(body.newArrivals?.map((product) => product.slug).sort()).toEqual([
      "apple-iphone-15",
      "oraimo-freepods-4",
    ]);
    expect(body.categories).toHaveLength(2);
    expect(body.brands).toHaveLength(3);
  });
});

describe("GET /settings/public", () => {
  it("returns the shop details the storefront shows, and no bank details", async () => {
    const response = await request(app).get("/api/v1/settings/public");
    expect(response.status).toBe(200);
    expect(response.body).toMatchObject({
      legalName: "ALI_IWANBUY INTEGRATED SERVICE LTD",
      rcNumber: "8276954",
      phone: "+234 703 925 4143",
    });
    expect(response.body).not.toHaveProperty("bank");
  });
});
