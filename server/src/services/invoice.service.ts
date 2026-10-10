/**
 * Invoices as branded A4 PDFs (overview §6.7, §10 A-8).
 *
 * The document is drawn with pdfkit rather than rendered from HTML: it is the one artefact a customer may
 * print, forward to an employer or keep for a warranty claim, so it has to look the same everywhere and not
 * depend on a browser. It uses the real Montserrat files and the approved logo, so it is unmistakably the
 * same company as the website.
 *
 * A PDF is rendered the first time it is asked for and then kept, so seeding sixty orders does not mean
 * rendering sixty documents nobody will open.
 */

import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { formatNaira, type InvoiceQuery, type InvoiceRow } from "@aib/shared";
import type { Request } from "express";
import type { FilterQuery } from "mongoose";
import PDFDocument from "pdfkit";
import sharp from "sharp";
import { env } from "../config/env.js";
import { AppError } from "../lib/app-error.js";
import { formatLagosDate } from "../lib/dates.js";
import { mailer } from "../lib/mailer/index.js";
import { invoiceEmail } from "../lib/mailer/templates.js";
import { logger } from "../lib/logger.js";
import { paginate, skipFor, type Paginated } from "../lib/pagination.js";
import { companyBlock, loadSettings } from "../lib/settings.js";
import {
  Customer,
  Invoice,
  Order,
  Payment,
  type InvoiceDoc,
  type OrderDoc,
  type SettingDoc,
} from "../models/index.js";
import type { SignedInAdmin } from "../middleware/require-admin.js";
import { recordAudit } from "./audit.service.js";

const NAVY = "#1E2A35";
const PRIMARY = "#156FBF";
const GREY = "#646F7A";
const GREY_LINE = "#DFE4E8";
const GREY_BG = "#F8FAFB";

const PAGE_MARGIN = 48;
const PAGE_WIDTH = 595.28; // A4 at 72 dpi
const PAGE_HEIGHT = 841.89;
const CONTENT_WIDTH = PAGE_WIDTH - PAGE_MARGIN * 2;

const BRAND_DIR = path.resolve(process.cwd(), "..", "brand");
const INVOICE_DIR = path.resolve(process.cwd(), ".local", "invoices");
const LOGO_PNG = path.join(INVOICE_DIR, ".logo-header.png");

const FONTS = {
  regular: path.join(BRAND_DIR, "fonts", "ttf", "Montserrat_400Regular.ttf"),
  medium: path.join(BRAND_DIR, "fonts", "ttf", "Montserrat_500Medium.ttf"),
  semibold: path.join(BRAND_DIR, "fonts", "ttf", "Montserrat_600SemiBold.ttf"),
  bold: path.join(BRAND_DIR, "fonts", "ttf", "Montserrat_700Bold.ttf"),
};

/**
 * pdfkit cannot place an SVG, so the approved lockup is rasterised once — on white, at print resolution —
 * and reused. It is derived from `brand/logo/svg`, never redrawn (Brand Guidelines).
 */
async function logoPng(): Promise<Buffer | null> {
  try {
    return await readFile(LOGO_PNG);
  } catch {
    // Not converted yet.
  }

  try {
    // The horizontal **white** lockup, because the band it sits on is navy — the dark lockup disappears
    // against it. Same asset the admin sidebar head uses (`logoManifest.horizontalWhite`).
    const svg = await readFile(path.join(BRAND_DIR, "logo", "svg", "logo-new-a-1.svg"));
    const png = await sharp(svg, { density: 300 })
      .resize({ width: 647 })
      .png()
      .toBuffer();
    await mkdir(INVOICE_DIR, { recursive: true });
    await writeFile(LOGO_PNG, png);
    return png;
  } catch {
    // An invoice without the mark is still a valid invoice; it must not fail to render over a logo.
    return null;
  }
}

type InvoiceData = {
  invoice: InvoiceDoc;
  settings: SettingDoc;
  order: OrderDoc;
  customerName: string;
  customerEmail: string;
  reference: string | null;
};

