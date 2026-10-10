/**
 * The admin side of the contract (overview §3.2, §6.5, §10). Roles, the permission matrix and the shapes the
 * dashboard sends and receives.
 *
 * The matrix lives here, in code both sides import, because the UI hides what a role cannot do and the server
 * refuses it — and those two must never be able to disagree. The server is the one that decides; the UI only
 * uses this to avoid offering a button that would be refused.
 */

import { z } from "zod";
import { objectIdSchema } from "./catalog.js";
import { emailSchema, nameSchema, passwordSchema, phoneSchema } from "./account.js";

export const ADMIN_ROLES = ["OWNER", "MANAGER", "STAFF"] as const;
export type AdminRole = (typeof ADMIN_ROLES)[number];

export const ADMIN_ROLE_LABEL: Record<AdminRole, string> = {
  OWNER: "Owner",
  MANAGER: "Manager",
  STAFF: "Staff",
};

export const ADMIN_ROLE_DESCRIPTION: Record<AdminRole, string> = {
  OWNER: "Everything, including admin users and store settings.",
  MANAGER: "Runs the shop day to day: products, orders, payments, invoices and customers.",
  STAFF: "Fulfils orders and keeps stock up to date. No money figures.",
};

/**
 * Every distinct thing an admin can do. Grouped by the screen it belongs to, and named for the action rather
 * than the route, so a new endpoint reuses an existing permission instead of inventing one.
 */
export const PERMISSIONS = {
  /** The financial overview: revenue, average order value, refunds. */
  "dashboard.financial": ["OWNER", "MANAGER"],
  /** The operational tiles: orders to fulfil, low stock. */
  "dashboard.operational": ["OWNER", "MANAGER", "STAFF"],

  "products.view": ["OWNER", "MANAGER", "STAFF"],
  "products.manage": ["OWNER", "MANAGER"],
  /** Staff may correct stock without being able to change a price. */
  "products.stock": ["OWNER", "MANAGER", "STAFF"],
  "catalogue.manage": ["OWNER", "MANAGER"],

  "orders.view": ["OWNER", "MANAGER", "STAFF"],
  "orders.fulfil": ["OWNER", "MANAGER", "STAFF"],
  "orders.cancel": ["OWNER", "MANAGER"],
  "orders.refund": ["OWNER", "MANAGER"],

  "payments.view": ["OWNER", "MANAGER"],
  "payments.confirm": ["OWNER", "MANAGER"],
  "invoices.manage": ["OWNER", "MANAGER"],
  "invoices.void": ["OWNER"],

  "customers.view": ["OWNER", "MANAGER", "STAFF"],
  /** What a customer has spent is a money figure, so staff do not see it. */
  "customers.spend": ["OWNER", "MANAGER"],
  "customers.manage": ["OWNER", "MANAGER"],

  "admins.manage": ["OWNER"],
  "settings.manage": ["OWNER"],
  "audit.view": ["OWNER", "MANAGER"],
} as const satisfies Record<string, readonly AdminRole[]>;

export type Permission = keyof typeof PERMISSIONS;

export function roleCan(role: AdminRole, permission: Permission): boolean {
  return (PERMISSIONS[permission] as readonly AdminRole[]).includes(role);
}

/** Every permission a role holds — what the UI uses to decide which navigation items exist. */
export function permissionsFor(role: AdminRole): Permission[] {
  return (Object.keys(PERMISSIONS) as Permission[]).filter((permission) => roleCan(role, permission));
}

// ── PIN (overview §6.5) ─────────────────────────────────────────────────────────────────────────────

export const PIN_MIN_LENGTH = 4;
export const PIN_MAX_LENGTH = 6;

/**
 * PINs that are no PIN at all. A four-digit PIN has ten thousand values and people reach for the same
 * handful; these are refused outright rather than merely discouraged.
 */
export function isTrivialPin(pin: string): boolean {
  if (/^(\d)\1+$/.test(pin)) {
    return true;
  }
  const ascending = "0123456789";
  const descending = "9876543210";
  if (ascending.includes(pin) || descending.includes(pin)) {
    return true;
  }
  return ["1234", "4321", "123456", "654321", "1212", "6969", "0007"].includes(pin);
}

