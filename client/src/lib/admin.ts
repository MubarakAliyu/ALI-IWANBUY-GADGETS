/**
 * The dashboard's calls, in one place (overview §6.3, §11).
 *
 * Nothing here is cached and everything carries the admin cookie: a dashboard that shows yesterday's numbers
 * is worse than one that takes a moment. The permissions the session returns are for hiding buttons only —
 * the server decides, every time.
 */

import type {
  AdminCancelOrderInput,
  AdminOrderQuery,
  AdminOrderRow,
  AdminProfileInput,
  AdminSession,
  AdvanceOrderInput,
  AwaitingPaymentRow,
  ConfirmPaymentFormInput,
  Dashboard,
  DashboardQuery,
  InvoiceQuery,
  InvoiceRow,
  OrderDetail,
  OrderNoteInput,
  PaymentQuery,
  PaymentRow,
  PaymentTotals,
  Permission,
  RefundOrderInput,
  SetPinInput,
  VoidInvoiceInput,
} from "@aib/shared";
import { apiRequest } from "@/lib/api";

/** Nothing the dashboard reads is cached, and all of it carries the cookie. */
const PRIVATE = { revalidate: false as const, forwardCookies: true };

export type Paginated<T> = { data: T[]; page: number; limit: number; total: number; pages: number };

/** `GET /admin/auth/me` — null when nobody is signed in, which is not an error. */
export function getAdminSession(): Promise<AdminSession> {
  return apiRequest<AdminSession>("/admin/auth/me", PRIVATE);
}

export type AdminLoginResult = {
  admin: AdminSession["admin"];
  mustChangePassword: boolean;
  mustSetPin: boolean;
};

export function adminLogin(input: { email: string; password: string }): Promise<AdminLoginResult> {
  return apiRequest<AdminLoginResult>("/admin/auth/login", { method: "POST", body: input });
}

export function adminLogout(): Promise<{ ok: boolean }> {
  return apiRequest<{ ok: boolean }>("/admin/auth/logout", { method: "POST" });
}

export function changeAdminPassword(input: {
  currentPassword: string;
  newPassword: string;
  confirmPassword: string;
}): Promise<{ ok: boolean }> {
  return apiRequest<{ ok: boolean }>("/admin/auth/change-password", { method: "POST", body: input });
}

export function setOwnPin(input: SetPinInput): Promise<{ ok: boolean }> {
  return apiRequest<{ ok: boolean }>("/admin/me/pin", { method: "POST", body: input });
}

export function updateAdminProfile(input: AdminProfileInput): Promise<AdminSession> {
  return apiRequest<AdminSession>("/admin/me/profile", { method: "PATCH", body: input });
}

// ── Overview ────────────────────────────────────────────────────────────────────────────────────────

export function getDashboard(query: DashboardQuery = {}): Promise<Dashboard> {
  return apiRequest<Dashboard>(`/admin/dashboard${toQuery(query)}`, PRIVATE);
}

// ── Orders ──────────────────────────────────────────────────────────────────────────────────────────

/** Drops the keys a URL has no value for, so the query string stays as short as what the user chose. */
function toQuery(params: Record<string, string | number | undefined>): string {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== "") {
      search.set(key, String(value));
    }
  }
  const query = search.toString();
  return query ? `?${query}` : "";
}

export function listAdminOrders(query: AdminOrderQuery = {}): Promise<Paginated<AdminOrderRow>> {
  return apiRequest<Paginated<AdminOrderRow>>(`/admin/orders${toQuery(query)}`, PRIVATE);
}

export type AdminOrderDetail = OrderDetail & {
  customer: { id: string; name: string; email: string; phone: string; orderCount: number };
  nextStatuses: string[];
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

export function getAdminOrder(orderNumber: string): Promise<AdminOrderDetail> {
  return apiRequest<AdminOrderDetail>(`/admin/orders/${orderNumber}`, PRIVATE);
}

export function advanceOrder(orderNumber: string, input: AdvanceOrderInput): Promise<AdminOrderDetail> {
  return apiRequest<AdminOrderDetail>(`/admin/orders/${orderNumber}/status`, {
    method: "POST",
    body: input,
  });
}

export function addAdminNote(orderNumber: string, input: OrderNoteInput): Promise<AdminOrderDetail> {
  return apiRequest<AdminOrderDetail>(`/admin/orders/${orderNumber}/notes`, { method: "POST", body: input });
}

export function cancelAdminOrder(
  orderNumber: string,
  input: AdminCancelOrderInput,
): Promise<AdminOrderDetail> {
  return apiRequest<AdminOrderDetail>(`/admin/orders/${orderNumber}/cancel`, {
    method: "POST",
    body: input,
  });
}

export function refundAdminOrder(orderNumber: string, input: RefundOrderInput): Promise<AdminOrderDetail> {
  return apiRequest<AdminOrderDetail>(`/admin/orders/${orderNumber}/refund`, {
    method: "POST",
    body: input,
  });
}

export type ConfirmPaymentResult = {
  order: OrderDetail;
  invoiceNumber: string;
  paymentNumber: string;
};

export function confirmOrderPayment(
  orderNumber: string,
  input: ConfirmPaymentFormInput,
): Promise<ConfirmPaymentResult> {
  return apiRequest<ConfirmPaymentResult>(`/admin/orders/${orderNumber}/confirm-payment`, {
    method: "POST",
    body: input,
  });
}

// ── Payments and invoices ───────────────────────────────────────────────────────────────────────────

export function listAwaitingPayments(): Promise<{ data: AwaitingPaymentRow[] }> {
  return apiRequest<{ data: AwaitingPaymentRow[] }>("/admin/payments/awaiting", PRIVATE);
}

export function listPayments(
  query: PaymentQuery = {},
): Promise<Paginated<PaymentRow> & { totals: PaymentTotals }> {
  return apiRequest<Paginated<PaymentRow> & { totals: PaymentTotals }>(
    `/admin/payments${toQuery(query)}`,
    PRIVATE,
  );
}

export function listInvoices(query: InvoiceQuery = {}): Promise<Paginated<InvoiceRow>> {
  return apiRequest<Paginated<InvoiceRow>>(`/admin/invoices${toQuery(query)}`, PRIVATE);
}

export function sendInvoice(
  invoiceNumber: string,
): Promise<{ invoiceNumber: string; sentTo: string; sentCount: number }> {
  return apiRequest<{ invoiceNumber: string; sentTo: string; sentCount: number }>(
    `/admin/invoices/${invoiceNumber}/send`,
    { method: "POST" },
  );
}

export function voidInvoice(invoiceNumber: string, input: VoidInvoiceInput): Promise<InvoiceRow> {
  return apiRequest<InvoiceRow>(`/admin/invoices/${invoiceNumber}/void`, { method: "POST", body: input });
}

/**
 * Downloads and CSV exports are plain links rather than fetches: the browser's own download handling is
 * better than anything rebuilt here, and the cookie goes with it because the path is first-party.
 */
export function invoicePdfHref(invoiceNumber: string): string {
  return `/api/v1/admin/invoices/${invoiceNumber}.pdf`;
}

export function exportHref(what: "orders" | "payments" | "invoices", query: object = {}): string {
  return `/api/v1/admin/${what}/export${toQuery(query as Record<string, string | number | undefined>)}`;
}

/** What the signed-in role may do, as a set the shell can ask cheaply. */
export function permissionSet(session: AdminSession): Set<Permission> {
  return new Set(session.permissions as Permission[]);
}