function money(value: number): string {
  return formatNaira(value, { decimals: true });
}

/** Draw the document. Pure layout — every value it prints is passed in. */
function draw(doc: PDFKit.PDFDocument, data: InvoiceData, logo: Buffer | null): void {
  const { invoice, order, settings } = data;

  doc.registerFont("regular", FONTS.regular);
  doc.registerFont("medium", FONTS.medium);
  doc.registerFont("semibold", FONTS.semibold);
  doc.registerFont("bold", FONTS.bold);

  // ── Navy header band ──────────────────────────────────────────────────────────────────────────────
  doc.rect(0, 0, PAGE_WIDTH, 120).fill(NAVY);

  if (logo) {
    // 647:100, so 190 wide is ~29 tall — centred in the 120pt band.
    doc.image(logo, PAGE_MARGIN, 46, { width: 190 });
  } else {
    doc.font("bold").fontSize(20).fillColor("#FFFFFF").text(settings.storeName, PAGE_MARGIN, 44);
  }

  doc
    .font("bold")
    .fontSize(26)
    .fillColor("#FFFFFF")
    .text("INVOICE", PAGE_MARGIN, 38, { width: CONTENT_WIDTH, align: "right" });
  doc
    .font("medium")
    .fontSize(11)
    .fillColor("#A2C7EB")
    .text(invoice.invoiceNumber, PAGE_MARGIN, 72, { width: CONTENT_WIDTH, align: "right" });

  // ── Company block ─────────────────────────────────────────────────────────────────────────────────
  let y = 144;
  doc.font("semibold").fontSize(10).fillColor(NAVY).text(settings.legalName, PAGE_MARGIN, y);
  y += 14;
  doc.font("regular").fontSize(9).fillColor(GREY);
  // The address is measured rather than assumed: the owner can change it in Store Settings to something
  // longer, and the two lines underneath have to move with it.
  doc.text(settings.registeredAddress, PAGE_MARGIN, y, { width: 260 });
  y += doc.heightOfString(settings.registeredAddress, { width: 260 }) + 4;
  doc.text(`RC ${settings.rcNumber} · TIN ${settings.tin}`, PAGE_MARGIN, y);
  y += 12;
  doc.text(`${settings.phone} · ${settings.email}`, PAGE_MARGIN, y);

  // ── Dates, opposite ───────────────────────────────────────────────────────────────────────────────
  const rightX = PAGE_WIDTH - PAGE_MARGIN - 180;
  doc.font("regular").fontSize(9).fillColor(GREY).text("Invoice date", rightX, 144, { width: 180, align: "right" });
  doc
    .font("semibold")
    .fontSize(10)
    .fillColor(NAVY)
    .text(formatLagosDate(invoice.issuedAt), rightX, 156, { width: 180, align: "right" });
  doc.font("regular").fontSize(9).fillColor(GREY).text("Order", rightX, 176, { width: 180, align: "right" });
  doc
    .font("semibold")
    .fontSize(10)
    .fillColor(NAVY)
    .text(order.orderNumber, rightX, 188, { width: 180, align: "right" });
  doc.font("regular").fontSize(9).fillColor(GREY).text("Order date", rightX, 208, { width: 180, align: "right" });
  doc
    .font("semibold")
    .fontSize(10)
    .fillColor(NAVY)
    .text(formatLagosDate(order.placedAt), rightX, 220, { width: 180, align: "right" });

  // ── Bill to ───────────────────────────────────────────────────────────────────────────────────────
  y = 250;
  doc.font("medium").fontSize(9).fillColor(GREY).text("BILL TO", PAGE_MARGIN, y, { characterSpacing: 1 });
  y += 14;
  doc.font("semibold").fontSize(11).fillColor(NAVY).text(data.customerName, PAGE_MARGIN, y);
  y += 15;
  doc.font("regular").fontSize(9).fillColor(GREY).text(data.customerEmail, PAGE_MARGIN, y);

  if (order.shippingAddress) {
    y += 13;
    const address = order.shippingAddress;
    doc.text(
      [address.line1, address.line2, `${address.city}, ${address.state}`, address.phone]
        .filter(Boolean)
        .join("\n"),
      PAGE_MARGIN,
      y,
      { width: 240 },
    );
  } else {
    y += 13;
    doc.text(`Collected at ${settings.shopAddress}`, PAGE_MARGIN, y, { width: 240 });
  }

  // ── Items ─────────────────────────────────────────────────────────────────────────────────────────
  //
  // Every cell is placed by coordinate rather than flowed, which is what keeps the columns aligned — so the
  // page break is counted here too. A twenty-line order prints on two pages, with the header repeated,
  // instead of running off the bottom of the first.
  const columns = { item: PAGE_MARGIN, qty: 330, unit: 380, total: 470 };
  const ROW_HEIGHT = 34;
  /** Enough room below the last row for the totals (56), the payment box (108) and the footer (134). */
  const LAST_ROW_Y = PAGE_HEIGHT - PAGE_MARGIN - 300;

  function drawTableHeader(at: number): number {
    doc.rect(PAGE_MARGIN, at, CONTENT_WIDTH, 24).fill(GREY_BG);
    doc.font("medium").fontSize(9).fillColor(GREY);
    doc.text("ITEM", columns.item + 8, at + 8, { characterSpacing: 0.5 });
    doc.text("QTY", columns.qty, at + 8, { width: 40, align: "right" });
    doc.text("UNIT", columns.unit, at + 8, { width: 80, align: "right" });
    doc.text("TOTAL", columns.total, at + 8, { width: 77, align: "right" });
    return at + 24;
  }

  let tableY = drawTableHeader(350);

  for (const item of order.items) {
    if (tableY + ROW_HEIGHT > LAST_ROW_Y) {
      doc.addPage();
      tableY = drawTableHeader(PAGE_MARGIN);
    }

    // One line per cell: without `lineBreak: false` a long product name wraps and spills into the next row.
    doc.font("semibold").fontSize(9.5).fillColor(NAVY).text(item.name, columns.item + 8, tableY + 6, {
      width: 262,
      lineBreak: false,
      ellipsis: true,
    });
    doc
      .font("regular")
      .fontSize(8)
      .fillColor(GREY)
      .text(`${item.variantLabel} · ${item.sku}`, columns.item + 8, tableY + 19, {
        width: 262,
        lineBreak: false,
        ellipsis: true,
      });

    doc.font("regular").fontSize(9.5).fillColor(NAVY);
    doc.text(String(item.qty), columns.qty, tableY + 11, { width: 40, align: "right" });
    doc.text(money(item.unitPriceKobo), columns.unit, tableY + 11, { width: 80, align: "right" });
    doc.font("semibold").text(money(item.lineTotalKobo), columns.total, tableY + 11, {
      width: 77,
      align: "right",
    });

    tableY += ROW_HEIGHT;
    doc.moveTo(PAGE_MARGIN, tableY).lineTo(PAGE_WIDTH - PAGE_MARGIN, tableY).lineWidth(0.5).stroke(GREY_LINE);
  }

  // ── Totals ────────────────────────────────────────────────────────────────────────────────────────
  tableY += 12;
  const totals: [string, string, boolean][] = [
    ["Subtotal", money(order.subtotalKobo), false],
    ["Delivery", order.deliveryFeeKobo === 0 ? "Free" : money(order.deliveryFeeKobo), false],
    ["Total", money(order.totalKobo), true],
  ];

  for (const [label, value, strong] of totals) {
    doc
      .font(strong ? "bold" : "regular")
      .fontSize(strong ? 12 : 10)
      .fillColor(strong ? NAVY : GREY)
      .text(label, columns.unit - 60, tableY, { width: 140, align: "right" });
    doc
      .font(strong ? "bold" : "semibold")
      .fontSize(strong ? 12 : 10)
      .fillColor(NAVY)
      .text(value, columns.total, tableY, { width: 77, align: "right" });
    tableY += strong ? 22 : 17;
  }

  // ── Payment ───────────────────────────────────────────────────────────────────────────────────────
  //
  // The lines stack rather than sitting at fixed offsets, and the box is drawn to fit them: an order with no
  // transfer reference, or a shop that has not filled in a bank account, leaves no blank gap.
  const payY = tableY + 16;
  const bank = [settings.bank.bankName, settings.bank.accountName, settings.bank.accountNumber]
    .filter((part) => part.trim().length > 0)
    .join(" · ");
  const boxHeight = 68 + (data.reference ? 14 : 0) + (bank ? 16 : 0);

  doc.rect(PAGE_MARGIN, payY, CONTENT_WIDTH, boxHeight).fill(GREY_BG);
  doc.font("medium").fontSize(9).fillColor(GREY).text("PAYMENT", PAGE_MARGIN + 12, payY + 12, {
    characterSpacing: 1,
  });

  const paid = order.paymentStatus === "PAID";
  doc
    .font("semibold")
    .fontSize(10)
    .fillColor(paid ? "#15803D" : "#B45309")
    .text(paid ? "PAID" : order.paymentStatus.replace(/_/g, " "), PAGE_MARGIN + 12, payY + 28);

  let lineY = payY + 44;
  doc.font("regular").fontSize(9).fillColor(GREY);
  doc.text(
    order.paymentMethod === "BANK_TRANSFER" ? "Bank transfer" : "Paid on delivery or at pickup",
    PAGE_MARGIN + 12,
    lineY,
  );
  if (data.reference) {
    lineY += 14;
    doc.text(`Reference ${data.reference}`, PAGE_MARGIN + 12, lineY);
  }
  if (bank) {
    lineY += 16;
    doc.text(bank, PAGE_MARGIN + 12, lineY, { width: CONTENT_WIDTH - 24 });
  }

  // ── Footer ────────────────────────────────────────────────────────────────────────────────────────
  let footerY = payY + boxHeight + 20;
  doc.font("regular").fontSize(9).fillColor(GREY).text(settings.invoiceFooterNote, PAGE_MARGIN, footerY, {
    width: CONTENT_WIDTH,
  });
  footerY += doc.heightOfString(settings.invoiceFooterNote, { width: CONTENT_WIDTH }) + 10;

  doc
    .font("semibold")
    .fontSize(9)
    .fillColor(PRIMARY)
    .text("Clean. Modern. Reliable.", PAGE_MARGIN, footerY, { width: CONTENT_WIDTH, align: "center" });
}