/**
 * **Entering** a PIN: the only thing worth checking before the request is that it is the right shape. The
 * trivial-PIN rule belongs to choosing one — telling someone their existing PIN is "too easy to guess" when
 * they have simply mistyped it would be nonsense, and the server is the one that decides whether it matches.
 */
export const pinSchema = z
  .string()
  .regex(
    new RegExp(`^\\d{${PIN_MIN_LENGTH},${PIN_MAX_LENGTH}}$`),
    `Use ${PIN_MIN_LENGTH}–${PIN_MAX_LENGTH} digits`,
  );

/** **Choosing** a PIN: the same shape, and not one of the handful anyone would try first. */
export const newPinSchema = pinSchema.refine(
  (pin) => !isTrivialPin(pin),
  "That PIN is too easy to guess — choose another",
);

export const setPinSchema = z
  .object({
    /** The current PIN, or the account password when setting one for the first time. */
    currentPin: z.string().optional(),
    password: z.string().optional(),
    pin: newPinSchema,
    confirmPin: z.string(),
  })
  .refine((value) => value.pin === value.confirmPin, {
    message: "The PINs do not match",
    path: ["confirmPin"],
  });
export type SetPinInput = z.infer<typeof setPinSchema>;

// ── Sessions and accounts ───────────────────────────────────────────────────────────────────────────

export const adminLoginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Enter your password"),
});
export type AdminLoginInput = z.infer<typeof adminLoginSchema>;

export const adminChangePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, "Enter your current password"),
    newPassword: passwordSchema,
    confirmPassword: z.string(),
  })
  .refine((value) => value.newPassword === value.confirmPassword, {
    message: "The passwords do not match",
    path: ["confirmPassword"],
  });
export type AdminChangePasswordInput = z.infer<typeof adminChangePasswordSchema>;

export const adminProfileSchema = z.object({
  firstName: nameSchema,
  lastName: nameSchema,
  phone: z.union([phoneSchema, z.literal("")]).optional(),
});
export type AdminProfileInput = z.infer<typeof adminProfileSchema>;

export const adminSchema = z.object({
  id: objectIdSchema,
  firstName: z.string(),
  lastName: z.string(),
  email: z.string(),
  phone: z.string(),
  role: z.enum(ADMIN_ROLES),
  status: z.enum(["ACTIVE", "SUSPENDED"]),
  mustChangePassword: z.boolean(),
  hasPin: z.boolean(),
  lastLoginAt: z.string().nullable(),
  createdAt: z.string(),
});
export type Admin = z.infer<typeof adminSchema>;

/** `GET /admin/auth/me` — the signed-in admin plus what their role allows, for the shell to render from. */
export const adminSessionSchema = z.object({
  admin: adminSchema.nullable(),
  permissions: z.array(z.string()),
});
export type AdminSession = z.infer<typeof adminSessionSchema>;

export const createAdminSchema = z.object({
  firstName: nameSchema,
  lastName: nameSchema,
  email: emailSchema,
  phone: z.union([phoneSchema, z.literal("")]).optional(),
  role: z.enum(ADMIN_ROLES),
});
export type CreateAdminInput = z.infer<typeof createAdminSchema>;

export const updateAdminRoleSchema = z.object({ role: z.enum(ADMIN_ROLES) });
export const adminStatusSchema = z.object({ status: z.enum(["ACTIVE", "SUSPENDED"]) });

// ── Orders, payments and invoices on the admin side (overview §10 A-4, A-7, A-8) ────────────────────

/**
 * The admin order list carries a little more than the customer's own: who placed it, and whether it is
 * waiting on something. `totalKobo` is in the row for every role — a staff member fulfilling an order still
 * needs to know what the customer paid for. The *aggregate* money figures are what STAFF never see.
 */
export const adminOrderRowSchema = z.object({
  orderNumber: z.string(),
  customerName: z.string(),
  customerEmail: z.string(),
  status: z.string(),
  paymentStatus: z.string(),
  paymentMethod: z.string(),
  deliveryMethod: z.string(),
  itemCount: z.number().int(),
  totalKobo: z.number().int(),
  placedAt: z.string(),
  invoiceNumber: z.string().nullable(),
});
export type AdminOrderRow = z.infer<typeof adminOrderRowSchema>;

