/**
 * Orders as the shop sees them (overview §10 A-4).
 *
 * The customer's own view lives in `order.service.ts` and is scoped to one account; this is the whole book,
 * searchable and filterable, plus the two moves only an admin can make: advancing the status and cancelling
 * an order that is already being prepared. Both go through the same lifecycle table the storefront uses, so
 * there is one answer to "can this order move from here to there".
 */

import {
  ORDER_STATUS,
  type AdminOrderQuery,
  type AdminOrderRow,
  type OrderStatus,
  type PaymentStatus,
} from "@aib/shared";
import type { Request } from "express";
import type { FilterQuery, Types } from "mongoose";
import { AppError } from "../lib/app-error.js";
import { lagosDayEnd, lagosDayStart } from "../lib/dates.js";
import { allowedTransitions, assertTransition } from "../lib/order-lifecycle.js";
import { paginate, skipFor, type Paginated } from "../lib/pagination.js";
import { Customer, Invoice, Order, Payment, type OrderDoc } from "../models/index.js";
import type { SignedInAdmin } from "../middleware/require-admin.js";
import { recordAudit } from "./audit.service.js";
import { cancelOrder, notifyStatusChange, toOrderDetail } from "./order.service.js";
import { verifyPin } from "./pin.service.js";

const DEFAULT_LIMIT = 25;

type PopulatedCustomer = { _id: Types.ObjectId; firstName: string; lastName: string; email: string };

function customerName(value: unknown): { name: string; email: string } {
  const customer = value as Partial<PopulatedCustomer> | null;
  if (customer && typeof customer === "object" && "firstName" in customer) {
    return {
      name: `${customer.firstName ?? ""} ${customer.lastName ?? ""}`.trim() || "Customer",
      email: customer.email ?? "",
    };
  }
  return { name: "Customer", email: "" };
}

/**
 * Turn the query string into a Mongo filter. An unrecognised status is ignored rather than refused: a stale
 * bookmark should show the list, not an error page.
 */
async function buildFilter(query: AdminOrderQuery): Promise<FilterQuery<OrderDoc>> {
  const filter: FilterQuery<OrderDoc> = {};

  if (query.status && (ORDER_STATUS as readonly string[]).includes(query.status)) {
    filter.status = query.status as OrderStatus;
  }
  if (query.paymentStatus) {
    filter.paymentStatus = query.paymentStatus as PaymentStatus;
  }
  if (query.paymentMethod) {
    filter.paymentMethod = query.paymentMethod;
  }
  if (query.deliveryMethod) {
    filter.deliveryMethod = query.deliveryMethod;
  }

  const from = query.from ? lagosDayStart(query.from) : null;
  const to = query.to ? lagosDayEnd(query.to) : null;
  if (from || to) {
    filter.placedAt = { ...(from ? { $gte: from } : {}), ...(to ? { $lte: to } : {}) };
  }

  const term = query.q?.trim();
  if (term) {
    // An order number is searched directly; anything else is matched against the customer, because that is
    // what someone at the counter actually has — a name or a phone number, not an order number.
    const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const pattern = new RegExp(escaped, "i");
    const customers = await Customer.find({
      $or: [{ firstName: pattern }, { lastName: pattern }, { email: pattern }, { phone: pattern }],
    })
      .select("_id")
      .limit(200)
      .lean()
      .exec();

    filter.$or = [
      { orderNumber: pattern },
      { customerTransferRef: pattern },
      ...(customers.length > 0 ? [{ customer: { $in: customers.map((c) => c._id) } }] : []),
    ];
  }

  return filter;
}

export async function listOrders(query: AdminOrderQuery): Promise<Paginated<AdminOrderRow>> {
  const filter = await buildFilter(query);
  const page = Math.max(1, query.page ?? 1);
  const limit = query.limit ?? DEFAULT_LIMIT;
  const direction = query.dir === "asc" ? 1 : -1;
  const sort = { [query.sort ?? "placedAt"]: direction } as Record<string, 1 | -1>;

  const [orders, total] = await Promise.all([
    Order.find(filter)
      .sort(sort)
      .skip(skipFor(page, limit))
      .limit(limit)
      .populate("customer", "firstName lastName email")
      .populate("invoice", "invoiceNumber")
      .lean()
      .exec(),
    Order.countDocuments(filter).exec(),
  ]);

  const rows = orders.map((order): AdminOrderRow => {
    const { name, email } = customerName(order.customer);
    const invoice = order.invoice as unknown as { invoiceNumber?: string } | null;
    return {
      orderNumber: order.orderNumber,
      customerName: name,
      customerEmail: email,
      status: order.status,
      paymentStatus: order.paymentStatus,
      paymentMethod: order.paymentMethod,
      deliveryMethod: order.deliveryMethod,
      itemCount: order.items.reduce((sum, item) => sum + item.qty, 0),
      totalKobo: order.totalKobo,
      placedAt: order.placedAt.toISOString(),
      invoiceNumber: invoice?.invoiceNumber ?? null,
    };
  });

  return paginate(rows, total, page, limit);
}

export type AdminOrderDetail = ReturnType<typeof toOrderDetail> & {
  customer: { id: string; name: string; email: string; phone: string; orderCount: number };
  nextStatuses: OrderStatus[];
  adminNotes: { body: string; by: string; at: string }[];
  payments: {
    paymentNumber: string;
    amountKobo: number;
    method: string;
    reference: string | null;
    status: string;
    confirmedAt: string;
    note: string | null;
  }[];
  invoice: { invoiceNumber: string; status: string; issuedAt: string } | null;
};