async function render(data: InvoiceData): Promise<Buffer> {
  const logo = await logoPng();

  return new Promise<Buffer>((resolve, reject) => {
    const doc = new PDFDocument({ size: "A4", margin: PAGE_MARGIN, info: { Title: data.invoice.invoiceNumber } });
    const chunks: Buffer[] = [];

    doc.on("data", (chunk: Buffer) => chunks.push(chunk));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", reject);

    try {
      draw(doc, data, logo);
      doc.end();
    } catch (error) {
      reject(error instanceof Error ? error : new Error(String(error)));
    }
  });
}

/**
 * The invoice as a PDF, rendering and storing it the first time it is wanted. Everything it prints comes from
 * the order snapshot and Store Settings, so an invoice re-rendered next year still says what it said.
 */
export async function getInvoicePdf(invoiceNumber: string): Promise<{ invoice: InvoiceDoc; pdf: Buffer }> {
  const invoice = await Invoice.findOne({ invoiceNumber }).lean().exec();
  if (!invoice) {
    throw AppError.notFound("We cannot find that invoice.");
  }

  if (invoice.pdfPath) {
    try {
      return { invoice, pdf: await readFile(invoice.pdfPath) };
    } catch {
      // The file has gone — fall through and render it again.
    }
  }

  const [order, settings] = await Promise.all([
    Order.findById(invoice.order).lean<OrderDoc>().exec(),
    loadSettings(),
  ]);
  if (!order) {
    throw AppError.notFound("The order behind this invoice is missing.");
  }

  const [customer, payment] = await Promise.all([
    Customer.findById(invoice.customer).select("firstName lastName email").lean().exec(),
    Payment.findOne({ order: order._id, status: "CONFIRMED" }).select("reference").lean().exec(),
  ]);

  const pdf = await render({
    invoice,
    order,
    settings,
    customerName: customer ? `${customer.firstName} ${customer.lastName}` : "Customer",
    customerEmail: customer?.email ?? "",
    reference: payment?.reference ?? order.customerTransferRef ?? null,
  });

  await mkdir(INVOICE_DIR, { recursive: true });
  const file = path.join(INVOICE_DIR, `${invoice.invoiceNumber}.pdf`);
  await writeFile(file, pdf);
  await Invoice.updateOne({ _id: invoice._id }, { $set: { pdfPath: file } }).exec();

  return { invoice: { ...invoice, pdfPath: file }, pdf };
}

