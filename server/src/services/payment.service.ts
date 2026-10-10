/**
 * Confirming that money arrived (overview §10 A-4/A-7, CLAUDE.md non-negotiables).
 *
 * This is the one place an order becomes PAID, and it is deliberately narrow:
 *
 *   • the acting admin re-enters their own PIN — being signed in is not enough (overview §6.5);
 *   • the amount must equal the order total, because a part payment is not a payment (v1);
 *   • the order must be in a state where payment is expected, so a second click cannot confirm twice;
 *   • the `Payment` row, the order's new state and the `Invoice` are written in **one transaction**, so there
 *     is never a payment without an invoice or an invoice without an order to match it.
 *
 * The confirmation email is sent after the transaction commits — an email is not worth rolling back for.
 */

import {
  multiplyKobo,
  type OrderStatus,
  type PaymentQuery,
  type PaymentRow,
  type PaymentTotals,
} from "@aib/shared";
import type { Request } from "express";
import mongoose, { type FilterQuery, type Types } from "mongoose";
import { env } from "../config/env.js";
import { AppError } from "../lib/app-error.js";
import { sendMailSafely } from "../lib/mailer/index.js";
import { paymentConfirmedEmail } from "../lib/mailer/templates.js";
import { lagosDayEnd, lagosDayStart } from "../lib/dates.js";
import { nextNumber } from "../lib/numbering.js";
import { assertTransition } from "../lib/order-lifecycle.js";
import { paginate, skipFor, type Paginated } from "../lib/pagination.js";
import { companyBlock, loadSettings } from "../lib/settings.js";
import {
  Customer,
  Invoice,
  Order,
  Payment,
  Product,
  type OrderDoc,
  type PaymentDoc,
} from "../models/index.js";
import type { SignedInAdmin } from "../middleware/require-admin.js";
import { recordAudit } from "./audit.service.js";
import { toOrderDetail } from "./order.service.js";
import { verifyPin } from "./pin.service.js";

export type ConfirmPaymentInput = {
  pin: string;
  amountKobo: number;
  reference?: string;
  note?: string;
};

/** The states from which a payment can be confirmed, by payment method. */
function assertPayable(order: OrderDoc): void {
  if (order.paymentStatus === "PAID") {
    throw new AppError(409, "ALREADY_PAID", `${order.orderNumber} has already been marked paid.`);
  }
  if (order.paymentStatus === "REFUNDED") {
    throw new AppError(409, "ALREADY_REFUNDED", `${order.orderNumber} has been refunded.`);
  }

  const payable: OrderStatus[] =
    order.paymentMethod === "BANK_TRANSFER"
      ? ["PENDING_PAYMENT", "AWAITING_CONFIRMATION"]
      : ["PROCESSING", "READY_FOR_PICKUP", "SHIPPED", "DELIVERED"];

  if (!payable.includes(order.status)) {
    throw new AppError(
      409,
      "NOT_PAYABLE",
      `${order.orderNumber} is ${order.status.toLowerCase().replace(/_/g, " ")} — payment cannot be confirmed from there.`,
    );
  }
}

