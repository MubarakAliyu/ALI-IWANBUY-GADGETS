import { beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";
import { runAutoCancel } from "../src/jobs/auto-cancel.js";
import { AuditLog, Cart, Order } from "../src/models/index.js";
import { clearDatabase, seedFixture, seedSettings } from "./fixtures.js";
import { lineFor, registerCustomer, setStock, stockOf, type Agent } from "./helpers.js";

const app = createApp();

const ADDRESS = {
  fullName: "Amina Bello",
  phone: "08039254143",
  line1: "12 Ahmadu Bello Way",
  city: "Birnin Kebbi",
  state: "Kebbi",
};

let agent: Agent;

beforeEach(async () => {
  await clearDatabase();
  await seedFixture();
  await seedSettings();
  ({ agent } = await registerCustomer(app));
});

async function placeOrder(overrides: Record<string, unknown> = {}) {
  const line = await lineFor("apple-iphone-15", 2);
  return agent.post("/api/v1/orders").send({
    items: [{ productId: line.productId, variantId: line.variantId, qty: line.qty }],
    deliveryMethod: "LOCAL_DELIVERY",
    paymentMethod: "BANK_TRANSFER",
    newAddress: ADDRESS,
    ...overrides,
  });
}

describe("POST /orders", () => {
  it("places an order, takes the stock and clears the cart", async () => {
    // Earbuds, not a phone: this order has to stay under the free-delivery threshold so the fee is charged.
    const line = await lineFor("oraimo-freepods-4", 2);
    const stockBefore = await stockOf("oraimo-freepods-4");

    await agent
      .put("/api/v1/me/cart")
      .send({ items: [{ productId: line.productId, variantId: line.variantId, qty: 2 }] });

    const response = await placeOrder({
      items: [{ productId: line.productId, variantId: line.variantId, qty: 2 }],
    });

    expect(response.status).toBe(201);
    expect(response.body.orderNumber).toMatch(/^AIB-ORD-\d{6}-\d{4}$/);
    expect(response.body.status).toBe("PENDING_PAYMENT");
    expect(response.body.paymentStatus).toBe("UNPAID");
    expect(response.body.items).toHaveLength(1);

    // Totals are computed from the catalogue: 2 × the variant price, plus the local delivery fee.
    expect(response.body.subtotalKobo).toBe(line.priceKobo * 2);
    expect(response.body.deliveryFeeKobo).toBe(150_000);
    expect(response.body.totalKobo).toBe(line.priceKobo * 2 + 150_000);

    expect(await stockOf("oraimo-freepods-4")).toBe(stockBefore - 2);

    const cart = await Cart.findOne().lean().exec();
    expect(cart?.items).toEqual([]);

    const audit = await AuditLog.findOne({ action: "ORDER_PLACED" }).lean().exec();
    expect(audit?.entityType).toBe("Order");
  });

  it("ignores any price the client sends", async () => {
    const line = await lineFor("apple-iphone-15", 1);
    const response = await agent.post("/api/v1/orders").send({
      items: [
        {
          productId: line.productId,
          variantId: line.variantId,
          qty: 1,
          unitPriceKobo: 1,
          lineTotalKobo: 1,
          priceKobo: 1,
        },
      ],
      deliveryMethod: "PICKUP",
      paymentMethod: "PAY_ON_DELIVERY",
      subtotalKobo: 1,
      totalKobo: 1,
    });

    expect(response.status).toBe(201);
    expect(response.body.items[0].unitPriceKobo).toBe(line.priceKobo);
    expect(response.body.totalKobo).toBe(line.priceKobo);
  });

  it("charges nothing to deliver when the order is collected", async () => {
    const response = await placeOrder({ deliveryMethod: "PICKUP", newAddress: undefined });
    expect(response.status).toBe(201);
    expect(response.body.deliveryFeeKobo).toBe(0);
    expect(response.body.shippingAddress).toBeNull();
  });

  it("delivers free once the order is over the threshold", async () => {
    // The fixture threshold is ₦500,000; two iPhones are well past it.
    const line = await lineFor("apple-iphone-15", 2);
    const response = await agent.post("/api/v1/orders").send({
      items: [{ productId: line.productId, variantId: line.variantId, qty: 2 }],
      deliveryMethod: "NATIONWIDE",
      paymentMethod: "BANK_TRANSFER",
      newAddress: ADDRESS,
    });

    expect(response.body.deliveryFeeKobo).toBe(0);
  });

  it("sends pay-on-delivery orders straight into fulfilment", async () => {
    const response = await placeOrder({ paymentMethod: "PAY_ON_DELIVERY" });
    expect(response.body.status).toBe("PROCESSING");
    expect(response.body.paymentStatus).toBe("UNPAID");
  });

  it("refuses to deliver without an address", async () => {
    const response = await placeOrder({ newAddress: undefined, addressId: undefined });
    expect(response.status).toBe(400);
  });

  it("refuses a product that is no longer on sale", async () => {
    const line = await lineFor("oraimo-draft-earbuds", 1);
    const response = await placeOrder({
      items: [{ productId: line.productId, variantId: line.variantId, qty: 1 }],
    });

    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe("ITEM_UNAVAILABLE");
  });

  it("refuses more than is in stock, and leaves the stock alone", async () => {
    await setStock("apple-iphone-15", 1);
    const line = await lineFor("apple-iphone-15", 3);

    const response = await agent.post("/api/v1/orders").send({
      items: [{ productId: line.productId, variantId: line.variantId, qty: 3 }],
      deliveryMethod: "PICKUP",
      paymentMethod: "PAY_ON_DELIVERY",
    });

    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe("OUT_OF_STOCK");
    expect(response.body.error.message).toContain("Only 1 left");
    expect(await stockOf("apple-iphone-15")).toBe(1);
    expect(await Order.countDocuments()).toBe(0);
  });

  it("sells the last unit exactly once when ten customers race for it", async () => {
    await setStock("apple-iphone-15", 1);
    const line = await lineFor("apple-iphone-15", 1);

    // Ten separate customers, each with their own session, all pressing "Place order" together.
    const buyers = await Promise.all(Array.from({ length: 10 }, () => registerCustomer(app)));

    const responses = await Promise.all(
      buyers.map((buyer) =>
        buyer.agent.post("/api/v1/orders").send({
          items: [{ productId: line.productId, variantId: line.variantId, qty: 1 }],
          deliveryMethod: "PICKUP",
          paymentMethod: "PAY_ON_DELIVERY",
        }),
      ),
    );

    const created = responses.filter((response) => response.status === 201);
    const refused = responses.filter((response) => response.status === 409);

    expect(created).toHaveLength(1);
    expect(refused).toHaveLength(9);
    expect(refused.every((response) => response.body.error.code === "OUT_OF_STOCK")).toBe(true);

    expect(await stockOf("apple-iphone-15")).toBe(0);
    expect(await Order.countDocuments()).toBe(1);
  });

  it("gives every order its own number", async () => {
    const line = await lineFor("oraimo-freepods-4", 1);
    const numbers = await Promise.all(
      Array.from({ length: 5 }, () =>
        agent
          .post("/api/v1/orders")
          .send({
            items: [{ productId: line.productId, variantId: line.variantId, qty: 1 }],
            deliveryMethod: "PICKUP",
            paymentMethod: "PAY_ON_DELIVERY",
          })
          .then((response) => response.body.orderNumber as string),
      ),
    );

    expect(new Set(numbers).size).toBe(5);
  });
});

describe("a customer's own orders", () => {
  it("lists and filters them", async () => {
    await placeOrder();
    await placeOrder({ paymentMethod: "PAY_ON_DELIVERY" });

    const all = await agent.get("/api/v1/orders");
    expect(all.body.total).toBe(2);
    expect(all.body.data[0].placedAt >= all.body.data[1].placedAt).toBe(true);

    const pending = await agent.get("/api/v1/orders?status=PENDING_PAYMENT");
    expect(pending.body.total).toBe(1);
  });

  it("hides another customer's order behind a 404", async () => {
    const mine = await placeOrder();
    const stranger = await registerCustomer(app);

    const response = await stranger.agent.get(`/api/v1/orders/${mine.body.orderNumber}`);
    expect(response.status).toBe(404);
  });

  it("has no invoice to download yet", async () => {
    const order = await placeOrder();
    const response = await agent.get(`/api/v1/orders/${order.body.orderNumber}/invoice.pdf`);
    expect(response.status).toBe(404);
  });
});

describe("I have made the transfer", () => {
  it("moves the order to awaiting confirmation and keeps the reference", async () => {
    const order = await placeOrder();

    const response = await agent
      .post(`/api/v1/orders/${order.body.orderNumber}/transfer-made`)
      .send({ reference: "GTB/123456" });

    expect(response.status).toBe(200);
    expect(response.body.status).toBe("AWAITING_CONFIRMATION");
    expect(response.body.paymentStatus).toBe("AWAITING_CONFIRMATION");
    expect(response.body.customerTransferRef).toBe("GTB/123456");
    expect(response.body.statusHistory).toHaveLength(2);
  });

  it("refuses to be declared twice, and refuses it on a pay-on-delivery order", async () => {
    const order = await placeOrder();
    await agent.post(`/api/v1/orders/${order.body.orderNumber}/transfer-made`).send({});

    const again = await agent.post(`/api/v1/orders/${order.body.orderNumber}/transfer-made`).send({});
    expect(again.status).toBe(409);
    expect(again.body.error.code).toBe("INVALID_TRANSITION");

    const cash = await placeOrder({ paymentMethod: "PAY_ON_DELIVERY" });
    const refused = await agent.post(`/api/v1/orders/${cash.body.orderNumber}/transfer-made`).send({});
    expect(refused.body.error.code).toBe("NOT_A_TRANSFER");
  });
});

describe("cancelling", () => {
  it("puts the stock back", async () => {
    const before = await stockOf("apple-iphone-15");
    const order = await placeOrder();
    expect(await stockOf("apple-iphone-15")).toBe(before - 2);

    const response = await agent
      .post(`/api/v1/orders/${order.body.orderNumber}/cancel`)
      .send({ reason: "Ordered the wrong colour" });

    expect(response.status).toBe(200);
    expect(response.body.status).toBe("CANCELLED");
    expect(response.body.cancelledReason).toBe("Ordered the wrong colour");
    expect(await stockOf("apple-iphone-15")).toBe(before);
  });

  it("can still be cancelled after the customer says they paid", async () => {
    const order = await placeOrder();
    await agent.post(`/api/v1/orders/${order.body.orderNumber}/transfer-made`).send({});

    const response = await agent.post(`/api/v1/orders/${order.body.orderNumber}/cancel`).send({});
    expect(response.status).toBe(200);
  });

  it("refuses once the order is being prepared", async () => {
    const order = await placeOrder({ paymentMethod: "PAY_ON_DELIVERY" });

    const response = await agent.post(`/api/v1/orders/${order.body.orderNumber}/cancel`).send({});
    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe("CANNOT_CANCEL");
  });

  it("restocks only once when two cancels race", async () => {
    const before = await stockOf("apple-iphone-15");
    const order = await placeOrder();

    const [first, second] = await Promise.all([
      agent.post(`/api/v1/orders/${order.body.orderNumber}/cancel`).send({}),
      agent.post(`/api/v1/orders/${order.body.orderNumber}/cancel`).send({}),
    ]);

    expect([first.status, second.status].sort()).toEqual([200, 409]);
    expect(await stockOf("apple-iphone-15")).toBe(before);
  });

  it("will not cancel someone else's order", async () => {
    const mine = await placeOrder();
    const stranger = await registerCustomer(app);

    const response = await stranger.agent.post(`/api/v1/orders/${mine.body.orderNumber}/cancel`).send({});
    expect(response.status).toBe(404);
  });
});

describe("the auto-cancel job", () => {
  it("cancels unpaid orders past the window and restocks them", async () => {
    const before = await stockOf("apple-iphone-15");
    const order = await placeOrder();

    // Nothing to do while the order is still inside the 48-hour window.
    expect(await runAutoCancel()).toEqual([]);

    await Order.updateOne(
      { orderNumber: order.body.orderNumber },
      { $set: { placedAt: new Date(Date.now() - 49 * 60 * 60 * 1000) } },
    ).exec();

    expect(await runAutoCancel()).toEqual([order.body.orderNumber]);
    expect(await stockOf("apple-iphone-15")).toBe(before);

    const cancelled = await Order.findOne({ orderNumber: order.body.orderNumber }).lean().exec();
    expect(cancelled?.status).toBe("CANCELLED");
    expect(cancelled?.statusHistory.at(-1)?.byType).toBe("SYSTEM");
  });

  it("leaves orders that are already paid for or being prepared alone", async () => {
    const order = await placeOrder({ paymentMethod: "PAY_ON_DELIVERY" });
    await Order.updateOne(
      { orderNumber: order.body.orderNumber },
      { $set: { placedAt: new Date(Date.now() - 400 * 60 * 60 * 1000) } },
    ).exec();

    expect(await runAutoCancel()).toEqual([]);
  });
});
