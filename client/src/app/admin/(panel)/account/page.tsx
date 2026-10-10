import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AccountSettings } from "@/components/admin/account-settings";
import { getAdminSession } from "@/lib/admin";

export const metadata: Metadata = { title: "Account settings" };

/** Every admin's own account (A-11) — no permission needed, because it is theirs. */
export default async function AdminAccountPage() {
  const session = await getAdminSession();
  if (!session.admin) {
    redirect("/admin/login");
  }

  return (
    <div className="grid max-w-3xl gap-5">
      <div className="grid gap-1">
        <h1 className="text-h1 text-brand-navy">Account settings</h1>
        <p className="text-body-sm text-text-muted">
          Your details, your password and your payment PIN.
        </p>
      </div>

      <AccountSettings admin={session.admin} />
    </div>
  );
}
