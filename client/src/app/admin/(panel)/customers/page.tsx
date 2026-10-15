import type { Metadata } from "next";
import type { AdminCustomerQuery, Permission } from "@aib/shared";
import { CustomersTable } from "@/components/admin/customers-table";
import { exportHref, getAdminSession, listCustomers } from "@/lib/admin";

export const metadata: Metadata = { title: "Customers" };

/** Customers (A-9). What anyone has spent is sent only to a role that may see it. */
export default async function AdminCustomersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const query = readQuery(params);

  const [result, session] = await Promise.all([listCustomers(query), getAdminSession()]);
  const permissions = new Set(session.permissions as Permission[]);

  return (
    <div className="grid gap-5">
      <div className="grid gap-1">
        <h1 className="text-h1 text-brand-navy">Customers</h1>
        <p className="text-body-sm text-text-muted">
          Everyone who has an account. Suspending one signs them out everywhere and stops them ordering.
        </p>
      </div>

      <CustomersTable result={result} permissions={permissions} exportHref={exportHref("customers", query)} />
    </div>
  );
}

function readQuery(params: Record<string, string | string[] | undefined>): AdminCustomerQuery {
  const one = (key: string): string | undefined => {
    const value = params[key];
    return Array.isArray(value) ? value[0] : value;
  };
  const page = Number(one("page"));

  return {
    ...(one("q") ? { q: one("q") } : {}),
    ...(one("status") ? { status: one("status") as AdminCustomerQuery["status"] } : {}),
    ...(one("sort") ? { sort: one("sort") as AdminCustomerQuery["sort"] } : {}),
    ...(one("dir") ? { dir: one("dir") as AdminCustomerQuery["dir"] } : {}),
    ...(Number.isFinite(page) && page > 1 ? { page } : {}),
  };
}
