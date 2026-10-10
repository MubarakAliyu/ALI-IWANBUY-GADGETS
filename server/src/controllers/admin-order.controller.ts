/**
 * Orders, payments and invoices on the admin side (overview §10 A-4, A-7, A-8).
 *
 * Controllers here do three things and no more: read the validated input, call one service, answer. Which
 * roles may reach each of them is decided by `requirePermission` on the route, never here.
 */

import type {
  AdminCancelOrderInput,
  AdminOrderQuery,
  AdvanceOrderInput,
  ConfirmPaymentFormInput,
  InvoiceQuery,
  OrderNoteInput,
  PaymentQuery,
  RefundOrderInput,
  VoidInvoiceInput,
} from "@aib/shared";
import type { Request, Response } from "express";
import { csvFilename, csvNaira, toCsv } from "../lib/csv.js";
import { formatLagosDate, formatLagosTime } from "../lib/dates.js";
import { currentAdmin } from "../middleware/require-admin.js";
import { validated, validatedQuery } from "../middleware/validate.js";
import {
  addOrderNote,
  adminCancelOrder,
  advanceStatus,
  getOrder,
  listOrders,
} from "../services/admin-order.service.js";
import { getInvoicePdf, listInvoices, sendInvoice, voidInvoice } from "../services/invoice.service.js";
import {
  awaitingConfirmation,
  confirmPayment,
  listPayments,
  refundOrder,
} from "../services/payment.service.js";

function sendCsv(res: Response, what: string, csv: string): void {
  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="${csvFilename(what)}"`);
  res.send(csv);
}

// ── Orders ──────────────────────────────────────────────────────────────────────────────────────────

export async function list(_req: Request, res: Response): Promise<void> {
  const query = validatedQuery<AdminOrderQuery>(res);
  res.json(await listOrders(query));
}

export async function detail(req: Request, res: Response): Promise<void> {
  res.json(await getOrder(req.params.number as string));
}

export async function advance(req: Request, res: Response): Promise<void> {
  const input = validated<AdvanceOrderInput>(res);
  res.json(await advanceStatus(req.params.number as string, input, currentAdmin(req), req));
}

export async function cancel(req: Request, res: Response): Promise<void> {
  const input = validated<AdminCancelOrderInput>(res);
  res.json(await adminCancelOrder(req.params.number as string, input, currentAdmin(req), req));
}

export async function note(req: Request, res: Response): Promise<void> {
  const input = validated<OrderNoteInput>(res);
  res.json(await addOrderNote(req.params.number as string, input.body, currentAdmin(req), req));
}

/** The filtered set, not the page — the export limit is the cap, not the table's page size. */
export async function exportOrders(_req: Request, res: Response): Promise<void> {
  const query = validatedQuery<AdminOrderQuery>(res);
  const { data } = await listOrders({ ...query, page: 1, limit: 200 });

  sendCsv(
    res,
    "orders",
    toCsv(data, [
      { header: "Order", value: (row) => row.orderNumber },
      { header: "Placed", value: (row) => formatLagosDate(new Date(row.placedAt)) },
      { header: "Customer", value: (row) => row.customerName },
      { header: "Email", value: (row) => row.customerEmail },
      { header: "Status", value: (row) => row.status },
      { header: "Payment", value: (row) => row.paymentStatus },
      { header: "Method", value: (row) => row.paymentMethod },
      { header: "Delivery", value: (row) => row.deliveryMethod },
      { header: "Items", value: (row) => row.itemCount },
      { header: "Total (NGN)", value: (row) => csvNaira(row.totalKobo) },
      { header: "Invoice", value: (row) => row.invoiceNumber },
    ]),
  );
}

// ── Payments ────────────────────────────────────────────────────────────────────────────────────────

export async function confirm(req: Request, res: Response): Promise<void> {
  const input = validated<ConfirmPaymentFormInput>(res);
  const result = await confirmPayment(req.params.number as string, input, currentAdmin(req), req);
  res.status(201).json(result);
}

export async function refund(req: Request, res: Response): Promise<void> {
  const input = validated<RefundOrderInput>(res);
  res.json(await refundOrder(req.params.number as string, input, currentAdmin(req), req));
}

export async function awaiting(_req: Request, res: Response): Promise<void> {
  res.json({ data: await awaitingConfirmation() });
}

export async function payments(_req: Request, res: Response): Promise<void> {
  const query = validatedQuery<PaymentQuery>(res);
  res.json(await listPayments(query));
}

export async function exportPayments(_req: Request, res: Response): Promise<void> {
  const query = validatedQuery<PaymentQuery>(res);
  const { data } = await listPayments({ ...query, page: 1, limit: 200 });

  sendCsv(
    res,
    "payments",
    toCsv(data, [
      { header: "Payment", value: (row) => row.paymentNumber },
      {
        header: "Date",
        value: (row) =>
          `${formatLagosDate(new Date(row.confirmedAt))} ${formatLagosTime(new Date(row.confirmedAt))}`,
      },
      { header: "Order", value: (row) => row.orderNumber },
      { header: "Customer", value: (row) => row.customerName },
      { header: "Method", value: (row) => row.method },
      { header: "Reference", value: (row) => row.reference },
      { header: "Status", value: (row) => row.status },
      { header: "Amount (NGN)", value: (row) => csvNaira(row.amountKobo) },
      { header: "Confirmed by", value: (row) => row.confirmedBy },
      { header: "Note", value: (row) => row.note },
    ]),
  );
}

// ── Invoices ────────────────────────────────────────────────────────────────────────────────────────

export async function invoices(_req: Request, res: Response): Promise<void> {
  const query = validatedQuery<InvoiceQuery>(res);
  res.json(await listInvoices(query));
}

export async function downloadInvoice(req: Request, res: Response): Promise<void> {
  const { invoice, pdf } = await getInvoicePdf(req.params.invoiceNumber as string);
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", `inline; filename="${invoice.invoiceNumber}.pdf"`);
  res.send(pdf);
}

export async function emailInvoice(req: Request, res: Response): Promise<void> {
  res.json(await sendInvoice(req.params.invoiceNumber as string, currentAdmin(req), req));
}

export async function voidOne(req: Request, res: Response): Promise<void> {
  const input = validated<VoidInvoiceInput>(res);
  res.json(await voidInvoice(req.params.invoiceNumber as string, input.reason, currentAdmin(req), req));
}

export async function exportInvoices(_req: Request, res: Response): Promise<void> {
  const query = validatedQuery<InvoiceQuery>(res);
  const { data } = await listInvoices({ ...query, page: 1, limit: 200 });

  sendCsv(
    res,
    "invoices",
    toCsv(data, [
      { header: "Invoice", value: (row) => row.invoiceNumber },
      { header: "Issued", value: (row) => formatLagosDate(new Date(row.issuedAt)) },
      { header: "Order", value: (row) => row.orderNumber },
      { header: "Customer", value: (row) => row.customerName },
      { header: "Email", value: (row) => row.customerEmail },
      { header: "Total (NGN)", value: (row) => csvNaira(row.totalKobo) },
      { header: "Status", value: (row) => row.status },
      { header: "Times sent", value: (row) => row.sentCount },
      { header: "Issued by", value: (row) => row.issuedBy },
    ]),
  );
}
