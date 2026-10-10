import type { Metadata } from "next";
import { AdminUsers } from "@/components/admin/admin-users";
import { getAdminSession, listAdminUsers } from "@/lib/admin";

export const metadata: Metadata = { title: "Admin users" };

/** Who can get into the dashboard (A-10). Owner only, enforced on every route behind this page. */
export default async function AdminUsersPage() {
  const [admins, session] = await Promise.all([listAdminUsers(), getAdminSession()]);

  return (
    <div className="grid gap-5">
      <div className="grid gap-1">
        <h1 className="text-h1 text-brand-navy">Admin users</h1>
        <p className="text-body-sm text-text-muted">
          Everyone who can sign in to the dashboard, and what each of them is allowed to do.
        </p>
      </div>

      <AdminUsers admins={admins.data} currentId={session.admin?.id ?? ""} />
    </div>
  );
}
