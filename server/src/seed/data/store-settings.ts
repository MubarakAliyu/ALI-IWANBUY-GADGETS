/**
 * The shop's own details, as the owner supplied them on 9 October 2026 (ADR-017).
 *
 * This is the only place they are written down. The seed creates a `Setting` document from it, the
 * `settings:apply-defaults` script brings an already-seeded database up to it, and everything else — the
 * storefront footer, the contact page, checkout, invoices and emails — reads the document, never this file.
 * When the owner edits Store Settings in admin, their edit wins and nothing here overwrites it again.
 *
 * The bank details are public on purpose: every customer paying by transfer is shown them at checkout.
 * Nothing secret belongs here — SMTP credentials live in environment variables and are never committed.
 */

import { parseNairaToKobo } from "@aib/shared";

export const STORE_SETTINGS = {
  storeName: "ALI_IWANBUY Gadgets",
  legalName: "ALI_IWANBUY INTEGRATED SERVICE LTD",
  rcNumber: "8276954",
  tin: "32843883-0001",

  /** One address now, used everywhere including invoices — the owner confirmed it supersedes both earlier ones. */
  registeredAddress: "Shop No. 26, Bindawa Plaza, Ahmadu Bello Way, Birnin Kebbi, Kebbi State, Nigeria",
  shopAddress: "Shop No. 26, Bindawa Plaza, Ahmadu Bello Way, Birnin Kebbi, Kebbi State, Nigeria",

  phone: "+234 703 925 4143",
  whatsapp: "+234 703 925 4143",
  email: "iwanbuygadgets@gmail.com",

  bank: {
    bankName: "Moniepoint",
    accountName: "ALI ABDULLAHI",
    accountNumber: "5737727740",
  },

  openingHours: [
    { days: "Monday – Friday", opens: "8:00 am", closes: "10:00 pm" },
    { days: "Saturday – Sunday", opens: "10:00 am", closes: "10:00 pm" },
  ],

  deliveryFees: { localKobo: parseNairaToKobo(1_500), nationwideKobo: parseNairaToKobo(5_000) },
  freeDeliveryThresholdKobo: parseNairaToKobo(500_000),
  unpaidAutoCancelHours: 48,
  lowStockDefault: 3,
  // The tagline is printed under this note by the invoice renderer, so the note itself does not repeat it.
  invoiceFooterNote:
    "Thank you for shopping with ALI_IWANBUY Gadgets. Goods remain the property of ALI_IWANBUY INTEGRATED SERVICE LTD until paid for in full. Keep this invoice for your warranty.",
} as const;

/**
 * The fields `settings:apply-defaults` will write over a database that still carries the placeholders. The
 * delivery fees, thresholds and the invoice note are deliberately **not** here: the owner may already have
 * tuned those in admin, and a migration must not undo their work.
 */
export const OWNER_SUPPLIED_FIELDS = [
  "registeredAddress",
  "shopAddress",
  "email",
  "phone",
  "whatsapp",
  "bank",
  "openingHours",
] as const;