/**
 * The invoice for an order, by order number — what the customer's "Download invoice" button asks for. It is
 * scoped to the account, so another customer's order number answers 404 rather than handing over a PDF.
 */
export async function getCustomerInvoicePdf(
  customerId: string,
  orderNumber: string,
): Promise<{ invoice: InvoiceDoc; pdf: Buffer }> {
  const order = await Order.findOne({ orderNumber, customer: customerId }).select("_id").lean().exec();
  if (!order) {
    throw AppError.notFound("We cannot find that order.");
  }

  const invoice = await Invoice.findOne({ order: order._id, status: { $ne: "VOID" } })
    .select("invoiceNumber")
    .lean()
    .exec();
  if (!invoice) {
    throw AppError.notFound("No invoice has been issued for this order yet.");
  }

  return getInvoicePdf(invoice.invoiceNumber);
}

export async function listInvoices(query: InvoiceQuery): Promise<Paginated<InvoiceRow>> {
  const filter: FilterQuery<InvoiceDoc> = {};
  if (query.status) {
    filter.status = query.status;
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
      { invoiceNumber: pattern },
      ...(orders.length > 0 ? [{ order: { $in: orders.map((o) => o._id) } }] : []),
      ...(customers.length > 0 ? [{ customer: { $in: customers.map((c) => c._id) } }] : []),
    ];
  }

  const page = Math.max(1, query.page ?? 1);
  const limit = query.limit ?? 25;

  const [invoices, total] = await Promise.all([
    Invoice.find(filter)
      .sort({ issuedAt: -1 })
      .skip(skipFor(page, limit))
      .limit(limit)
      .populate("order", "orderNumber")
      .populate("customer", "firstName lastName email")
      .populate("issuedBy", "firstName lastName")
      .lean()
      .exec(),
    Invoice.countDocuments(filter).exec(),
  ]);

  const rows = invoices.map((invoice): InvoiceRow => {
    const order = invoice.order as unknown as { orderNumber?: string } | null;
    const customer = invoice.customer as unknown as
      | { firstName?: string; lastName?: string; email?: string }
      | null;
    const issuer = invoice.issuedBy as unknown as { firstName?: string; lastName?: string } | null;
    const lastSent = invoice.sentAt.at(-1) ?? null;

    return {
      invoiceNumber: invoice.invoiceNumber,
      orderNumber: order?.orderNumber ?? "—",
      customerName:
        customer?.firstName || customer?.lastName
          ? `${customer.firstName ?? ""} ${customer.lastName ?? ""}`.trim()
          : "Customer",
      customerEmail: customer?.email ?? "",
      totalKobo: invoice.totalKobo,
      issuedAt: invoice.issuedAt.toISOString(),
      issuedBy: issuer ? `${issuer.firstName ?? ""} ${issuer.lastName ?? ""}`.trim() : "System",
      status: invoice.status,
      sentCount: invoice.sentAt.length,
      lastSentAt: lastSent ? lastSent.toISOString() : null,
      voidReason: invoice.voidReason,
    };
  });

  return paginate(rows, total, page, limit);
}

