/**
 * The emails this batch sends: welcome, order placed, order cancelled, and a status change. Batch 3 adds
 * payment-confirmed and the invoice, using the same layout.
 *
 * Each template returns a ready-to-send `Mail`, so the services that call them never build HTML.
 */

import { formatNaira, ORDER_STATUS_LABEL, type OrderStatus } from "@aib/shared";
import { formatLagosDate } from "../dates.js";
import type { Mail } from "./index.js";
import { button, detailRows, escapeHtml, renderEmail, type CompanyBlock } from "./layout.js";

export type OrderEmailData = {
  orderNumber: string;
  placedAt: Date;
  items: { name: string; variantLabel: string; qty: number; lineTotalKobo: number }[];
  subtotalKobo: number;
  deliveryFeeKobo: number;
  totalKobo: number;
  deliveryMethod: string;
  paymentMethod: string;
};

const DELIVERY_LABEL: Record<string, string> = {
  PICKUP: "Pickup at the shop",
  LOCAL_DELIVERY: "Delivery in Birnin Kebbi",
  NATIONWIDE: "Nationwide delivery",
};

const PAYMENT_LABEL: Record<string, string> = {
  BANK_TRANSFER: "Bank transfer",
  PAY_ON_DELIVERY: "Pay on delivery or at pickup",
};

function itemsTable(items: OrderEmailData["items"]): string {
  const rows = items
    .map(
      (item) =>
        `<tr>
          <td style="padding:8px 0;border-bottom:1px solid #DFE4E8;font-size:14px;color:#1E2A35;">
            ${escapeHtml(item.name)}<br />
            <span style="color:#646F7A;font-size:12px;">${escapeHtml(item.variantLabel)} · ×${item.qty}</span>
          </td>
          <td style="padding:8px 0;border-bottom:1px solid #DFE4E8;font-size:14px;color:#1E2A35;text-align:right;font-weight:600;">
            ${escapeHtml(formatNaira(item.lineTotalKobo))}
          </td>
        </tr>`,
    )
    .join("");
  return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:16px 0;">${rows}</table>`;
}

export function welcomeEmail(options: {
  to: string;
  firstName: string;
  shopUrl: string;
  company: CompanyBlock;
}): Mail {
  return {
    to: options.to,
    replyTo: options.company.email,
    template: "welcome",
    subject: `Welcome to ${options.company.storeName}`,
    html: renderEmail({
      title: `Welcome, ${options.firstName}`,
      preheader: "Your account is ready.",
      company: options.company,
      body: `
        <p>Your account is ready. You can now check out in a few taps, keep a wishlist, and follow your orders
        from start to finish.</p>
        <p>Everything we stock is on the website with the price we would quote you at the counter.</p>
        ${button("Start shopping", options.shopUrl)}
        <p style="color:#646F7A;font-size:13px;">If you did not create this account, reply to this email and we
        will close it.</p>`,
    }),
  };
}

export function orderPlacedEmail(options: {
  to: string;
  firstName: string;
  order: OrderEmailData;
  orderUrl: string;
  bank?: { bankName: string; accountName: string; accountNumber: string };
  company: CompanyBlock;
}): Mail {
  const { order } = options;
  const transferBlock =
    order.paymentMethod === "BANK_TRANSFER" && options.bank
      ? `<p style="margin-top:24px;"><strong>To pay by transfer</strong></p>
         ${detailRows([
           ["Bank", options.bank.bankName],
           ["Account name", options.bank.accountName],
           ["Account number", options.bank.accountNumber],
           ["Amount", formatNaira(order.totalKobo)],
           ["Narration", order.orderNumber],
         ])}
         <p style="color:#646F7A;font-size:13px;">Once you have sent it, press “I've made the transfer” on your
         order page so we know to look for it.</p>`
      : `<p style="margin-top:24px;">You will pay when you collect the order or when it is delivered.</p>`;

  return {
    to: options.to,
    replyTo: options.company.email,
    template: "order-placed",
    subject: `Order ${order.orderNumber} received`,
    html: renderEmail({
      title: `Thank you, ${options.firstName}`,
      preheader: `We have your order ${order.orderNumber}.`,
      company: options.company,
      body: `
        <p>We have your order. Here is what you asked for, placed on ${escapeHtml(formatLagosDate(order.placedAt))}.</p>
        ${itemsTable(order.items)}
        ${detailRows([
          ["Subtotal", formatNaira(order.subtotalKobo)],
          ["Delivery", order.deliveryFeeKobo === 0 ? "Free" : formatNaira(order.deliveryFeeKobo)],
          ["Total", formatNaira(order.totalKobo)],
          ["Order number", order.orderNumber],
          ["Delivery", DELIVERY_LABEL[order.deliveryMethod] ?? order.deliveryMethod],
          ["Payment", PAYMENT_LABEL[order.paymentMethod] ?? order.paymentMethod],
        ])}
        ${transferBlock}
        ${button("View your order", options.orderUrl)}`,
    }),
  };
}

