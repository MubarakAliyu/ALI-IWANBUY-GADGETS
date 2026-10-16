/**
 * The demo half of the seed (overview §13): the people who run the shop, a handful of customers, and sixty
 * days of order history so the dashboard has something true to show.
 *
 * The history is generated from a fixed pseudo-random sequence, so every run produces the same orders, the
 * same revenue and the same charts — a dashboard test can assert a number and a demo looks the same twice.
 * Dates are Lagos dates: an order "placed on the 3rd" is the 3rd in Birnin Kebbi, not in UTC.
 */

import { multiplyKobo, type OrderStatus, type PaymentMethod } from "@aib/shared";
import type { Types } from "mongoose";
import { hashPassword } from "../lib/password.js";
import { nextNumber } from "../lib/numbering.js";
import {
  Admin,
  Customer,
  Invoice,
  Order,
  Payment,
  Product,
  type AdminDoc,
  type OrderItemDoc,
  type ProductDoc,
} from "../models/index.js";
import { recordAudit } from "../services/audit.service.js";
import type { DemoCredentials } from "./demo-credentials.js";

/**
 * Who the demo admins are. Their passwords and PINs are **not** here: in development they come from the
 * defaults in `demo-credentials.ts`, and in production from the environment, so nothing a public repository
 * contains can sign in to a live dashboard.
 */
export function demoAdmins(credentials: DemoCredentials) {
  return [
    {
      firstName: "Ali",
      lastName: "Abdullahi",
      email: "owner@aliiwanbuy.com",
      role: "OWNER" as const,
      pin: credentials.ownerPin,
    },
    {
      firstName: "Hauwa",
      lastName: "Sani",
      email: "manager@aliiwanbuy.com",
      role: "MANAGER" as const,
      pin: credentials.managerPin,
    },
    {
      firstName: "Yusuf",
      lastName: "Garba",
      email: "staff@aliiwanbuy.com",
      role: "STAFF" as const,
      // Staff cannot confirm payments, so there is nothing for a PIN to protect.
      pin: null,
    },
  ];
}

const DEMO_CUSTOMERS = [
  { firstName: "Amina", lastName: "Bello", city: "Birnin Kebbi", state: "Kebbi" },
  { firstName: "Ibrahim", lastName: "Musa", city: "Birnin Kebbi", state: "Kebbi" },
  { firstName: "Fatima", lastName: "Lawal", city: "Argungu", state: "Kebbi" },
  { firstName: "Chidi", lastName: "Okeke", city: "Lagos", state: "Lagos" },
  { firstName: "Zainab", lastName: "Yusuf", city: "Sokoto", state: "Sokoto" },
  { firstName: "Emeka", lastName: "Nwosu", city: "Abuja", state: "FCT — Abuja" },
] as const;

/**
 * A small deterministic generator (mulberry32). Seeded once, so the history is identical on every machine.
 */