export const ADMIN_ORDER_SORTS = ["placedAt", "totalKobo", "orderNumber"] as const;
export type AdminOrderSort = (typeof ADMIN_ORDER_SORTS)[number];

/** What the orders table can be narrowed by. Every field is optional — the bare list is "everything, newest". */
export const adminOrderQuerySchema = z.object({
  q: z.string().trim().max(80).optional(),
  status: z.string().optional(),
  paymentStatus: z.string().optional(),
  paymentMethod: z.string().optional(),
  deliveryMethod: z.string().optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  sort: z.enum(ADMIN_ORDER_SORTS).optional(),
  dir: z.enum(["asc", "desc"]).optional(),
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(200).optional(),
});
export type AdminOrderQuery = z.infer<typeof adminOrderQuerySchema>;

/** Moving an order along. The next status is chosen from what the lifecycle allows, never typed in. */
export const advanceOrderSchema = z.object({
  status: z.string().min(1),
  note: z.string().trim().max(400).optional(),
});
export type AdvanceOrderInput = z.infer<typeof advanceOrderSchema>;

/** Cancelling as an admin. The PIN is required only when the order has been paid for (CLAUDE.md). */
export const adminCancelOrderSchema = z.object({
  reason: z.string().trim().min(3, "Say why, so the customer's email makes sense.").max(400),
  pin: pinSchema.optional(),
});
export type AdminCancelOrderInput = z.infer<typeof adminCancelOrderSchema>;

export const confirmPaymentSchema = z.object({
  amountKobo: z.number().int().positive("Enter the amount that arrived."),
  reference: z.string().trim().max(80).optional(),
  note: z.string().trim().max(400).optional(),
  pin: pinSchema,
});
export type ConfirmPaymentFormInput = z.infer<typeof confirmPaymentSchema>;

export const refundOrderSchema = z.object({
  reason: z.string().trim().min(3, "Say why this is being refunded.").max(400),
  pin: pinSchema,
});
export type RefundOrderInput = z.infer<typeof refundOrderSchema>;

export const awaitingPaymentRowSchema = z.object({
  orderNumber: z.string(),
  customerName: z.string(),
  totalKobo: z.number().int(),
  placedAt: z.string(),
  reference: z.string().nullable(),
});
export type AwaitingPaymentRow = z.infer<typeof awaitingPaymentRowSchema>;

export const paymentRowSchema = z.object({
  paymentNumber: z.string(),
  orderNumber: z.string(),
  customerName: z.string(),
  amountKobo: z.number().int(),
  method: z.string(),
  reference: z.string().nullable(),
  status: z.string(),
  confirmedBy: z.string(),
  confirmedAt: z.string(),
  note: z.string().nullable(),
});
export type PaymentRow = z.infer<typeof paymentRowSchema>;

export const INVOICE_STATUSES = ["ISSUED", "SENT", "VOID"] as const;
export type InvoiceStatus = (typeof INVOICE_STATUSES)[number];

export const invoiceRowSchema = z.object({
  invoiceNumber: z.string(),
  orderNumber: z.string(),
  customerName: z.string(),
  customerEmail: z.string(),
  totalKobo: z.number().int(),
  issuedAt: z.string(),
  issuedBy: z.string(),
  status: z.enum(INVOICE_STATUSES),
  sentCount: z.number().int(),
  lastSentAt: z.string().nullable(),
  voidReason: z.string().nullable(),
});
export type InvoiceRow = z.infer<typeof invoiceRowSchema>;

export const invoiceQuerySchema = z.object({
  q: z.string().trim().max(80).optional(),
  status: z.enum(INVOICE_STATUSES).optional(),
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(200).optional(),
});
export type InvoiceQuery = z.infer<typeof invoiceQuerySchema>;

/** Voiding an invoice is an OWNER-only correction, and the reason is printed in the audit trail. */
export const voidInvoiceSchema = z.object({
  reason: z.string().trim().min(3, "Say why this invoice is being voided.").max(400),
});
export type VoidInvoiceInput = z.infer<typeof voidInvoiceSchema>;

