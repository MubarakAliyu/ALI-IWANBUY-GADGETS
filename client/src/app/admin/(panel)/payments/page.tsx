import type { Metadata } from "next";
import type { PaymentQuery, Permission } from "@aib/shared";
import { PaymentsView } from "@/components/admin/payments-view";
import { exportHref, getAdminSession, listAwaitingPayments, listPayments } from "@/lib/admin";

export const metadata: Metadata = { title: "Payments" };

/** Payments and refunds (A-7), with the queue of declared transfers on top. */
export default async function AdminPaymentsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const query = readQuery(params);

  const [awaiting, result, session] = await Promise.all([
    listAwaitingPayments(),
    listPayments(query),
    getAdminSession(),
  ]);

  const permissions = new Set(session.permissions as Permission[]);

  return (
    <div className="grid gap-5">
      <div className="grid gap-1">
        <h1 className="text-h1 text-brand-navy">Payments</h1>
        <p className="text-body-sm text-text-muted">
          Check the money has landed before you confirm. Every confirmation needs your PIN and is recorded
          against your name.
        </p>
      </div>

      <PaymentsView
        awaiting={awaiting.data}
        result={result}
        exportHref={exportHref("payments", query)}
        canConfirm={permissions.has("payments.confirm")}
      />
    </div>
  );
}

function readQuery(params: Record<string, string | string[] | undefined>): PaymentQuery {
  const one = (key: string): string | undefined => {
    const value = params[key];
    return Array.isArray(value) ? value[0] : value;
  };
  const page = Number(one("page"));

  return {
    ...(one("q") ? { q: one("q") } : {}),
    ...(one("method") ? { method: one("method") } : {}),
    ...(one("status") ? { status: one("status") as PaymentQuery["status"] } : {}),
    ...(one("from") ? { from: one("from") } : {}),
    ...(one("to") ? { to: one("to") } : {}),
    ...(Number.isFinite(page) && page > 1 ? { page } : {}),
  };
}
