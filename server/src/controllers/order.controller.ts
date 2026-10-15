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
import { loadSettings } from "../lib/settings.js";
import { currentCustomer } from "../middleware/require-customer.js";
import { validated } from "../middleware/validate.js";
import { getCustomerInvoicePdf } from "../services/invoice.service.js";
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
 * The invoice PDF. One is issued the moment an admin confirms payment, so this answers 404 only while an
 * order is still unpaid. The file is rendered on first request and kept (overview §10 A-8).
 */
export async function downloadInvoice(req: Request, res: Response): Promise<void> {
  const customer = currentCustomer(req);
  const { invoice, pdf } = await getCustomerInvoicePdf(customer._id.toString(), String(req.params.number));

  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `attachment; filename="${invoice.invoiceNumber}.pdf"`);
  res.send(pdf);
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
    phone: settings.phone,
    openingHours: settings.openingHours.map((entry) => ({
      days: entry.days,
      opens: entry.opens,
      closes: entry.closes,
    })),
    bank: {
      bankName: settings.bank.bankName,
      accountName: settings.bank.accountName,
      accountNumber: settings.bank.accountNumber,
    },
  });
}