function sequence(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pick<T>(next: () => number, items: readonly T[]): T {
  return items[Math.floor(next() * items.length)] as T;
}

export async function seedAdmins(credentials: DemoCredentials): Promise<AdminDoc[]> {
  await Admin.deleteMany({});
  const created: AdminDoc[] = [];

  for (const demo of demoAdmins(credentials)) {
    created.push(
      await Admin.create({
        firstName: demo.firstName,
        lastName: demo.lastName,
        email: demo.email,
        phone: "+2347039254143",
        role: demo.role,
        passwordHash: await hashPassword(credentials.adminPassword),
        // Demo accounts are handed out ready to use; an admin the owner creates in the dashboard is not.
        mustChangePassword: false,
        pinHash: demo.pin ? await hashPassword(demo.pin) : null,
        lastLoginAt: null,
      }),
    );
  }

  return created;
}

export async function seedCustomers(credentials: DemoCredentials): Promise<Types.ObjectId[]> {
  await Customer.deleteMany({});
  const passwordHash = await hashPassword(credentials.customerPassword);
  const ids: Types.ObjectId[] = [];

  for (const [index, demo] of DEMO_CUSTOMERS.entries()) {
    const customer = await Customer.create({
      firstName: demo.firstName,
      lastName: demo.lastName,
      email: `${demo.firstName.toLowerCase()}@example.com`,
      phone: `+23480${String(30000000 + index * 111111).slice(0, 8)}`,
      passwordHash,
      addresses: [
        {
          label: "Home",
          fullName: `${demo.firstName} ${demo.lastName}`,
          phone: `+23480${String(30000000 + index * 111111).slice(0, 8)}`,
          line1: `${12 + index * 7} Ahmadu Bello Way`,
          line2: "",
          city: demo.city,
          state: demo.state,
          landmark: "",
          isDefault: true,
        },
      ],
    });
    ids.push(customer._id);
  }

  return ids;
}

/** Where each status sits in the story: what it implies about payment, and whether stock stays taken. */
const HISTORY: { status: OrderStatus; weight: number; paid: boolean }[] = [
  { status: "COMPLETED", weight: 26, paid: true },
  { status: "DELIVERED", weight: 8, paid: true },
  { status: "SHIPPED", weight: 6, paid: true },
  { status: "READY_FOR_PICKUP", weight: 5, paid: true },
  { status: "PROCESSING", weight: 8, paid: true },
  { status: "PAID", weight: 4, paid: true },
  { status: "AWAITING_CONFIRMATION", weight: 5, paid: false },
  { status: "PENDING_PAYMENT", weight: 4, paid: false },
  { status: "CANCELLED", weight: 5, paid: false },
  { status: "REFUNDED", weight: 3, paid: true },
];

function weightedStatus(next: () => number): (typeof HISTORY)[number] {
  const total = HISTORY.reduce((sum, entry) => sum + entry.weight, 0);
  let roll = next() * total;
  for (const entry of HISTORY) {
    roll -= entry.weight;
    if (roll <= 0) {
      return entry;
    }
  }
  return HISTORY[0] as (typeof HISTORY)[number];
}

export async function seedOrderHistory(options: {
  admins: AdminDoc[];
  customers: Types.ObjectId[];
  days?: number;
  count?: number;
}): Promise<{ orders: number; payments: number; invoices: number }> {
  const { admins, customers } = options;
  const days = options.days ?? 60;
  const count = options.count ?? 60;

  await Promise.all([Order.deleteMany({}), Payment.deleteMany({}), Invoice.deleteMany({})]);

  const products = await Product.find({ status: "ACTIVE" })
    .select("name slug images variants")
    .lean<Pick<ProductDoc, "_id" | "name" | "slug" | "images" | "variants">[]>()
    .exec();

  const confirmers = admins.filter((admin) => admin.role !== "STAFF");
  const next = sequence(20261009);

  let payments = 0;
  let invoices = 0;

  for (let index = 0; index < count; index += 1) {
    // Spread the orders across the window, with the most recent few days a little busier.
    const age = Math.floor(next() ** 1.4 * days);
    const placedAt = new Date(
      Date.now() - age * 24 * 60 * 60 * 1000 - Math.floor(next() * 12) * 60 * 60 * 1000,
    );

    const customer = pick(next, customers);
    const outcome = weightedStatus(next);
    const paymentMethod: PaymentMethod = next() < 0.75 ? "BANK_TRANSFER" : "PAY_ON_DELIVERY";
    const deliveryMethod = next() < 0.45 ? "PICKUP" : next() < 0.75 ? "LOCAL_DELIVERY" : "NATIONWIDE";

    const lineCount = next() < 0.65 ? 1 : next() < 0.9 ? 2 : 3;
    const items: OrderItemDoc[] = [];

    for (let line = 0; line < lineCount; line += 1) {
      const product = pick(next, products);
      const variant = pick(
        next,
        product.variants.filter((candidate) => candidate.isActive),
      );
      if (!variant || items.some((item) => item.variantId.equals(variant._id))) {
        continue;
      }
      const qty = next() < 0.85 ? 1 : 2;
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
        qty,
        lineTotalKobo: multiplyKobo(variant.priceKobo, qty),
      });
    }

    if (items.length === 0) {
      continue;
    }

    const subtotalKobo = items.reduce((sum, item) => sum + item.lineTotalKobo, 0);
    const deliveryFeeKobo =
      deliveryMethod === "PICKUP" || subtotalKobo >= 50_000_000
        ? 0
        : deliveryMethod === "LOCAL_DELIVERY"
          ? 150_000
          : 500_000;
    const totalKobo = subtotalKobo + deliveryFeeKobo;

    const orderNumber = await nextNumber("order", { at: placedAt });
    const confirmer = pick(next, confirmers);
    const paidAt = outcome.paid ? new Date(placedAt.getTime() + 3 * 60 * 60 * 1000) : null;

    // The trail an order of this age would really have left behind it.
    const history: {
      status: OrderStatus;
      at: Date;
      byType: "CUSTOMER" | "ADMIN" | "SYSTEM";
      byName: string;
      note: string | null;
    }[] = [
      {
        status: paymentMethod === "BANK_TRANSFER" ? "PENDING_PAYMENT" : "PROCESSING",
        at: placedAt,
        byType: "CUSTOMER",
        byName: "Customer",
        note: "Order placed",
      },
    ];

    if (outcome.paid && paymentMethod === "BANK_TRANSFER") {
      history.push({
        status: "AWAITING_CONFIRMATION",
        at: new Date(placedAt.getTime() + 60 * 60 * 1000),
        byType: "CUSTOMER",
        byName: "Customer",
        note: "Customer says they have paid",
      });
    }
    if (outcome.paid && paidAt) {
      history.push({
        status: "PAID",
        at: paidAt,
        byType: "ADMIN",
        byName: `${confirmer?.firstName} ${confirmer?.lastName}`,
        note: "Payment confirmed",
      });
    }
    if (
      outcome.status !== "PAID" &&
      outcome.status !== "PENDING_PAYMENT" &&
      outcome.status !== "AWAITING_CONFIRMATION"
    ) {
      history.push({
        status: outcome.status,
        at: new Date(placedAt.getTime() + 26 * 60 * 60 * 1000),
        byType: outcome.status === "CANCELLED" ? "CUSTOMER" : "ADMIN",
        byName:
          outcome.status === "CANCELLED" ? "Customer" : `${confirmer?.firstName} ${confirmer?.lastName}`,
        note: null,
      });
    }

    const order = await Order.create({
      orderNumber,
      customer,
      items,
      subtotalKobo,
      deliveryFeeKobo,
      totalKobo,
      deliveryMethod,
      shippingAddress:
        deliveryMethod === "PICKUP"
          ? null
          : {
              label: "Home",
              fullName: "Demo Customer",
              phone: "+2348030000000",
              line1: "12 Ahmadu Bello Way",
              line2: "",
              city: "Birnin Kebbi",
              state: "Kebbi",
              landmark: "",
            },
      paymentMethod,
      paymentStatus:
        outcome.status === "REFUNDED"
          ? "REFUNDED"
          : outcome.paid
            ? "PAID"
            : outcome.status === "AWAITING_CONFIRMATION"
              ? "AWAITING_CONFIRMATION"
              : "UNPAID",
      status: outcome.status,
      note: null,
      cancelledReason: outcome.status === "CANCELLED" ? "Changed my mind" : null,
      statusHistory: history.map((entry) => ({ ...entry, by: null })),
      placedAt,
      paidAt,
      completedAt: outcome.status === "COMPLETED" ? new Date(placedAt.getTime() + 48 * 60 * 60 * 1000) : null,
      createdAt: placedAt,
      updatedAt: placedAt,
    });

    if (outcome.paid && paidAt && confirmer) {
      await Payment.create({
        paymentNumber: await nextNumber("payment", { at: paidAt }),
        order: order._id,
        customer,
        amountKobo: totalKobo,
        method: paymentMethod,
        reference: paymentMethod === "BANK_TRANSFER" ? `TRF/${orderNumber.slice(-6)}` : null,
        status: outcome.status === "REFUNDED" ? "REFUNDED" : "CONFIRMED",
        confirmedBy: confirmer._id,
        confirmedAt: paidAt,
        createdAt: paidAt,
      });
      payments += 1;

      const invoice = await Invoice.create({
        invoiceNumber: await nextNumber("invoice", { at: paidAt }),
        order: order._id,
        customer,
        issuedBy: confirmer._id,
        issuedAt: paidAt,
        totalKobo,
        // Rendered on first download, so seeding does not have to write sixty PDFs.
        pdfPath: "",
        sentAt: next() < 0.6 ? [new Date(paidAt.getTime() + 10 * 60 * 1000)] : [],
        status: next() < 0.6 ? "SENT" : "ISSUED",
      });
      await Order.updateOne({ _id: order._id }, { $set: { invoice: invoice._id } }).exec();
      invoices += 1;

      await recordAudit({
        actorType: "ADMIN",
        actor: confirmer._id,
        actorName: `${confirmer.firstName} ${confirmer.lastName}`,
        action: "PAYMENT_CONFIRMED",
        entityType: "Order",
        entityId: order._id,
        summary: `Confirmed payment for ${orderNumber}`,
      });
    }
  }

  return { orders: await Order.countDocuments(), payments, invoices };
}