export async function confirmPayment(
  orderNumber: string,
  input: ConfirmPaymentInput,
  admin: SignedInAdmin,
  req?: Request,
): Promise<{ order: ReturnType<typeof toOrderDetail>; invoiceNumber: string; paymentNumber: string }> {
  // The PIN is checked before anything else, and outside the transaction: a wrong PIN should cost nothing.
  await verifyPin(admin._id.toString(), input.pin, req);

  const existing = await Order.findOne({ orderNumber }).lean().exec();
  if (!existing) {
    throw AppError.notFound("We cannot find that order.");
  }
  assertPayable(existing as OrderDoc);

  if (input.amountKobo !== existing.totalKobo) {
    throw AppError.badRequest(
      `The amount must match the order total exactly. This order is for ${existing.totalKobo} kobo.`,
      [{ path: "amountKobo", message: "Must equal the order total" }],
    );
  }

  const settings = await loadSettings();
  const session = await mongoose.startSession();

  let confirmed: OrderDoc | undefined;
  let paymentNumber = "";
  let invoiceNumber = "";

  try {
    await session.withTransaction(async () => {
      // Re-read inside the transaction: two admins pressing confirm at once must produce one payment.
      const order = await Order.findOne({ orderNumber }).session(session).exec();
      if (!order) {
        throw AppError.notFound("We cannot find that order.");
      }
      assertPayable(order.toObject() as OrderDoc);

      const confirmedAt = new Date();

      // A bank-transfer order moves into fulfilment; a pay-on-delivery order is already there.
      const nextStatus: OrderStatus = order.paymentMethod === "BANK_TRANSFER" ? "PAID" : order.status;
      if (nextStatus !== order.status) {
        assertTransition(order.status, nextStatus, "ADMIN");
      }

      paymentNumber = await nextNumber("payment", { at: confirmedAt, session });
      const [payment] = await Payment.create(
        [
          {
            paymentNumber,
            order: order._id,
            customer: order.customer,
            amountKobo: input.amountKobo,
            method: order.paymentMethod,
            reference: input.reference?.trim() || order.customerTransferRef || null,
            status: "CONFIRMED",
            confirmedBy: admin._id,
            confirmedAt,
            note: input.note?.trim() || null,
          },
        ],
        { session },
      );

      invoiceNumber = await nextNumber("invoice", { at: confirmedAt, session });
      const [invoice] = await Invoice.create(
        [
          {
            invoiceNumber,
            order: order._id,
            customer: order.customer,
            issuedBy: admin._id,
            issuedAt: confirmedAt,
            totalKobo: order.totalKobo,
            pdfPath: "",
            sentAt: [],
            status: "ISSUED",
          },
        ],
        { session },
      );

      order.paymentStatus = "PAID";
      order.paidAt = confirmedAt;
      order.invoice = invoice?._id ?? null;
      order.status = nextStatus;
      order.statusHistory.push({
        status: nextStatus,
        at: confirmedAt,
        by: admin._id,
        byType: "ADMIN",
        byName: `${admin.firstName} ${admin.lastName}`,
        note: `Payment confirmed — ${paymentNumber}`,
      });
      await order.save({ session });
      confirmed = order.toObject() as OrderDoc;

      await recordAudit({
        actorType: "ADMIN",
        actor: admin._id,
        actorName: `${admin.firstName} ${admin.lastName}`,
        action: "PAYMENT_CONFIRMED",
        entityType: "Order",
        entityId: order._id,
        summary: `Confirmed ${input.amountKobo} kobo against ${order.orderNumber} (${paymentNumber}), invoice ${invoiceNumber}`,
        before: { paymentStatus: existing.paymentStatus, status: existing.status },
        after: { paymentStatus: "PAID", status: nextStatus, payment: paymentNumber, invoice: invoiceNumber },
        session,
        ...(req ? { req } : {}),
      });

      void payment;
    });
  } finally {
    await session.endSession();
  }

  if (!confirmed) {
    throw new AppError(500, "CONFIRM_FAILED", "The payment could not be confirmed. Please try again.");
  }

  const customer = await Customer.findById(confirmed.customer).select("firstName email").lean().exec();
  if (customer) {
    await sendMailSafely(
      paymentConfirmedEmail({
        to: customer.email,
        firstName: customer.firstName,
        orderNumber: confirmed.orderNumber,
        amountKobo: confirmed.totalKobo,
        invoiceNumber,
        orderUrl: `${env.CLIENT_ORIGIN}/account/orders/${confirmed.orderNumber}`,
        company: companyBlock(settings),
      }),
    );
  }

  return { order: toOrderDetail(confirmed), invoiceNumber, paymentNumber };
}

/**
 * Refunding (overview §10 A-4). Like confirming, it needs the PIN and runs in one transaction — and like
 * cancelling, it puts the stock back, because a refunded order is one the shop still has.
 */
