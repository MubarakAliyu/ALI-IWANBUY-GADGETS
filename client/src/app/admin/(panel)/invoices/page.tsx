import type { Metadata } from "next";
import type { InvoiceQuery, Permission } from "@aib/shared";
import { InvoicesTable } from "@/components/admin/invoices-table";
import { exportHref, getAdminSession, listInvoices } from "@/lib/admin";

export const metadata: Metadata = { title: "Invoices" };

/** Invoices (A-8) — one for every confirmed payment, from the moment it was confirmed. */
export default async function AdminInvoicesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const query = readQuery(params);

  const [result, session] = await Promise.all([listInvoices(query), getAdminSession()]);
  const permissions = new Set(session.permissions as Permission[]);

  return (
    <div className="grid gap-5">
      <div className="grid gap-1">
        <h1 className="text-h1 text-brand-navy">Invoices</h1>
        <p className="text-body-sm text-text-muted">
          Issued automatically when a payment is confirmed. Send one to a customer, send it again, or void it
          with a reason — nothing here is ever edited.
        </p>
      </div>

      <InvoicesTable
        result={result}
        exportHref={exportHref("invoices", query)}
        canVoid={permissions.has("invoices.void")}
      />
    </div>
  );
}

function readQuery(params: Record<string, string | string[] | undefined>): InvoiceQuery {
  const one = (key: string): string | undefined => {
    const value = params[key];
    return Array.isArray(value) ? value[0] : value;
  };
  const page = Number(one("page"));

  return {
    ...(one("q") ? { q: one("q") } : {}),
    ...(one("status") ? { status: one("status") as InvoiceQuery["status"] } : {}),
    ...(Number.isFinite(page) && page > 1 ? { page } : {}),
  };
}
