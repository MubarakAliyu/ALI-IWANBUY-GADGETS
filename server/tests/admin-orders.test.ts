/**
 * Orders, payments and invoices from the dashboard (overview §10 A-4, A-7, A-8).
 *
 * The things these tests are really checking: money only moves with a PIN, it moves exactly once, an invoice
 * exists for every confirmed payment, a refund puts the stock back, and every one of those writes an audit
 * row. The PDF is rendered for real — a document that cannot be produced is not an invoice.
 */

import { beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";
import { Invoice, Order, Payment } from "../src/models/index.js";
import { ADMIN_PIN, auditRows, clearAdmins, signedInAdmin } from "./admin-helpers.js";
import { clearDatabase, seedFixture, seedSettings } from "./fixtures.js";
import { lineFor, registerCustomer, stockOf, type Agent } from "./helpers.js";

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

/** A placed, unpaid bank-transfer order for two pairs of earbuds, and what it came to. */
async function placeOrder(): Promise<{ orderNumber: string; totalKobo: number }> {
  const line = await lineFor("oraimo-freepods-4", 2);
  const response = await customer.post("/api/v1/orders").send({
    items: [{ productId: line.productId, variantId: line.variantId, qty: 2 }],
    deliveryMethod: "LOCAL_DELIVERY",
    paymentMethod: "BANK_TRANSFER",
    newAddress: ADDRESS,
  });
  if (response.status !== 201) {
    throw new Error(`Could not place a test order: ${response.status} ${JSON.stringify(response.body)}`);
  }
  return { orderNumber: response.body.orderNumber, totalKobo: response.body.totalKobo };
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

describe("GET /admin/orders", () => {
  it("lists every order with the customer on the row", async () => {
    const { orderNumber } = await placeOrder();

    const response = await owner.get("/api/v1/admin/orders");

    expect(response.status).toBe(200);
    expect(response.body.total).toBe(1);
    expect(response.body.data[0].orderNumber).toBe(orderNumber);
    expect(response.body.data[0].customerName).toBe("Amina Bello");
    expect(response.body.data[0].invoiceNumber).toBeNull();
  });

  it("finds an order by the customer's name as well as by its number", async () => {
    const { orderNumber } = await placeOrder();

    const byName = await owner.get("/api/v1/admin/orders").query({ q: "amina" });
    const byNumber = await owner.get("/api/v1/admin/orders").query({ q: orderNumber });
    const byNobody = await owner.get("/api/v1/admin/orders").query({ q: "zzzznobody" });

    expect(byName.body.total).toBe(1);
    expect(byNumber.body.total).toBe(1);
    expect(byNobody.body.total).toBe(0);
  });

  it("exports the filtered set as CSV", async () => {
    const { orderNumber } = await placeOrder();

    const response = await owner.get("/api/v1/admin/orders/export");

    expect(response.status).toBe(200);
    expect(response.headers["content-type"]).toContain("text/csv");
    expect(response.headers["content-disposition"]).toMatch(/aib-orders-\d{4}-\d{2}-\d{2}\.csv/);
    expect(response.text).toContain("Order,Placed,Customer");
    expect(response.text).toContain(orderNumber);
    // Money is a plain number a spreadsheet can add up — no symbol, no separators.
    expect(response.text).toMatch(/,\d+\.\d{2},/);
  });

  it("answers 404 for an order number that does not exist", async () => {
    expect((await owner.get("/api/v1/admin/orders/AIB-ORD-202610-9999")).status).toBe(404);
  });
});

describe("POST /admin/orders/:number/confirm-payment", () => {
  it("records the payment, issues the invoice, moves the order and audits it", async () => {
    const { orderNumber, totalKobo } = await placeOrder();

    const response = await owner
      .post(`/api/v1/admin/orders/${orderNumber}/confirm-payment`)
      .send({ amountKobo: totalKobo, reference: "MNP-884412", pin: ADMIN_PIN });

    expect(response.status).toBe(201);
    expect(response.body.paymentNumber).toMatch(/^AIB-PAY-\d{6}-\d{4}$/);
    expect(response.body.invoiceNumber).toMatch(/^AIB-INV-\d{6}-\d{4}$/);
    expect(response.body.order.paymentStatus).toBe("PAID");
    expect(response.body.order.status).toBe("PAID");

    const payment = await Payment.findOne({ paymentNumber: response.body.paymentNumber }).lean().exec();
    expect(payment?.amountKobo).toBe(totalKobo);
    expect(payment?.reference).toBe("MNP-884412");
    expect(payment?.status).toBe("CONFIRMED");

    const order = await Order.findOne({ orderNumber }).lean().exec();
    expect(order?.invoice).not.toBeNull();
    expect(order?.paidAt).toBeInstanceOf(Date);

    const rows = await auditRows("PAYMENT_CONFIRMED");
    expect(rows).toHaveLength(1);
    expect(rows[0]?.summary).toContain(orderNumber);
  });

  it("refuses without the PIN and leaves nothing behind", async () => {
    const { orderNumber, totalKobo } = await placeOrder();

    const response = await owner
      .post(`/api/v1/admin/orders/${orderNumber}/confirm-payment`)
      .send({ amountKobo: totalKobo, pin: "1357" });

    expect(response.status).toBe(401);
    expect(await Payment.countDocuments({})).toBe(0);
    expect(await Invoice.countDocuments({})).toBe(0);
    expect((await Order.findOne({ orderNumber }).lean().exec())?.paymentStatus).toBe("UNPAID");
  });

  it("will not take a part payment", async () => {
    const { orderNumber, totalKobo } = await placeOrder();

    const response = await owner
      .post(`/api/v1/admin/orders/${orderNumber}/confirm-payment`)
      .send({ amountKobo: totalKobo - 100_000, pin: ADMIN_PIN });

    expect(response.status).toBe(400);
    expect(await Payment.countDocuments({})).toBe(0);
  });

  it("cannot confirm the same order twice", async () => {
    const { orderNumber, totalKobo } = await placeOrder();
    const body = { amountKobo: totalKobo, pin: ADMIN_PIN };

    expect((await owner.post(`/api/v1/admin/orders/${orderNumber}/confirm-payment`).send(body)).status).toBe(
      201,
    );
    const second = await owner.post(`/api/v1/admin/orders/${orderNumber}/confirm-payment`).send(body);

    expect(second.status).toBe(409);
    expect(second.body.error.code).toBe("ALREADY_PAID");
    expect(await Payment.countDocuments({})).toBe(1);
    expect(await Invoice.countDocuments({})).toBe(1);
  });
});

describe("POST /admin/orders/:number/status", () => {
  it("advances an order only where the lifecycle allows", async () => {
    const { orderNumber, totalKobo } = await placeOrder();
    await owner
      .post(`/api/v1/admin/orders/${orderNumber}/confirm-payment`)
      .send({ amountKobo: totalKobo, pin: ADMIN_PIN });

    const forward = await owner
      .post(`/api/v1/admin/orders/${orderNumber}/status`)
      .send({ status: "PROCESSING", note: "Packing it now" });
    expect(forward.status).toBe(200);
    expect(forward.body.status).toBe("PROCESSING");
    expect(forward.body.nextStatuses).toContain("SHIPPED");

    const backwards = await owner
      .post(`/api/v1/admin/orders/${orderNumber}/status`)
      .send({ status: "PENDING_PAYMENT" });
    expect(backwards.status).toBe(409);
    expect(backwards.body.error.code).toBe("INVALID_TRANSITION");
  });

  it("sends cancelling and refunding to their own actions", async () => {
    const { orderNumber } = await placeOrder();

    for (const status of ["CANCELLED", "REFUNDED"]) {
      const response = await owner.post(`/api/v1/admin/orders/${orderNumber}/status`).send({ status });
      expect(response.status, status).toBe(400);
    }
  });
});

describe("cancelling and refunding", () => {
  it("cancels an unpaid order without a PIN and puts the stock back", async () => {
    const before = await stockOf("oraimo-freepods-4");
    const { orderNumber } = await placeOrder();
    expect(await stockOf("oraimo-freepods-4")).toBe(before - 2);

    const response = await owner
      .post(`/api/v1/admin/orders/${orderNumber}/cancel`)
      .send({ reason: "Customer could not pay" });

    expect(response.status).toBe(200);
    expect(response.body.status).toBe("CANCELLED");
    expect(await stockOf("oraimo-freepods-4")).toBe(before);
  });

  it("asks for the PIN before cancelling an order that has been paid for", async () => {
    const { orderNumber, totalKobo } = await placeOrder();
    await owner
      .post(`/api/v1/admin/orders/${orderNumber}/confirm-payment`)
      .send({ amountKobo: totalKobo, pin: ADMIN_PIN });

    const withoutPin = await owner
      .post(`/api/v1/admin/orders/${orderNumber}/cancel`)
      .send({ reason: "Wrong item ordered" });
    expect(withoutPin.status).toBe(403);
    expect(withoutPin.body.error.code).toBe("PIN_REQUIRED");

    const withPin = await owner
      .post(`/api/v1/admin/orders/${orderNumber}/cancel`)
      .send({ reason: "Wrong item ordered", pin: ADMIN_PIN });
    expect(withPin.status).toBe(200);
  });

  it("refunds as a negative payment, restocks and marks the order", async () => {
    const before = await stockOf("oraimo-freepods-4");
    const { orderNumber, totalKobo } = await placeOrder();
    await owner
      .post(`/api/v1/admin/orders/${orderNumber}/confirm-payment`)
      .send({ amountKobo: totalKobo, pin: ADMIN_PIN });

    const response = await owner
      .post(`/api/v1/admin/orders/${orderNumber}/refund`)
      .send({ reason: "Faulty on arrival", pin: ADMIN_PIN });

    expect(response.status).toBe(200);
    expect(response.body.status).toBe("REFUNDED");
    expect(response.body.paymentStatus).toBe("REFUNDED");
    expect(await stockOf("oraimo-freepods-4")).toBe(before);

    const refund = await Payment.findOne({ status: "REFUNDED", refundOf: { $ne: null } })
      .lean()
      .exec();
    expect(refund?.amountKobo).toBe(-totalKobo);

    expect(await auditRows("ORDER_REFUNDED")).toHaveLength(1);
  });

  it("will not refund an order nobody has paid for", async () => {
    const { orderNumber } = await placeOrder();

    const response = await owner
      .post(`/api/v1/admin/orders/${orderNumber}/refund`)
      .send({ reason: "Changed their mind", pin: ADMIN_PIN });

    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe("NOT_PAID");
  });
});

describe("the payments page", () => {
  it("shows the awaiting-confirmation queue", async () => {
    const { orderNumber } = await placeOrder();
    await customer.post(`/api/v1/orders/${orderNumber}/transfer-made`).send({ reference: "MNP-11223" });

    const response = await owner.get("/api/v1/admin/payments/awaiting");

    expect(response.status).toBe(200);
    expect(response.body.data).toHaveLength(1);
    expect(response.body.data[0].orderNumber).toBe(orderNumber);
    expect(response.body.data[0].reference).toBe("MNP-11223");
  });

  it("totals the filtered set, with refunds taken off", async () => {
    const { orderNumber, totalKobo } = await placeOrder();
    await owner
      .post(`/api/v1/admin/orders/${orderNumber}/confirm-payment`)
      .send({ amountKobo: totalKobo, pin: ADMIN_PIN });

    const paid = await owner.get("/api/v1/admin/payments");
    expect(paid.body.totals).toEqual({
      confirmedKobo: totalKobo,
      refundedKobo: 0,
      netKobo: totalKobo,
      count: 1,
    });

    await owner
      .post(`/api/v1/admin/orders/${orderNumber}/refund`)
      .send({ reason: "Faulty on arrival", pin: ADMIN_PIN });

    const after = await owner.get("/api/v1/admin/payments");
    expect(after.body.totals.refundedKobo).toBe(totalKobo);
    expect(after.body.totals.netKobo).toBe(0);
    expect(after.body.totals.count).toBe(2);
  });
});

describe("invoices", () => {
  async function paidOrder(): Promise<{ orderNumber: string; invoiceNumber: string }> {
    const { orderNumber, totalKobo } = await placeOrder();
    const confirmed = await owner
      .post(`/api/v1/admin/orders/${orderNumber}/confirm-payment`)
      .send({ amountKobo: totalKobo, pin: ADMIN_PIN });
    return { orderNumber, invoiceNumber: confirmed.body.invoiceNumber };
  }

  it("renders a real PDF on the first download and keeps it", async () => {
    const { invoiceNumber } = await paidOrder();

    const response = await owner.get(`/api/v1/admin/invoices/${invoiceNumber}.pdf`);

    expect(response.status).toBe(200);
    expect(response.headers["content-type"]).toContain("application/pdf");
    expect(response.body.subarray(0, 5).toString()).toBe("%PDF-");
    // A branded A4 page with embedded fonts and a logo is not a few hundred bytes.
    expect(response.body.length).toBeGreaterThan(10_000);

    const stored = await Invoice.findOne({ invoiceNumber }).lean().exec();
    expect(stored?.pdfPath).toMatch(/invoices/);

    // Asked for again, it comes from disk and is byte-identical.
    const again = await owner.get(`/api/v1/admin/invoices/${invoiceNumber}.pdf`);
    expect(again.body.length).toBe(response.body.length);
  });

  it("breaks a long order over more than one page", async () => {
    const { invoiceNumber } = await paidOrder();

    // Twenty lines is more than fits under the header, so the document has to grow a second page.
    const order = await Order.findOne({}).exec();
    const line = order?.items[0];
    if (!order || !line) {
      throw new Error("The test order has no items.");
    }
    order.items = Array.from({ length: 20 }, (_, index) => ({
      ...line,
      sku: `${line.sku}-${index}`,
    }));
    await order.save();
    await Invoice.updateOne({ invoiceNumber }, { $set: { pdfPath: "" } }).exec();

    const response = await owner.get(`/api/v1/admin/invoices/${invoiceNumber}.pdf`);

    expect(response.status).toBe(200);
    // `/Type /Page` appears once per page; a one-page invoice would match once.
    const pages = response.body.toString("latin1").match(/\/Type\s*\/Page[^s]/g) ?? [];
    expect(pages.length).toBeGreaterThan(1);
  });

  it("lists invoices with who issued them", async () => {
    const { orderNumber, invoiceNumber } = await paidOrder();

    const response = await owner.get("/api/v1/admin/invoices");

    expect(response.status).toBe(200);
    expect(response.body.data[0]).toMatchObject({
      invoiceNumber,
      orderNumber,
      customerName: "Amina Bello",
      status: "ISSUED",
      sentCount: 0,
      issuedBy: "Ali Abdullahi",
    });
  });

  it("emails the invoice and records every send", async () => {
    const { invoiceNumber } = await paidOrder();

    const first = await owner.post(`/api/v1/admin/invoices/${invoiceNumber}/send`);
    expect(first.status).toBe(200);
    expect(first.body.sentCount).toBe(1);

    const second = await owner.post(`/api/v1/admin/invoices/${invoiceNumber}/send`);
    expect(second.body.sentCount).toBe(2);

    const stored = await Invoice.findOne({ invoiceNumber }).lean().exec();
    expect(stored?.status).toBe("SENT");
    expect(stored?.sentAt).toHaveLength(2);
    expect(await auditRows("INVOICE_SENT")).toHaveLength(2);
  });

  it("voids an invoice with a reason and then refuses to send it", async () => {
    const { invoiceNumber } = await paidOrder();

    const voided = await owner
      .post(`/api/v1/admin/invoices/${invoiceNumber}/void`)
      .send({ reason: "Issued against the wrong order" });

    expect(voided.status).toBe(200);
    expect(voided.body.status).toBe("VOID");
    expect(voided.body.voidReason).toBe("Issued against the wrong order");

    const send = await owner.post(`/api/v1/admin/invoices/${invoiceNumber}/send`);
    expect(send.status).toBe(409);
    expect(await auditRows("INVOICE_VOIDED")).toHaveLength(1);
  });

  it("lets the customer download their own invoice and nobody else's", async () => {
    const { orderNumber } = await paidOrder();

    const mine = await customer.get(`/api/v1/orders/${orderNumber}/invoice.pdf`);
    expect(mine.status).toBe(200);
    expect(mine.body.subarray(0, 5).toString()).toBe("%PDF-");

    const { agent: stranger } = await registerCustomer(app, { email: "stranger@example.com" });
    const theirs = await stranger.get(`/api/v1/orders/${orderNumber}/invoice.pdf`);
    expect(theirs.status).toBe(404);
  });

  it("answers 404 while an order is still unpaid", async () => {
    const { orderNumber } = await placeOrder();
    expect((await customer.get(`/api/v1/orders/${orderNumber}/invoice.pdf`)).status).toBe(404);
  });
});

describe("internal notes", () => {
  it("adds a note that only the dashboard sees", async () => {
    const { orderNumber } = await placeOrder();

    const response = await owner
      .post(`/api/v1/admin/orders/${orderNumber}/notes`)
      .send({ body: "Customer will collect on Saturday." });

    expect(response.status).toBe(200);
    expect(response.body.adminNotes).toHaveLength(1);
    expect(response.body.adminNotes[0]).toMatchObject({
      body: "Customer will collect on Saturday.",
      by: "Ali Abdullahi",
    });

    const asCustomer = await customer.get(`/api/v1/orders/${orderNumber}`);
    expect(asCustomer.status).toBe(200);
    expect(asCustomer.body.adminNotes).toBeUndefined();
  });
});