export async function refundOrder(
  orderNumber: string,
  input: { pin: string; reason: string },
  admin: SignedInAdmin,
  req?: Request,
): Promise<ReturnType<typeof toOrderDetail>> {
  await verifyPin(admin._id.toString(), input.pin, req);

  const existing = await Order.findOne({ orderNumber }).lean().exec();
  if (!existing) {
    throw AppError.notFound("We cannot find that order.");
  }
  if (existing.paymentStatus !== "PAID") {
    throw new AppError(409, "NOT_PAID", "Only an order that has been paid for can be refunded.");
  }
  assertTransition(existing.status, "REFUNDED", "ADMIN");

  const session = await mongoose.startSession();
  let refunded: OrderDoc | undefined;

  try {
    await session.withTransaction(async () => {
      const order = await Order.findOne({ orderNumber }).session(session).exec();
      if (!order || order.paymentStatus === "REFUNDED") {
        throw new AppError(409, "ALREADY_REFUNDED", "This order has already been refunded.");
      }

      const refundedAt = new Date();

      // A refund is recorded as its own negative payment, pointing at the one it reverses.
      const original = await Payment.findOne({ order: order._id, status: "CONFIRMED" })
        .session(session)
        .exec();

      await Payment.create(
        [
          {
            paymentNumber: await nextNumber("payment", { at: refundedAt, session }),
            order: order._id,
            customer: order.customer,
            amountKobo: multiplyKobo(order.totalKobo, -1),
            method: order.paymentMethod,
            reference: original?.reference ?? null,
            status: "REFUNDED",
            confirmedBy: admin._id,
            confirmedAt: refundedAt,
            note: input.reason,
            refundOf: original?._id ?? null,
          },
        ],
        { session },
      );

      if (original) {
        original.status = "REFUNDED";
        await original.save({ session });
      }

      for (const item of order.items) {
        await Product.updateOne(
          { _id: item.product, "variants._id": item.variantId },
          { $inc: { "variants.$.stock": item.qty, totalStock: item.qty } },
          { session },
        ).exec();
      }

      order.status = "REFUNDED";
      order.paymentStatus = "REFUNDED";
      order.cancelledReason = input.reason;
      order.statusHistory.push({
        status: "REFUNDED",
        at: refundedAt,
        by: admin._id,
        byType: "ADMIN",
        byName: `${admin.firstName} ${admin.lastName}`,
        note: input.reason,
      });
      await order.save({ session });
      refunded = order.toObject() as OrderDoc;

      await recordAudit({
        actorType: "ADMIN",
        actor: admin._id,
        actorName: `${admin.firstName} ${admin.lastName}`,
        action: "ORDER_REFUNDED",
        entityType: "Order",
        entityId: order._id,
        summary: `Refunded ${order.orderNumber} and returned its stock`,
        before: { status: existing.status, paymentStatus: existing.paymentStatus },
        after: { status: "REFUNDED", paymentStatus: "REFUNDED", reason: input.reason },
        session,
        ...(req ? { req } : {}),
      });
    });
  } finally {
    await session.endSession();
  }

  if (!refunded) {
    throw new AppError(500, "REFUND_FAILED", "The refund could not be recorded. Please try again.");
  }
  return toOrderDetail(refunded);
}

/** The queue the payments page opens with: orders whose customers say they have paid. */
export async function awaitingConfirmation(): Promise<
  { orderNumber: string; customerName: string; totalKobo: number; placedAt: string; reference: string | null }[]
> {
  const orders = await Order.find({ status: "AWAITING_CONFIRMATION" })
    .sort({ placedAt: 1 })
    .populate("customer", "firstName lastName")
    .lean()
    .exec();

  return orders.map((order) => {
    const customer = order.customer as unknown as { firstName?: string; lastName?: string } | Types.ObjectId;
    const name =
      typeof customer === "object" && "firstName" in customer
        ? `${customer.firstName} ${customer.lastName}`
        : "Customer";
    return {
      orderNumber: order.orderNumber,
      customerName: name,
      totalKobo: order.totalKobo,
      placedAt: order.placedAt.toISOString(),
      reference: order.customerTransferRef,
    };
  });
}

