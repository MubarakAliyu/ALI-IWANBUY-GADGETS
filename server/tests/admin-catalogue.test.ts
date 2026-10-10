/**
 * Catalogue management (overview §10 A-5, A-6).
 *
 * The rules worth holding on to: editing a product must not replace the variants orders point at, SKUs stay
 * unique, stock moves by a delta and never goes below zero, a brand rename reaches the denormalised copy on
 * every product, and nothing that is still in use can be deleted.
 */

import { beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";
import { Brand, Category, Product } from "../src/models/index.js";
import { ADMIN_PIN, auditRows, clearAdmins, signedInAdmin } from "./admin-helpers.js";
import { clearDatabase, seedFixture, seedSettings } from "./fixtures.js";
import { lineFor, registerCustomer, type Agent } from "./helpers.js";

const app = createApp();

let owner: Agent;

/** The payload the product editor sends, built from a product that already exists. */
async function payloadFor(slug: string) {
  const product = await Product.findOne({ slug }).lean().exec();
  if (!product) {
    throw new Error(`Fixture product "${slug}" is missing.`);
  }
  return {
    id: product._id.toString(),
    body: {
      name: product.name,
      brand: product.brand.toString(),
      category: product.category.toString(),
      shortDescription: product.shortDescription,
      description: product.description,
      highlights: product.highlights,
      specs: product.specs,
      images: product.images.map((image) => ({ url: image.url, alt: image.alt })),
      condition: product.condition,
      warrantyMonths: product.warrantyMonths,
      tags: product.tags,
      isFeatured: product.isFeatured,
      isNewArrival: product.isNewArrival,
      status: product.status,
      variants: product.variants.map((variant) => ({
        id: variant._id.toString(),
        sku: variant.sku,
        label: variant.label,
        attributes: variant.attributes,
        priceKobo: variant.priceKobo,
        compareAtPriceKobo: variant.compareAtPriceKobo,
        stock: variant.stock,
        lowStockThreshold: variant.lowStockThreshold,
        isActive: variant.isActive,
      })),
    },
    product,
  };
}

beforeEach(async () => {
  await clearDatabase();
  await clearAdmins();
  await seedFixture();
  await seedSettings();
  ({ agent: owner } = await signedInAdmin(app, "OWNER"));
});

describe("GET /admin/products", () => {
  it("lists products with their stock and category", async () => {
    const response = await owner.get("/api/v1/admin/products");

    expect(response.status).toBe(200);
    expect(response.body.total).toBeGreaterThan(0);
    expect(response.body.data[0]).toMatchObject({
      name: expect.any(String),
      brandName: expect.any(String),
      categoryName: expect.any(String),
      variantCount: expect.any(Number),
    });
  });

  it("narrows by what is running out", async () => {
    const out = await owner.get("/api/v1/admin/products").query({ stock: "out" });
    const all = await owner.get("/api/v1/admin/products");

    expect(out.body.total).toBeLessThan(all.body.total);
    for (const row of out.body.data) {
      expect(row.totalStock).toBe(0);
    }
  });

  it("finds a product by its SKU", async () => {
    const response = await owner.get("/api/v1/admin/products").query({ q: "APL-I15-128" });

    expect(response.body.total).toBe(1);
    expect(response.body.data[0].slug).toBe("apple-iphone-15");
  });
});

describe("creating and editing a product", () => {
  it("creates one, derives a slug and audits it", async () => {
    const brand = await Brand.findOne({ slug: "apple" }).lean().exec();
    const category = await Category.findOne({ slug: "iphone" }).lean().exec();

    const response = await owner.post("/api/v1/admin/products").send({
      name: "Apple iPhone 16 Pro",
      brand: brand?._id.toString(),
      category: category?._id.toString(),
      condition: "NEW",
      status: "ACTIVE",
      variants: [{ sku: "APL-I16P-256-9001", label: "256GB", priceKobo: 180_000_000, stock: 4 }],
    });

    expect(response.status).toBe(201);
    expect(response.body.slug).toBe("apple-iphone-16-pro");
    expect(response.body.brandName).toBe("Apple");
    expect(response.body.totalStock).toBe(4);
    expect(await auditRows("PRODUCT_CREATED")).toHaveLength(1);
  });

  it("keeps a variant's id when the product is edited", async () => {
    const { id, body, product } = await payloadFor("apple-iphone-15");
    const originalIds = product.variants.map((variant) => variant._id.toString());

    const response = await owner
      .patch(`/api/v1/admin/products/${id}`)
      .send({ ...body, name: "Apple iPhone 15 (2026)" });

    expect(response.status).toBe(200);
    expect(response.body.variants.map((variant: { _id: string }) => variant._id)).toEqual(originalIds);
  });

  it("refuses a SKU another product already uses", async () => {
    const { id, body } = await payloadFor("apple-iphone-15");
    const other = await Product.findOne({ slug: "samsung-galaxy-a15" }).lean().exec();
    const takenSku = other?.variants[0]?.sku as string;

    const response = await owner
      .patch(`/api/v1/admin/products/${id}`)
      .send({ ...body, variants: [{ ...body.variants[0], sku: takenSku }] });

    expect(response.status).toBe(400);
    expect(response.body.error.message).toContain(takenSku);
  });

  it("refuses two variants sharing a SKU", async () => {
    const { id, body } = await payloadFor("apple-iphone-15");

    const response = await owner.patch(`/api/v1/admin/products/${id}`).send({
      ...body,
      variants: [body.variants[0], { ...body.variants[1], id: undefined, sku: body.variants[0]?.sku }],
    });

    expect(response.status).toBe(400);
  });

  it("will not delete a variant that is on an order", async () => {
    const { agent: customer } = await registerCustomer(app);
    const line = await lineFor("apple-iphone-15", 1);
    await customer.post("/api/v1/orders").send({
      items: [{ productId: line.productId, variantId: line.variantId, qty: 1 }],
      deliveryMethod: "PICKUP",
      paymentMethod: "BANK_TRANSFER",
    });

    const { id, body } = await payloadFor("apple-iphone-15");
    const response = await owner
      .patch(`/api/v1/admin/products/${id}`)
      .send({ ...body, variants: body.variants.slice(1) });

    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe("VARIANT_IN_USE");
  });
});

describe("POST /admin/products/:id/stock", () => {
  it("moves stock by a delta and records before and after", async () => {
    const { id, product } = await payloadFor("apple-iphone-15");
    const variant = product.variants[0];
    const before = variant?.stock as number;

    const response = await owner
      .post(`/api/v1/admin/products/${id}/stock`)
      .send({ variantId: variant?._id.toString(), delta: 5, reason: "Delivery from Lagos" });

    expect(response.status).toBe(200);
    expect(response.body.variants[0].stock).toBe(before + 5);
    expect(response.body.totalStock).toBe(product.totalStock + 5);

    const rows = await auditRows("STOCK_ADJUSTED");
    expect(rows).toHaveLength(1);
    expect(rows[0]?.diff?.before).toMatchObject({ stock: before });
    expect(rows[0]?.diff?.after).toMatchObject({ stock: before + 5, reason: "Delivery from Lagos" });
  });

  it("refuses to take stock below zero", async () => {
    const { id, product } = await payloadFor("apple-iphone-15");
    const variant = product.variants[0];

    const response = await owner
      .post(`/api/v1/admin/products/${id}/stock`)
      .send({ variantId: variant?._id.toString(), delta: -999, reason: "Miscounted" });

    expect(response.status).toBe(400);
    const after = await Product.findById(id).lean().exec();
    expect(after?.variants[0]?.stock).toBe(variant?.stock);
  });

  it("lets staff count a shelf but not change a price", async () => {
    const { agent: staff } = await signedInAdmin(app, "STAFF", { pin: null });
    const { id, body, product } = await payloadFor("apple-iphone-15");

    const stock = await staff
      .post(`/api/v1/admin/products/${id}/stock`)
      .send({ variantId: product.variants[0]?._id.toString(), delta: 1, reason: "Found one" });
    expect(stock.status).toBe(200);

    const edit = await staff.patch(`/api/v1/admin/products/${id}`).send(body);
    expect(edit.status).toBe(403);
  });
});

describe("categories and brands", () => {
  it("renames a brand and rewrites it on every product", async () => {
    const brand = await Brand.findOne({ slug: "oraimo" }).lean().exec();
    const before = await Product.countDocuments({ brand: brand?._id }).exec();

    const response = await owner.patch(`/api/v1/admin/brands/${brand?._id.toString()}`).send({
      name: "Oraimo Nigeria",
      code: brand?.code,
      isActive: true,
    });

    expect(response.status).toBe(200);
    expect(await Product.countDocuments({ brandName: "Oraimo Nigeria" }).exec()).toBe(before);
    expect((await auditRows("BRAND_UPDATED"))[0]?.summary).toContain(`${before} product`);
  });

  it("refuses a brand code another brand is using", async () => {
    const [first, second] = await Brand.find().limit(2).lean().exec();

    const response = await owner
      .patch(`/api/v1/admin/brands/${second?._id.toString()}`)
      .send({ name: second?.name, code: first?.code, isActive: true });

    expect(response.status).toBe(400);
  });

  it("will not delete a brand that still has products", async () => {
    const brand = await Brand.findOne({ slug: "apple" }).lean().exec();

    const response = await owner.delete(`/api/v1/admin/brands/${brand?._id.toString()}`);

    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe("BRAND_IN_USE");
  });

  it("keeps categories to two levels", async () => {
    const child = await Category.findOne({ slug: "iphone" }).lean().exec();

    const response = await owner.post("/api/v1/admin/categories").send({
      name: "iPhone 15 series",
      parent: child?._id.toString(),
      sortOrder: 0,
      isActive: true,
    });

    expect(response.status).toBe(400);
    expect(response.body.error.message).toContain("two levels");
  });

  it("reorders categories by the list it is given", async () => {
    const before = await owner.get("/api/v1/admin/categories");
    const ids = before.body.data.map((row: { id: string }) => row.id).reverse();

    const response = await owner.post("/api/v1/admin/categories/reorder").send({ ids });

    expect(response.status).toBe(200);
    expect(response.body.data.map((row: { id: string }) => row.id)).toEqual(ids);
  });

  it("keeps catalogue editing away from staff", async () => {
    const { agent: staff } = await signedInAdmin(app, "STAFF", { pin: null });

    expect((await staff.get("/api/v1/admin/categories")).status).toBe(200);
    expect(
      (await staff.post("/api/v1/admin/categories").send({ name: "Drones", sortOrder: 0, isActive: true }))
        .status,
    ).toBe(403);
  });
});

describe("bulk status", () => {
  it("hides several products at once and audits it", async () => {
    const products = await Product.find({ status: "ACTIVE" }).select("_id").limit(3).lean().exec();
    const ids = products.map((product) => product._id.toString());

    const response = await owner.post("/api/v1/admin/products/bulk-status").send({ ids, status: "DRAFT" });

    expect(response.status).toBe(200);
    expect(response.body.changed).toBe(3);
    expect(await Product.countDocuments({ _id: { $in: ids }, status: "DRAFT" }).exec()).toBe(3);
    expect(await auditRows("PRODUCT_STATUS_CHANGED")).toHaveLength(1);
  });
});

/** The PIN is unrelated to the catalogue, but it must not have become a requirement by accident. */
describe("stock adjustment needs no PIN", () => {
  it("works without one", async () => {
    const { id, product } = await payloadFor("apple-iphone-15");
    const response = await owner
      .post(`/api/v1/admin/products/${id}/stock`)
      .send({ variantId: product.variants[0]?._id.toString(), delta: 1, reason: "Counted again" });

    expect(response.status).toBe(200);
    expect(ADMIN_PIN).toBeTruthy();
  });
});