/**
 * Email the invoice to the customer it belongs to, with the PDF attached (A-8). Sending again is allowed and
 * expected — `sentAt` is a list, so the record shows every time it went out.
 */
export async function sendInvoice(
  invoiceNumber: string,
  admin: SignedInAdmin,
  req?: Request,
): Promise<{ invoiceNumber: string; sentTo: string; sentCount: number }> {
  const { invoice, pdf } = await getInvoicePdf(invoiceNumber);
  if (invoice.status === "VOID") {
    throw new AppError(409, "INVOICE_VOID", "This invoice has been voided and cannot be sent.");
  }

  const [customer, order, settings] = await Promise.all([
    Customer.findById(invoice.customer).select("firstName email").lean().exec(),
    Order.findById(invoice.order).select("orderNumber").lean().exec(),
    loadSettings(),
  ]);
  if (!customer) {
    throw AppError.notFound("The customer this invoice belongs to no longer exists.");
  }

  // Unlike the automatic emails, this one was asked for by a person pressing a button, so a failure is
  // reported rather than swallowed — otherwise the invoice would be marked sent when it never left.
  try {
    await mailer.send(
      invoiceEmail({
        to: customer.email,
        firstName: customer.firstName,
        orderNumber: order?.orderNumber ?? "",
        invoiceNumber: invoice.invoiceNumber,
        totalKobo: invoice.totalKobo,
        orderUrl: `${env.CLIENT_ORIGIN}/account/orders/${order?.orderNumber ?? ""}`,
        company: companyBlock(settings),
        pdf,
      }),
    );
  } catch (error) {
    logger.error({ err: error, invoice: invoice.invoiceNumber }, "Could not email an invoice");
    throw new AppError(
      502,
      "EMAIL_FAILED",
      "The invoice could not be emailed. Check the mail settings and try again.",
    );
  }

  const at = new Date();
  await Invoice.updateOne({ _id: invoice._id }, { $push: { sentAt: at }, $set: { status: "SENT" } }).exec();

  await recordAudit({
    actorType: "ADMIN",
    actor: admin._id,
    actorName: `${admin.firstName} ${admin.lastName}`,
    action: "INVOICE_SENT",
    entityType: "Invoice",
    entityId: invoice._id,
    summary: `${invoice.invoiceNumber} emailed to ${customer.email}`,
    after: { status: "SENT", sentTo: customer.email },
    ...(req ? { req } : {}),
  });

  return {
    invoiceNumber: invoice.invoiceNumber,
    sentTo: customer.email,
    sentCount: invoice.sentAt.length + 1,
  };
}

