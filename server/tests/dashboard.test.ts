/**
 * The overview's arithmetic (overview §10 A-3).
 *
 * Two things are worth testing here and the rest follows: that STAFF never receive the money, and that the
 * day boundaries are Lagos days — an order placed at 00:30 Lagos belongs to that day, not to the one before
 * it that UTC still thinks it is.
 */

import { beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";
import { resolvePeriod } from "../src/services/dashboard.service.js";
import { Invoice, Order, Payment } from "../src/models/index.js";
import { ADMIN_PIN, clearAdmins, signedInAdmin } from "./admin-helpers.js";
import { clearDatabase, seedFixture, seedSettings } from "./fixtures.js";
import { lineFor, registerCustomer, type Agent } from "./helpers.js";

const app = createApp();

const ADDRESS = {
  fullName: "Amina Bello",
  phone: "08039254143",
  line1: "12 Ahmadu Bello Way",
  city: "Birnin Kebbi",
  state: "Kebbi",
};

let customer: Agent;
let owner: Agent;

async function placeAndPay(): Promise<number> {
  const line = await lineFor("oraimo-freepods-4", 1);
  const placed = await customer.post("/api/v1/orders").send({
    items: [{ productId: line.productId, variantId: line.variantId, qty: 1 }],
    deliveryMethod: "LOCAL_DELIVERY",
    paymentMethod: "BANK_TRANSFER",
    newAddress: ADDRESS,
  });
  await owner
    .post(`/api/v1/admin/orders/${placed.body.orderNumber}/confirm-payment`)
    .send({ amountKobo: placed.body.totalKobo, pin: ADMIN_PIN });
  return placed.body.totalKobo as number;
}

beforeEach(async () => {
  await clearDatabase();
  await clearAdmins();
  await Payment.deleteMany({}).exec();
  await Invoice.deleteMany({}).exec();
  await seedFixture();
  await seedSettings();
  ({ agent: customer } = await registerCustomer(app));
  ({ agent: owner } = await signedInAdmin(app, "OWNER"));
});

describe("resolvePeriod", () => {
  it("starts and ends a Lagos day, not a UTC one", () => {
    // 23:30 UTC on 9 October is already 00:30 on the 10th in Lagos.
    const { current } = resolvePeriod({ period: "today" }, new Date("2026-10-09T23:30:00.000Z"));

    expect(current.from.toISOString()).toBe("2026-10-09T23:00:00.000Z");
    expect(current.to.toISOString()).toBe("2026-10-10T23:00:00.000Z");
    expect(current.days).toBe(1);
  });

  it("compares a month with the whole of the month before it", () => {
    const { current, previous } = resolvePeriod({ period: "month" }, new Date("2026-10-10T09:00:00.000Z"));

    expect(current.from.toISOString()).toBe("2026-09-30T23:00:00.000Z");
    expect(previous.from.toISOString()).toBe("2026-08-31T23:00:00.000Z");
    expect(previous.to.toISOString()).toBe("2026-09-30T23:00:00.000Z");
  });

  it("falls back to the last 30 days when a custom range is nonsense", () => {
    const { current } = resolvePeriod(
      { period: "custom", from: "not-a-date", to: "2026-10-10" },
      new Date("2026-10-10T09:00:00.000Z"),
    );
    expect(current.days).toBe(30);
  });
});

describe("GET /admin/dashboard", () => {
  it("counts revenue from confirmed payments and nets off refunds", async () => {
    const first = await placeAndPay();
    const second = await placeAndPay();

    const before = await owner.get("/api/v1/admin/dashboard").query({ period: "30d" });
    expect(before.status).toBe(200);
    expect(before.body.financial.revenueKobo.value).toBe(first + second);
    expect(before.body.financial.orders.value).toBe(2);
    expect(before.body.financial.averageOrderKobo.value).toBe(Math.round((first + second) / 2));

    const order = await Order.findOne({ paymentStatus: "PAID" }).lean().exec();
    await owner
      .post(`/api/v1/admin/orders/${order?.orderNumber}/refund`)
      .send({ reason: "Faulty on arrival", pin: ADMIN_PIN });

    const after = await owner.get("/api/v1/admin/dashboard").query({ period: "30d" });
    expect(after.body.financial.revenueKobo.value).toBe(first + second - (order?.totalKobo ?? 0));
    expect(after.body.financial.refundsKobo.value).toBe(order?.totalKobo);
  });

  it("gives every day in the window a point, including the quiet ones", async () => {
    await placeAndPay();

    const response = await owner.get("/api/v1/admin/dashboard").query({ period: "7d" });

    expect(response.body.financial.revenueByDay).toHaveLength(7);
    expect(response.body.financial.revenueByDay.at(-1).day).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(
      response.body.financial.revenueByDay.filter((day: { revenueKobo: number }) => day.revenueKobo === 0),
    ).toHaveLength(6);
  });

  it("sends staff the operational half and no money at all", async () => {
    await placeAndPay();
    const { agent: staff } = await signedInAdmin(app, "STAFF", { pin: null });

    const response = await staff.get("/api/v1/admin/dashboard").query({ period: "30d" });

    expect(response.status).toBe(200);
    expect(response.body.financial).toBeNull();
    expect(response.body.operational.unitsSold.value).toBe(1);
    expect(response.body.operational.recentOrders).toHaveLength(1);
    // Nothing anywhere in the payload names a revenue figure.
    expect(JSON.stringify(response.body)).not.toContain("revenueKobo");
  });

  it("lists the queue, what is left to fulfil and what is running out", async () => {
    await placeAndPay();

    const response = await owner.get("/api/v1/admin/dashboard").query({ period: "30d" });

    expect(response.body.operational.toFulfil.value).toBe(1);
    expect(response.body.operational.ordersByStatus).toEqual([{ status: "PAID", count: 1 }]);
    // The list is capped at ten; the tile counts them all, so it can only be the larger of the two.
    expect(response.body.operational.lowStock.length).toBeGreaterThan(0);
    expect(response.body.operational.lowStockVariants.value).toBeGreaterThanOrEqual(
      response.body.operational.lowStock.length,
    );
  });

  it("ranks the top products by what they brought in", async () => {
    await placeAndPay();

    const response = await owner.get("/api/v1/admin/dashboard").query({ period: "30d" });
    const top = response.body.financial.topProducts;

    expect(top).toHaveLength(1);
    expect(top[0].slug).toBe("oraimo-freepods-4");
    expect(top[0].units).toBe(1);
  });
});
