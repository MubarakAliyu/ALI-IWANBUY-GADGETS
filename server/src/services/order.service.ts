/**
 * Placing, reading and cancelling orders (overview §8, §9 S-9 to S-11).
 *
 * `placeOrder` is the most important function in the project. Two rules it never bends:
 *
 *   1. **The client's prices are ignored.** The request says what was chosen — product, variant, quantity —
 *      and nothing else. Every price, every total and the delivery fee are read from the database inside the
 *      transaction (AC2.3).
 *   2. **Stock can never go negative.** Each line is decremented with a conditional update that only matches
 *      while enough stock is left; if it matches nothing, the whole order aborts. Two customers racing for the
 *      last unit therefore produce exactly one order and one honest "out of stock" (AC2.3).
 *
 * Everything between loading the cart and clearing it runs in one MongoDB transaction, so an order either
 * exists with its stock taken, or does not exist at all.
 */

import {
  multiplyKobo,
  type Address,
  type CancelOrderInput,
  type OrderDetail,
  type OrderListResponse,
  type OrderStatus,
  type PlaceOrderInput,
  type TransferMadeInput,
} from "@aib/shared";
import type { Request } from "express";
import mongoose, { Types, type FilterQuery } from "mongoose";
import { env } from "../config/env.js";
import { AppError } from "../lib/app-error.js";
import { sendMailSafely } from "../lib/mailer/index.js";
import { orderCancelledEmail, orderPlacedEmail, orderStatusEmail } from "../lib/mailer/templates.js";
import { nextNumber } from "../lib/numbering.js";
import { assertTransition, CUSTOMER_CANCELLABLE, type TransitionActor } from "../lib/order-lifecycle.js";
import { paginate, skipFor, type Paginated } from "../lib/pagination.js";
import { companyBlock, deliveryFeeKobo, loadSettings } from "../lib/settings.js";
import {
  Cart,
  Customer,
  Order,
  Product,
  type CustomerDoc,
  type OrderAddressDoc,
  type OrderDoc,
  type OrderItemDoc,
} from "../models/index.js";
import { recordAudit } from "./audit.service.js";

const ORDER_PAGE_SIZE = 10;

type Actor = { type: TransitionActor; id?: Types.ObjectId | null; name: string };

/** The address an order ships to, snapshotted so a later edit to the address book cannot rewrite history. */
function snapshotAddress(source: {
  label?: string;
  fullName: string;
  phone: string;
  line1: string;
  line2?: string;
  city: string;
  state: string;
  landmark?: string;
}): OrderAddressDoc {
  return {
    label: source.label ?? "",
    fullName: source.fullName,
    phone: source.phone,
    line1: source.line1,
    line2: source.line2 ?? "",
    city: source.city,
    state: source.state,
    landmark: source.landmark ?? "",
  };
}