/**
 * Voiding (OWNER only, enforced on the route). An invoice is never deleted or edited — a wrong one is voided
 * with a reason, and that reason prints in the audit trail, because this is the shop's accounting record.
 */
export async function voidInvoice(
  invoiceNumber: string,
  reason: string,
  admin: SignedInAdmin,
  req?: Request,
): Promise<InvoiceRow> {
  const invoice = await Invoice.findOne({ invoiceNumber }).exec();
  if (!invoice) {
    throw AppError.notFound("We cannot find that invoice.");
  }
  if (invoice.status === "VOID") {
    throw new AppError(409, "ALREADY_VOID", "This invoice has already been voided.");
  }

  const before = invoice.status;
  invoice.status = "VOID";
  invoice.voidReason = reason.trim();
  await invoice.save();

  await recordAudit({
    actorType: "ADMIN",
    actor: admin._id,
    actorName: `${admin.firstName} ${admin.lastName}`,
    action: "INVOICE_VOIDED",
    entityType: "Invoice",
    entityId: invoice._id,
    summary: `${invoice.invoiceNumber} voided — ${reason.trim()}`,
    before: { status: before },
    after: { status: "VOID", reason: reason.trim() },
    ...(req ? { req } : {}),
  });

  const rows = await listInvoices({ q: invoice.invoiceNumber, page: 1, limit: 1 });
  const row = rows.data[0];
  if (!row) {
    throw new AppError(500, "VOID_FAILED", "The invoice was voided but could not be read back.");
  }
  return row;
}