export function orderStatusEmail(options: {
  to: string;
  firstName: string;
  orderNumber: string;
  status: OrderStatus;
  note?: string | null;
  orderUrl: string;
  company: CompanyBlock;
}): Mail {
  const label = ORDER_STATUS_LABEL[options.status];
  return {
    to: options.to,
    replyTo: options.company.email,
    template: `order-${options.status.toLowerCase().replace(/_/g, "-")}`,
    subject: `Order ${options.orderNumber} — ${label.toLowerCase()}`,
    html: renderEmail({
      title: `Your order is ${label.toLowerCase()}`,
      preheader: `${options.orderNumber} is now ${label.toLowerCase()}.`,
      company: options.company,
      body: `
        <p>Hello ${escapeHtml(options.firstName)}, order <strong>${escapeHtml(options.orderNumber)}</strong> is
        now <strong>${escapeHtml(label.toLowerCase())}</strong>.</p>
        ${options.note ? `<p style="color:#646F7A;">${escapeHtml(options.note)}</p>` : ""}
        ${button("View your order", options.orderUrl)}
        <p style="color:#646F7A;font-size:13px;">Any questions? Call or WhatsApp
        ${escapeHtml(options.company.phone)}.</p>`,
    }),
  };
}

export function orderCancelledEmail(options: {
  to: string;
  firstName: string;
  orderNumber: string;
  reason: string | null;
  bySystem: boolean;
  orderUrl: string;
  company: CompanyBlock;
}): Mail {
  return {
    to: options.to,
    replyTo: options.company.email,
    template: "order-cancelled",
    subject: `Order ${options.orderNumber} cancelled`,
    html: renderEmail({
      title: "Your order has been cancelled",
      preheader: `${options.orderNumber} has been cancelled.`,
      company: options.company,
      body: `
        <p>Hello ${escapeHtml(options.firstName)}, order <strong>${escapeHtml(options.orderNumber)}</strong> has
        been cancelled and the items are back on the shelf.</p>
        ${
          options.bySystem
            ? `<p>We held it for as long as we could, but no payment reached us in time. Nothing has been
               charged — you are welcome to order again whenever you are ready.</p>`
            : ""
        }
        ${options.reason ? `<p style="color:#646F7A;">Reason: ${escapeHtml(options.reason)}</p>` : ""}
        ${button("Back to the shop", options.orderUrl)}`,
    }),
  };
}

export function paymentConfirmedEmail(options: {
  to: string;
  firstName: string;
  orderNumber: string;
  amountKobo: number;
  invoiceNumber: string;
  orderUrl: string;
  company: CompanyBlock;
}): Mail {
  return {
    to: options.to,
    replyTo: options.company.email,
    template: "payment-confirmed",
    subject: `Payment received for ${options.orderNumber}`,
    html: renderEmail({
      title: "We have your payment",
      preheader: `${formatNaira(options.amountKobo)} received for ${options.orderNumber}.`,
      company: options.company,
      body: `
        <p>Thank you, ${escapeHtml(options.firstName)} — we have received your payment and your order is now
        being prepared.</p>
        ${detailRows([
          ["Order", options.orderNumber],
          ["Amount received", formatNaira(options.amountKobo)],
          ["Invoice", options.invoiceNumber],
        ])}
        <p>Your invoice is attached to this email and is also on your order page.</p>
        ${button("View your order", options.orderUrl)}`,
    }),
  };
}

export function invoiceEmail(options: {
  to: string;
  firstName: string;
  orderNumber: string;
  invoiceNumber: string;
  totalKobo: number;
  orderUrl: string;
  company: CompanyBlock;
  pdf: Buffer;
}): Mail {
  return {
    to: options.to,
    replyTo: options.company.email,
    template: "invoice",
    subject: `Invoice ${options.invoiceNumber} for ${options.orderNumber}`,
    attachments: [
      { filename: `${options.invoiceNumber}.pdf`, content: options.pdf, contentType: "application/pdf" },
    ],
    html: renderEmail({
      title: `Invoice ${options.invoiceNumber}`,
      preheader: `Your invoice for ${options.orderNumber}.`,
      company: options.company,
      body: `
        <p>Hello ${escapeHtml(options.firstName)}, your invoice for order
        <strong>${escapeHtml(options.orderNumber)}</strong> is attached as a PDF.</p>
        ${detailRows([
          ["Invoice", options.invoiceNumber],
          ["Order", options.orderNumber],
          ["Total", formatNaira(options.totalKobo)],
        ])}
        ${button("View your order", options.orderUrl)}`,
    }),
  };
}