export async function placeOrder(
  customerId: string,
  input: PlaceOrderInput,
  req?: Request,
): Promise<OrderDetail> {
  const customer = await Customer.findById(customerId).exec();
  if (!customer) {
    throw new AppError(401, "UNAUTHENTICATED", "Please sign in to continue.");
  }

  const settings = await loadSettings();

  // Resolve the delivery address before opening the transaction — it needs no locks and can fail cheaply.
  let shippingAddress: OrderAddressDoc | null = null;
  if (input.deliveryMethod !== "PICKUP") {
    if (input.newAddress) {
      shippingAddress = snapshotAddress(input.newAddress);
    } else {
      const saved = customer.addresses.find((address) => address._id.toString() === input.addressId);
      if (!saved) {
        throw AppError.badRequest("Choose a delivery address.", [
          { path: "addressId", message: "That address is not in your address book" },
        ]);
      }
      shippingAddress = snapshotAddress(saved);
    }
  }

  const session = await mongoose.startSession();
  let placed: OrderDoc | undefined;

  try {
    await session.withTransaction(async () => {
      const items: OrderItemDoc[] = [];

      for (const line of input.items) {
        const product = await Product.findOne({ _id: line.productId, status: "ACTIVE" })
          .select("name slug images variants")
          .session(session)
          .lean()
          .exec();

        const variant = product?.variants.find(
          (candidate) => candidate._id.toString() === line.variantId && candidate.isActive,
        );

        if (!product || !variant) {
          throw new AppError(
            409,
            "ITEM_UNAVAILABLE",
            `${product?.name ?? "An item in your cart"} is no longer available. Please review your cart.`,
          );
        }

        /**
         * The decrement and the stock check are the same operation: the filter only matches while at least
         * `qty` units remain. Nothing between the read above and this write can let stock go negative.
         */
        const result = await Product.updateOne(
          {
            _id: product._id,
            variants: { $elemMatch: { _id: variant._id, stock: { $gte: line.qty }, isActive: true } },
          },
          { $inc: { "variants.$.stock": -line.qty, totalStock: -line.qty } },
          { session },
        ).exec();

        if (result.modifiedCount === 0) {
          const fresh = await Product.findById(product._id).select("variants").session(session).lean().exec();
          const available =
            fresh?.variants.find((candidate) => candidate._id.toString() === line.variantId)?.stock ?? 0;
          throw new AppError(
            409,
            "OUT_OF_STOCK",
            available === 0
              ? `${product.name} (${variant.label}) has just sold out.`
              : `Only ${available} left of ${product.name} (${variant.label}).`,
            [{ path: `items.${line.variantId}`, message: String(available) }],
          );
        }

        const image = [...product.images].sort((a, b) => a.sortOrder - b.sortOrder)[0];
        items.push({
          product: product._id,
          variantId: variant._id,
          name: product.name,
          slug: product.slug,
          variantLabel: variant.label,
          sku: variant.sku,
          image: image?.url ?? null,
          unitPriceKobo: variant.priceKobo,
          qty: line.qty,
          lineTotalKobo: multiplyKobo(variant.priceKobo, line.qty),
        });
      }

      const subtotalKobo = items.reduce((sum, item) => sum + item.lineTotalKobo, 0);
      const fee = deliveryFeeKobo(settings, input.deliveryMethod, subtotalKobo);

      // Bank transfer waits for money; paying on delivery or at pickup goes straight into fulfilment.
      const status: OrderStatus = input.paymentMethod === "BANK_TRANSFER" ? "PENDING_PAYMENT" : "PROCESSING";
      const placedAt = new Date();
      const orderNumber = await nextNumber("order", { at: placedAt, session });

      const [created] = await Order.create(
        [
          {
            orderNumber,
            customer: customer._id,
            items,
            subtotalKobo,
            deliveryFeeKobo: fee,
            totalKobo: subtotalKobo + fee,
            deliveryMethod: input.deliveryMethod,
            shippingAddress,
            paymentMethod: input.paymentMethod,
            paymentStatus: "UNPAID",
            status,
            note: input.note ?? null,
            statusHistory: [
              {
                status,
                at: placedAt,
                by: customer._id,
                byType: "CUSTOMER",
                byName: `${customer.firstName} ${customer.lastName}`,
                note: "Order placed",
              },
            ],
            placedAt,
          },
        ],
        { session },
      );

      if (!created) {
        throw new AppError(500, "ORDER_FAILED", "The order could not be created. Please try again.");
      }
      placed = created.toObject() as OrderDoc;

      // The cart is emptied inside the transaction: if anything below fails, it comes back.
      await Cart.updateOne(
        { customer: customer._id },
        { $set: { items: [] } },
        { session, upsert: true },
      ).exec();

      await recordAudit({
        actorType: "CUSTOMER",
        actor: customer._id,
        actorName: `${customer.firstName} ${customer.lastName}`,
        action: "ORDER_PLACED",
        entityType: "Order",
        entityId: created._id,
        summary: `Placed order ${orderNumber} for ${items.length} item(s)`,
        after: { orderNumber, totalKobo: subtotalKobo + fee, status },
        session,
        ...(req ? { req } : {}),
      });
    });
  } finally {
    await session.endSession();
  }

  if (!placed) {
    throw new AppError(500, "ORDER_FAILED", "The order could not be created. Please try again.");
  }

  // A new address typed at checkout is only saved once the order is safely committed.
  if (input.saveAddress && input.newAddress && customer.addresses.length < 5) {
    customer.addresses.push({
      ...snapshotAddress(input.newAddress),
      isDefault: customer.addresses.length === 0,
    } as CustomerDoc["addresses"][number]);
    await customer.save();
  }

  await sendMailSafely(
    orderPlacedEmail({
      to: customer.email,
      firstName: customer.firstName,
      order: {
        orderNumber: placed.orderNumber,
        placedAt: placed.placedAt,
        items: placed.items.map((item) => ({
          name: item.name,
          variantLabel: item.variantLabel,
          qty: item.qty,
          lineTotalKobo: item.lineTotalKobo,
        })),
        subtotalKobo: placed.subtotalKobo,
        deliveryFeeKobo: placed.deliveryFeeKobo,
        totalKobo: placed.totalKobo,
        deliveryMethod: placed.deliveryMethod,
        paymentMethod: placed.paymentMethod,
      },
      orderUrl: `${env.CLIENT_ORIGIN}/account/orders/${placed.orderNumber}`,
      ...(placed.paymentMethod === "BANK_TRANSFER" ? { bank: settings.bank } : {}),
      company: companyBlock(settings),
    }),
  );

  return toOrderDetail(placed);
}

