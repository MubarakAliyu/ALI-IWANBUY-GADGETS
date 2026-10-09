import request from "supertest";
import { beforeAll, describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";
import { Product } from "../src/models/index.js";
import { seedFixture, variantRef } from "./fixtures.js";

const app = createApp();

async function validate(items: unknown[]) {
  const response = await request(app).post("/api/v1/cart/validate").send({ items });
  return response;
}

beforeAll(async () => {
  await seedFixture();
});

describe("POST /cart/validate", () => {
  it("prices a valid cart from the database", async () => {
    const line = await variantRef("apple-iphone-15");
    const response = await validate([{ productId: line.productId, variantId: line.variantId, qty: 2 }]);

    expect(response.status).toBe(200);
    expect(response.body.issues).toEqual([]);
    expect(response.body.items[0]).toMatchObject({
      qty: 2,
      unitPriceKobo: line.priceKobo,
      lineTotalKobo: line.priceKobo * 2,
    });
    expect(response.body.subtotalKobo).toBe(line.priceKobo * 2);
  });

  it("ignores a price the browser sends and reports that it changed", async () => {
    const line = await variantRef("apple-iphone-15");
    const response = await validate([
      { productId: line.productId, variantId: line.variantId, qty: 1, unitPriceKobo: 1 },
    ]);

    expect(response.body.items[0].unitPriceKobo).toBe(line.priceKobo);
    expect(response.body.issues).toEqual([
      expect.objectContaining({ issue: "PRICE_CHANGED", previousUnitPriceKobo: 1 }),
    ]);
  });

  it("caps a quantity at what is left in stock", async () => {
    const line = await variantRef("apple-iphone-15");
    const response = await validate([{ productId: line.productId, variantId: line.variantId, qty: 99 }]);

    expect(response.body.items[0].qty).toBe(5);
    expect(response.body.issues).toEqual([
      expect.objectContaining({ issue: "QTY_REDUCED", previousQty: 99 }),
    ]);
  });

  it("flags a variant that has sold out", async () => {
    const line = await variantRef("samsung-galaxy-s23-ultra");
    const response = await validate([{ productId: line.productId, variantId: line.variantId, qty: 1 }]);

    expect(response.body.items[0].qty).toBe(0);
    expect(response.body.subtotalKobo).toBe(0);
    expect(response.body.issues[0].issue).toBe("OUT_OF_STOCK");
  });

  it("flags a line whose product is no longer on sale", async () => {
    const line = await variantRef("oraimo-freepods-4");
    await Product.updateOne({ slug: "oraimo-freepods-4" }, { status: "ARCHIVED" }).exec();

    const response = await validate([{ productId: line.productId, variantId: line.variantId, qty: 1 }]);
    expect(response.body.items).toEqual([]);
    expect(response.body.issues[0].issue).toBe("REMOVED");

    await Product.updateOne({ slug: "oraimo-freepods-4" }, { status: "ACTIVE" }).exec();
  });

  it("accepts an empty cart", async () => {
    const response = await validate([]);
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ items: [], issues: [], subtotalKobo: 0 });
  });

  it("rejects a malformed line", async () => {
    const response = await validate([{ productId: "nope", variantId: "nope", qty: 0 }]);
    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("BAD_REQUEST");
    expect(response.body.error.fields.length).toBeGreaterThan(0);
  });
});
