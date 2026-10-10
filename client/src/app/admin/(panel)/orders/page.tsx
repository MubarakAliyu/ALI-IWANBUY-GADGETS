import type { Metadata } from "next";
import type { AdminOrderQuery } from "@aib/shared";
import { OrdersTable } from "@/components/admin/orders-table";
import { exportHref, listAdminOrders } from "@/lib/admin";

export const metadata: Metadata = { title: "Orders" };

/**
 * The orders list (A-4). The URL is the query: the server reads it, the API filters by it, and the CSV export
 * link carries the same thing — so what downloads is what is on screen.
 */
export default async function AdminOrdersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const query = readQuery(params);
  const result = await listAdminOrders(query);

  return (
    <div className="grid gap-5">
      <div className="grid gap-1">
        <h1 className="text-h1 text-brand-navy">Orders</h1>
        <p className="text-body-sm text-text-muted">
          Everything the shop has sold. Open an order to confirm a payment, move it along or cancel it.
        </p>
      </div>

      <OrdersTable result={result} exportHref={exportHref("orders", query)} />
    </div>
  );
}

/** Only the keys the API knows, as single values — a repeated parameter is a bookmark someone edited. */
function readQuery(params: Record<string, string | string[] | undefined>): AdminOrderQuery {
  const one = (key: string): string | undefined => {
    const value = params[key];
    return Array.isArray(value) ? value[0] : value;
  };

  const page = Number(one("page"));

  return {
    ...(one("q") ? { q: one("q") } : {}),
    ...(one("status") ? { status: one("status") } : {}),
    ...(one("paymentStatus") ? { paymentStatus: one("paymentStatus") } : {}),
    ...(one("paymentMethod") ? { paymentMethod: one("paymentMethod") } : {}),
    ...(one("from") ? { from: one("from") } : {}),
    ...(one("to") ? { to: one("to") } : {}),
    ...(one("sort") ? { sort: one("sort") as AdminOrderQuery["sort"] } : {}),
    ...(one("dir") ? { dir: one("dir") as AdminOrderQuery["dir"] } : {}),
    ...(Number.isFinite(page) && page > 1 ? { page } : {}),
  };
}