export async function getOrder(orderNumber: string): Promise<AdminOrderDetail> {
  const order = await Order.findOne({ orderNumber }).lean<OrderDoc>().exec();
  if (!order) {
    throw AppError.notFound("We cannot find that order.");
  }

  const [customer, orderCount, payments, invoice] = await Promise.all([
    Customer.findById(order.customer).select("firstName lastName email phone").lean().exec(),
    Order.countDocuments({ customer: order.customer }).exec(),
    Payment.find({ order: order._id }).sort({ confirmedAt: 1 }).lean().exec(),
    order.invoice ? Invoice.findById(order.invoice).lean().exec() : Promise.resolve(null),
  ]);

  return {
    ...toOrderDetail(order),
    customer: {
      id: order.customer.toString(),
      name: customer ? `${customer.firstName} ${customer.lastName}` : "Customer",
      email: customer?.email ?? "",
      phone: customer?.phone ?? "",
      orderCount,
    },
    nextStatuses: allowedTransitions(order.status, "ADMIN"),
    adminNotes: order.adminNotes.map((note) => ({
      body: note.body,
      by: note.byName || "Admin",
      at: note.at.toISOString(),
    })),
    payments: payments.map((payment) => ({
      paymentNumber: payment.paymentNumber,
      amountKobo: payment.amountKobo,
      method: payment.method,
      reference: payment.reference,
      status: payment.status,
      confirmedAt: payment.confirmedAt.toISOString(),
      note: payment.note,
    })),
    invoice: invoice
      ? {
          invoiceNumber: invoice.invoiceNumber,
          status: invoice.status,
          issuedAt: invoice.issuedAt.toISOString(),
        }
      : null,
  };
}

/**
 * Moving an order along (A-4). Cancelling and refunding are not advances — they restock, so they have their
 * own services; this is the forward path only, and it refuses anything the lifecycle table does not allow.
 */
export async function advanceStatus(
  orderNumber: string,
  input: { status: string; note?: string },
  admin: SignedInAdmin,
  req?: Request,
): Promise<AdminOrderDetail> {
  const next = input.status as OrderStatus;
  if (!(ORDER_STATUS as readonly string[]).includes(next)) {
    throw AppError.badRequest("That is not a status an order can have.");
  }
  if (next === "CANCELLED" || next === "REFUNDED") {
    throw AppError.badRequest(
      next === "CANCELLED"
        ? "Use cancel, so the stock goes back and the customer is told why."
        : "Use refund, so the payment is reversed and the stock goes back.",
    );
  }

  const order = await Order.findOne({ orderNumber }).exec();
  if (!order) {
    throw AppError.notFound("We cannot find that order.");
  }

  const before = order.status;
  assertTransition(before, next, "ADMIN");

  const note = input.note?.trim() || null;
  const at = new Date();

  order.status = next;
  if (next === "COMPLETED") {
    order.completedAt = at;
  }
  order.statusHistory.push({
    status: next,
    at,
    by: admin._id,
    byType: "ADMIN",
    byName: `${admin.firstName} ${admin.lastName}`,
    note,
  });
  await order.save();

  const updated = order.toObject() as OrderDoc;

  await recordAudit({
    actorType: "ADMIN",
    actor: admin._id,
    actorName: `${admin.firstName} ${admin.lastName}`,
    action: "ORDER_STATUS_CHANGED",
    entityType: "Order",
    entityId: order._id,
    summary: `${order.orderNumber}: ${before.toLowerCase()} → ${next.toLowerCase()}`,
    before: { status: before },
    after: { status: next, ...(note ? { note } : {}) },
    ...(req ? { req } : {}),
  });

  await notifyStatusChange(updated, note);

  return getOrder(orderNumber);
}

/**
 * Cancelling as an admin. An order that has been paid for needs the acting admin's PIN, because cancelling it
 * means money has to go back to someone (CLAUDE.md). The restock, the audit row and the customer's email are
 * all the shared `cancelOrder` — this adds only the PIN and the wider permission.
 */
export async function adminCancelOrder(
  orderNumber: string,
  input: { reason: string; pin?: string },
  admin: SignedInAdmin,
  req?: Request,
): Promise<AdminOrderDetail> {
  const order = await Order.findOne({ orderNumber }).select("paymentStatus").lean().exec();
  if (!order) {
    throw AppError.notFound("We cannot find that order.");
  }

  if (order.paymentStatus === "PAID") {
    if (!input.pin) {
      throw new AppError(403, "PIN_REQUIRED", "This order has been paid for. Enter your PIN to cancel it.");
    }
    await verifyPin(admin._id.toString(), input.pin, req);
  }

  await cancelOrder(
    orderNumber,
    { type: "ADMIN", id: admin._id, name: `${admin.firstName} ${admin.lastName}` },
    { reason: input.reason },
    req,
  );

  return getOrder(orderNumber);
}

/** An internal note. Notes are only ever added — correcting one means writing another (overview §10 A-4). */
export async function addOrderNote(
  orderNumber: string,
  body: string,
  admin: SignedInAdmin,
  req?: Request,
): Promise<AdminOrderDetail> {
  const order = await Order.findOne({ orderNumber }).exec();
  if (!order) {
    throw AppError.notFound("We cannot find that order.");
  }

  order.adminNotes.push({
    body: body.trim(),
    by: admin._id,
    byName: `${admin.firstName} ${admin.lastName}`,
    at: new Date(),
  });
  await order.save();

  await recordAudit({
    actorType: "ADMIN",
    actor: admin._id,
    actorName: `${admin.firstName} ${admin.lastName}`,
    action: "ORDER_NOTE_ADDED",
    entityType: "Order",
    entityId: order._id,
    summary: `Note added to ${order.orderNumber}`,
    after: { note: body.trim() },
    ...(req ? { req } : {}),
  });

  return getOrder(orderNumber);
}