export function toOrderDetail(order: OrderDoc): OrderDetail {
  return {
    orderNumber: order.orderNumber,
    status: order.status,
    paymentStatus: order.paymentStatus,
    paymentMethod: order.paymentMethod,
    deliveryMethod: order.deliveryMethod,
    itemCount: order.items.reduce((sum, item) => sum + item.qty, 0),
    totalKobo: order.totalKobo,
    placedAt: order.placedAt.toISOString(),
    items: order.items.map((item) => ({
      productId: item.product.toString(),
      variantId: item.variantId.toString(),
      name: item.name,
      slug: item.slug,
      variantLabel: item.variantLabel,
      sku: item.sku,
      image: item.image,
      unitPriceKobo: item.unitPriceKobo,
      qty: item.qty,
      lineTotalKobo: item.lineTotalKobo,
    })),
    subtotalKobo: order.subtotalKobo,
    deliveryFeeKobo: order.deliveryFeeKobo,
    shippingAddress: order.shippingAddress
      ? {
          id: order._id.toString(),
          label: order.shippingAddress.label,
          fullName: order.shippingAddress.fullName,
          phone: order.shippingAddress.phone,
          line1: order.shippingAddress.line1,
          line2: order.shippingAddress.line2,
          city: order.shippingAddress.city,
          state: order.shippingAddress.state as Address["state"],
          landmark: order.shippingAddress.landmark,
          isDefault: false,
        }
      : null,
    customerTransferRef: order.customerTransferRef,
    note: order.note,
    cancelledReason: order.cancelledReason,
    statusHistory: order.statusHistory.map((event) => ({
      status: event.status,
      at: event.at.toISOString(),
      by: event.byName || event.byType,
      note: event.note,
    })),
    hasInvoice: order.invoice !== null,
    paidAt: order.paidAt ? order.paidAt.toISOString() : null,
    completedAt: order.completedAt ? order.completedAt.toISOString() : null,
  };
}

export async function listCustomerOrders(
  customerId: string,
  query: { status?: OrderStatus; page?: number },
): Promise<OrderListResponse> {
  const filter: FilterQuery<OrderDoc> = { customer: customerId };
  if (query.status) {
    filter.status = query.status;
  }
  const page = Math.max(1, query.page ?? 1);

  const [orders, total] = await Promise.all([
    Order.find(filter)
      .sort({ placedAt: -1 })
      .skip(skipFor(page, ORDER_PAGE_SIZE))
      .limit(ORDER_PAGE_SIZE)
      .lean()
      .exec(),
    Order.countDocuments(filter).exec(),
  ]);

  const summaries: Paginated<OrderListResponse["data"][number]> = paginate(
    orders.map((order) => ({
      orderNumber: order.orderNumber,
      status: order.status,
      paymentStatus: order.paymentStatus,
      paymentMethod: order.paymentMethod,
      deliveryMethod: order.deliveryMethod,
      itemCount: order.items.reduce((sum, item) => sum + item.qty, 0),
      totalKobo: order.totalKobo,
      placedAt: order.placedAt.toISOString(),
    })),
    total,
    page,
    ORDER_PAGE_SIZE,
  );
  return summaries;
}

/**
 * One order, by number, for the customer who placed it. Someone else's order number answers 404 rather than
 * 403 — a stranger learns nothing about whether it exists (AC2.5).
 */
export async function getCustomerOrder(customerId: string, orderNumber: string): Promise<OrderDetail> {
  const order = await Order.findOne({ orderNumber, customer: customerId }).lean().exec();
  if (!order) {
    throw AppError.notFound("We cannot find that order.");
  }
  return toOrderDetail(order);
}

/** "I've made the transfer" (S-10): moves a waiting order into the queue an admin confirms against. */
export async function markTransferMade(
  customerId: string,
  orderNumber: string,
  input: TransferMadeInput,
  req?: Request,
): Promise<OrderDetail> {
  const order = await Order.findOne({ orderNumber, customer: customerId }).exec();
  if (!order) {
    throw AppError.notFound("We cannot find that order.");
  }
  if (order.paymentMethod !== "BANK_TRANSFER") {
    throw new AppError(409, "NOT_A_TRANSFER", "This order is not being paid by bank transfer.");
  }

  assertTransition(order.status, "AWAITING_CONFIRMATION", "CUSTOMER");

  const customer = await Customer.findById(customerId).select("firstName lastName email").lean().exec();
  const actorName = customer ? `${customer.firstName} ${customer.lastName}` : "Customer";

  order.status = "AWAITING_CONFIRMATION";
  order.paymentStatus = "AWAITING_CONFIRMATION";
  order.customerTransferRef = input.reference?.trim() || null;
  order.statusHistory.push({
    status: "AWAITING_CONFIRMATION",
    at: new Date(),
    by: new Types.ObjectId(customerId),
    byType: "CUSTOMER",
    byName: actorName,
    note: order.customerTransferRef
      ? `Transfer reference ${order.customerTransferRef}`
      : "Customer says they have paid",
  });
  await order.save();

  await recordAudit({
    actorType: "CUSTOMER",
    actor: new Types.ObjectId(customerId),
    actorName,
    action: "ORDER_TRANSFER_DECLARED",
    entityType: "Order",
    entityId: order._id,
    summary: `${order.orderNumber} is awaiting payment confirmation`,
    after: { status: order.status, reference: order.customerTransferRef },
    ...(req ? { req } : {}),
  });

  return toOrderDetail(order.toObject() as OrderDoc);
}

