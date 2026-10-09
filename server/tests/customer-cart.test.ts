import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";
import { Product } from "../src/models/index.js";
import { clearDatabase, seedFixture, seedSettings } from "./fixtures.js";
import { lineFor, registerCustomer, setStock, type Agent } from "./helpers.js";

const app = createApp();

let agent: Agent;

beforeEach(async () => {
  await clearDatabase();
  await seedFixture();
  await seedSettings();
  ({ agent } = await registerCustomer(app));
});

describe("the server cart", () => {
  it("starts empty", async () => {
    const response = await agent.get("/api/v1/me/cart");
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ items: [], subtotalKobo: 0 });
  });

  it("saves lines and prices them from the catalogue", async () => {
    const line = await lineFor("apple-iphone-15", 2);

    const response = await agent
      .put("/api/v1/me/cart")
      .send({ items: [{ productId: line.productId, variantId: line.variantId, qty: 2 }] });

    expect(response.status).toBe(200);
    expect(response.body.items[0]).toMatchObject({
      qty: 2,
      unitPriceKobo: line.priceKobo,
      lineTotalKobo: line.priceKobo * 2,
      name: "Apple iPhone 15",
    });
    expect(response.body.subtotalKobo).toBe(line.priceKobo * 2);
  });

  it("caps a saved line at what is in stock", async () => {
    await setStock("apple-iphone-15", 3);
    const line = await lineFor("apple-iphone-15", 1);

    const response = await agent
      .put("/api/v1/me/cart")
      .send({ items: [{ productId: line.productId, variantId: line.variantId, qty: 99 }] });

    expect(response.body.items[0].qty).toBe(3);
  });

  it("drops a line whose product has gone off sale", async () => {
    const line = await lineFor("oraimo-freepods-4", 1);
    await agent
      .put("/api/v1/me/cart")
      .send({ items: [{ productId: line.productId, variantId: line.variantId, qty: 1 }] });

    await Product.updateOne({ slug: "oraimo-freepods-4" }, { $set: { status: "ARCHIVED" } }).exec();

    const response = await agent.get("/api/v1/me/cart");
    expect(response.body.items).toEqual([]);
    expect(response.body.subtotalKobo).toBe(0);
  });
});

describe("merging a guest cart at sign-in", () => {
  it("adds the browser's quantities to whatever is on the account", async () => {
    const line = await lineFor("apple-iphone-15", 1);

    await agent
      .put("/api/v1/me/cart")
      .send({ items: [{ productId: line.productId, variantId: line.variantId, qty: 1 }] });

    const response = await agent
      .post("/api/v1/me/cart/merge")
      .send({ items: [{ productId: line.productId, variantId: line.variantId, qty: 2 }] });

    expect(response.body.items).toHaveLength(1);
    expect(response.body.items[0].qty).toBe(3);
  });

  it("caps the merged quantity at the stock on the shelf", async () => {
    await setStock("apple-iphone-15", 4);
    const line = await lineFor("apple-iphone-15", 1);

    await agent
      .put("/api/v1/me/cart")
      .send({ items: [{ productId: line.productId, variantId: line.variantId, qty: 3 }] });

    const response = await agent
      .post("/api/v1/me/cart/merge")
      .send({ items: [{ productId: line.productId, variantId: line.variantId, qty: 5 }] });

    expect(response.body.items[0].qty).toBe(4);
  });

  it("brings in lines the account did not have, and ignores sold-out ones", async () => {
    const phone = await lineFor("apple-iphone-15", 1);
    const soldOut = await lineFor("samsung-galaxy-s23-ultra", 1);

    const response = await agent.post("/api/v1/me/cart/merge").send({
      items: [
        { productId: phone.productId, variantId: phone.variantId, qty: 1 },
        { productId: soldOut.productId, variantId: soldOut.variantId, qty: 1 },
      ],
    });

    expect(response.body.items).toHaveLength(1);
    expect(response.body.items[0].slug).toBe("apple-iphone-15");
  });

  it("needs a session", async () => {
    const response = await request(app).post("/api/v1/me/cart/merge").send({ items: [] });
    expect(response.status).toBe(401);
  });
});
