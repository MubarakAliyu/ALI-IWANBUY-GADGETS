/**
 * A customer's own orders over HTTP (overview §11). Every handler scopes the query to the signed-in customer,
 * so there is no route through this file that can read or change someone else's order.
 */

import {
  ORDER_STATUS,
  type CancelOrderInput,
  type OrderStatus,
  type PlaceOrderInput,
  type TransferMadeInput,
} from "@aib/shared";
import type { Request, Response } from "express";
import { AppError } from "../lib/app-error.js";
import { loadSettings } from "../lib/settings.js";
import { currentCustomer } from "../middleware/require-customer.js";
import { validated } from "../middleware/validate.js";
import * as orders from "../services/order.service.js";

export async function placeOrder(req: Request, res: Response): Promise<void> {
  const customer = currentCustomer(req);
  const order = await orders.placeOrder(customer._id.toString(), validated<PlaceOrderInput>(res), req);
  res.status(201).json(order);
}

export async function listOrders(req: Request, res: Response): Promise<void> {
  const customer = currentCustomer(req);
  const status = typeof req.query.status === "string" ? req.query.status : undefined;
  const page = Number(req.query.page);

  res.json(
    await orders.listCustomerOrders(customer._id.toString(), {
      ...(status && (ORDER_STATUS as readonly string[]).includes(status)
        ? { status: status as OrderStatus }
        : {}),
      page: Number.isFinite(page) && page > 0 ? Math.floor(page) : 1,
    }),
  );
}

export async function getOrder(req: Request, res: Response): Promise<void> {
  const customer = currentCustomer(req);
  res.json(await orders.getCustomerOrder(customer._id.toString(), String(req.params.number)));
}

export async function transferMade(req: Request, res: Response): Promise<void> {
  const customer = currentCustomer(req);
  res.json(
    await orders.markTransferMade(
      customer._id.toString(),
      String(req.params.number),
      validated<TransferMadeInput>(res),
      req,
    ),
  );
}

export async function cancelOrder(req: Request, res: Response): Promise<void> {
  const customer = currentCustomer(req);
  res.json(
    await orders.cancelOrder(
      String(req.params.number),
      { type: "CUSTOMER", id: customer._id, name: `${customer.firstName} ${customer.lastName}` },
      { ...validated<CancelOrderInput>(res), customerId: customer._id.toString() },
      req,
    ),
  );
}

/**
 * The invoice PDF. Invoices are issued by an admin confirming payment, which is Batch 3 — until then this
 * answers 404 rather than pretending a document exists.
 */
export async function downloadInvoice(req: Request, _res: Response): Promise<void> {
  const customer = currentCustomer(req);
  await orders.getCustomerOrder(customer._id.toString(), String(req.params.number));
  throw AppError.notFound("No invoice has been issued for this order yet.");
}

/** What checkout needs before an order exists: the fees, where to collect, and the bank to pay into. */
export async function checkoutSettings(_req: Request, res: Response): Promise<void> {
  const settings = await loadSettings();
  res.json({
    deliveryFees: {
      localKobo: settings.deliveryFees.localKobo,
      nationwideKobo: settings.deliveryFees.nationwideKobo,
    },
    freeDeliveryThresholdKobo: settings.freeDeliveryThresholdKobo,
    pickupAddress: settings.shopAddress,
    bank: {
      bankName: settings.bank.bankName,
      accountName: settings.bank.accountName,
      accountNumber: settings.bank.accountNumber,
    },
  });
}