/** An internal note on an order (overview §10 A-4) — for the shop, never shown to the customer. */
export const orderNoteSchema = z.object({
  body: z.string().trim().min(1, "Write the note first.").max(1000),
});
export type OrderNoteInput = z.infer<typeof orderNoteSchema>;

export const paymentQuerySchema = z.object({
  q: z.string().trim().max(80).optional(),
  method: z.string().optional(),
  status: z.enum(["CONFIRMED", "REFUNDED"]).optional(),
  admin: objectIdSchema.optional(),
  from: z.string().optional(),
  to: z.string().optional(),
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(200).optional(),
});
export type PaymentQuery = z.infer<typeof paymentQuerySchema>;

/**
 * The payments page shows a totals row for the filtered set, not just the page (A-7): net is confirmed money
 * less refunds, which is the figure the owner actually wants to see.
 */
export const paymentTotalsSchema = z.object({
  confirmedKobo: z.number().int(),
  refundedKobo: z.number().int(),
  netKobo: z.number().int(),
  count: z.number().int(),
});
export type PaymentTotals = z.infer<typeof paymentTotalsSchema>;

// ── The dashboard (overview §10 A-3) ────────────────────────────────────────────────────────────────

/**
 * The periods the overview can be read over. `custom` takes `from` and `to`; the rest are named because they
 * are what the owner actually asks for, and because a named period can be compared with the one before it
 * without the client having to work out what that is.
 */
export const DASHBOARD_PERIODS = ["today", "7d", "30d", "month", "last-month", "custom"] as const;
export type DashboardPeriod = (typeof DASHBOARD_PERIODS)[number];

export const DASHBOARD_PERIOD_LABEL: Record<DashboardPeriod, string> = {
  today: "Today",
  "7d": "Last 7 days",
  "30d": "Last 30 days",
  month: "This month",
  "last-month": "Last month",
  custom: "Custom range",
};

export const dashboardQuerySchema = z.object({
  period: z.enum(DASHBOARD_PERIODS).optional(),
  from: z.string().optional(),
  to: z.string().optional(),
});
export type DashboardQuery = z.infer<typeof dashboardQuerySchema>;

/**
 * One tile. `previous` is the same measure over the period immediately before, so the client renders the
 * delta rather than computing it — there is one definition of "up 12%" and it lives on the server.
 */
export const kpiSchema = z.object({
  value: z.number(),
  previous: z.number(),
});
export type Kpi = z.infer<typeof kpiSchema>;

export const dashboardSchema = z.object({
  period: z.object({
    key: z.enum(DASHBOARD_PERIODS),
    label: z.string(),
    from: z.string(),
    to: z.string(),
    days: z.number().int(),
  }),

  /** Every role sees these: what has to be done today. */
  operational: z.object({
    awaitingConfirmation: kpiSchema,
    toFulfil: kpiSchema,
    unitsSold: kpiSchema,
    lowStockVariants: kpiSchema,
    ordersByStatus: z.array(z.object({ status: z.string(), count: z.number().int() })),
    recentOrders: z.array(
      z.object({
        orderNumber: z.string(),
        customerName: z.string(),
        status: z.string(),
        totalKobo: z.number().int(),
        placedAt: z.string(),
      }),
    ),
    lowStock: z.array(
      z.object({
        productId: z.string(),
        name: z.string(),
        slug: z.string(),
        variantLabel: z.string(),
        sku: z.string(),
        stock: z.number().int(),
      }),
    ),
  }),

  /** OWNER and MANAGER only — the server omits this entirely for STAFF (§3.2). */
  financial: z
    .object({
      revenueKobo: kpiSchema,
      orders: kpiSchema,
      averageOrderKobo: kpiSchema,
      awaitingKobo: kpiSchema,
      refundsKobo: kpiSchema,
      newCustomers: kpiSchema,
      revenueByDay: z.array(z.object({ day: z.string(), revenueKobo: z.number().int() })),
      paymentMethods: z.array(
        z.object({ method: z.string(), count: z.number().int(), amountKobo: z.number().int() }),
      ),
      topProducts: z.array(
        z.object({
          productId: z.string(),
          name: z.string(),
          slug: z.string(),
          units: z.number().int(),
          revenueKobo: z.number().int(),
        }),
      ),
    })
    .nullable(),
});
export type Dashboard = z.infer<typeof dashboardSchema>;