/**
 * Payment history (A-7) with a totals row for the whole filtered set. Refunds are negative rows, so the net
 * is a plain sum and nothing has to special-case them.
 */
export async function listPayments(
  query: PaymentQuery,
): Promise<Paginated<PaymentRow> & { totals: PaymentTotals }> {
  const filter: FilterQuery<PaymentDoc> = {};
  if (query.method) {
    filter.method = query.method as PaymentDoc["method"];
  }
  if (query.status) {
    filter.status = query.status;
  }
  if (query.admin) {
    filter.confirmedBy = query.admin;
  }

  const from = query.from ? lagosDayStart(query.from) : null;
  const to = query.to ? lagosDayEnd(query.to) : null;
  if (from || to) {
    filter.confirmedAt = { ...(from ? { $gte: from } : {}), ...(to ? { $lte: to } : {}) };
  }

  const term = query.q?.trim();
  if (term) {
    const pattern = new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    const [orders, customers] = await Promise.all([
      Order.find({ orderNumber: pattern }).select("_id").limit(200).lean().exec(),
      Customer.find({ $or: [{ firstName: pattern }, { lastName: pattern }, { email: pattern }] })
        .select("_id")
        .limit(200)
        .lean()
        .exec(),
    ]);
    filter.$or = [
      { paymentNumber: pattern },
      { reference: pattern },
      ...(orders.length > 0 ? [{ order: { $in: orders.map((o) => o._id) } }] : []),
      ...(customers.length > 0 ? [{ customer: { $in: customers.map((c) => c._id) } }] : []),
    ];
  }

  const page = Math.max(1, query.page ?? 1);
  const limit = query.limit ?? 25;

  const [payments, total, sums] = await Promise.all([
    Payment.find(filter)
      .sort({ confirmedAt: -1 })
      .skip(skipFor(page, limit))
      .limit(limit)
      .populate("order", "orderNumber")
      .populate("customer", "firstName lastName")
      .populate("confirmedBy", "firstName lastName")
      .lean()
      .exec(),
    Payment.countDocuments(filter).exec(),
    Payment.aggregate<{ _id: null; confirmed: number; refunded: number }>([
      { $match: filter },
      {
        $group: {
          _id: null,
          confirmed: { $sum: { $cond: [{ $gt: ["$amountKobo", 0] }, "$amountKobo", 0] } },
          refunded: { $sum: { $cond: [{ $lt: ["$amountKobo", 0] }, "$amountKobo", 0] } },
        },
      },
    ]).exec(),
  ]);

  const confirmedKobo = sums[0]?.confirmed ?? 0;
  const refundedKobo = Math.abs(sums[0]?.refunded ?? 0);

  const rows = payments.map((payment): PaymentRow => {
    const order = payment.order as unknown as { orderNumber?: string } | null;
    const customer = payment.customer as unknown as { firstName?: string; lastName?: string } | null;
    const admin = payment.confirmedBy as unknown as { firstName?: string; lastName?: string } | null;

    return {
      paymentNumber: payment.paymentNumber,
      orderNumber: order?.orderNumber ?? "—",
      customerName: customer
        ? `${customer.firstName ?? ""} ${customer.lastName ?? ""}`.trim() || "Customer"
        : "Customer",
      amountKobo: payment.amountKobo,
      method: payment.method,
      reference: payment.reference,
      status: payment.status,
      confirmedBy: admin ? `${admin.firstName ?? ""} ${admin.lastName ?? ""}`.trim() : "System",
      confirmedAt: payment.confirmedAt.toISOString(),
      note: payment.note,
    };
  });

  return {
    ...paginate(rows, total, page, limit),
    totals: {
      confirmedKobo,
      refundedKobo,
      netKobo: confirmedKobo - refundedKobo,
      count: total,
    },
  };
}