/**
 * Cancelling an order puts its stock back, in a transaction, so the shelf and the order always agree. A
 * customer may only do this before any money is confirmed; admins get wider powers in Batch 3.
 */
export async function cancelOrder(
  orderNumber: string,
  actor: Actor,
  input: CancelOrderInput & { customerId?: string },
  req?: Request,
): Promise<OrderDetail> {
  const filter: FilterQuery<OrderDoc> = { orderNumber };
  if (input.customerId) {
    filter.customer = input.customerId;
  }

  const existing = await Order.findOne(filter).lean().exec();
  if (!existing) {
    throw AppError.notFound("We cannot find that order.");
  }

  if (actor.type === "CUSTOMER" && !CUSTOMER_CANCELLABLE.includes(existing.status)) {
    throw new AppError(
      409,
      "CANNOT_CANCEL",
      "This order is already being prepared. Please call the shop and we will sort it out.",
    );
  }
  assertTransition(existing.status, "CANCELLED", actor.type);

  const session = await mongoose.startSession();
  let cancelled: OrderDoc | undefined;

  try {
    await session.withTransaction(async () => {
      // Re-read inside the transaction: two cancels racing must not restock twice.
      const order = await Order.findOne(filter).session(session).exec();
      if (!order || order.status === "CANCELLED") {
        throw new AppError(409, "ALREADY_CANCELLED", "This order has already been cancelled.");
      }

      for (const item of order.items) {
        await Product.updateOne(
          { _id: item.product, "variants._id": item.variantId },
          { $inc: { "variants.$.stock": item.qty, totalStock: item.qty } },
          { session },
        ).exec();
      }

      order.status = "CANCELLED";
      order.cancelledReason = input.reason?.trim() || null;
      order.statusHistory.push({
        status: "CANCELLED",
        at: new Date(),
        by: actor.id ?? null,
        byType: actor.type,
        byName: actor.name,
        note: order.cancelledReason,
      });
      await order.save({ session });
      cancelled = order.toObject() as OrderDoc;

      await recordAudit({
        actorType: actor.type,
        actor: actor.id ?? null,
        actorName: actor.name,
        action: "ORDER_CANCELLED",
        entityType: "Order",
        entityId: order._id,
        summary: `${order.orderNumber} was cancelled and its stock returned`,
        before: { status: existing.status },
        after: { status: "CANCELLED", reason: order.cancelledReason },
        session,
        ...(req ? { req } : {}),
      });
    });
  } finally {
    await session.endSession();
  }

  if (!cancelled) {
    throw new AppError(500, "CANCEL_FAILED", "The order could not be cancelled. Please try again.");
  }

  const [customer, settings] = await Promise.all([
    Customer.findById(cancelled.customer).select("firstName email").lean().exec(),
    loadSettings(),
  ]);

  if (customer) {
    await sendMailSafely(
      orderCancelledEmail({
        to: customer.email,
        firstName: customer.firstName,
        orderNumber: cancelled.orderNumber,
        reason: cancelled.cancelledReason,
        bySystem: actor.type === "SYSTEM",
        orderUrl: `${env.CLIENT_ORIGIN}/shop`,
        company: companyBlock(settings),
      }),
    );
  }

  return toOrderDetail(cancelled);
}

/** Tell a customer their order moved. Used by the admin actions in Batch 3 and by the auto-cancel job. */
export async function notifyStatusChange(order: OrderDoc, note?: string | null): Promise<void> {
  const [customer, settings] = await Promise.all([
    Customer.findById(order.customer).select("firstName email").lean().exec(),
    loadSettings(),
  ]);
  if (!customer) {
    return;
  }
  await sendMailSafely(
    orderStatusEmail({
      to: customer.email,
      firstName: customer.firstName,
      orderNumber: order.orderNumber,
      status: order.status,
      note: note ?? null,
      orderUrl: `${env.CLIENT_ORIGIN}/account/orders/${order.orderNumber}`,
      company: companyBlock(settings),
    }),
  );
}
