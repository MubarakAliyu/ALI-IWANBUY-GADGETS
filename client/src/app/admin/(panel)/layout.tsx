import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AdminShell } from "@/components/admin/admin-shell";
import { getAdminSession } from "@/lib/admin";

export const metadata: Metadata = {
  title: { default: "Dashboard", template: "%s · ALI_IWANBUY Dashboard" },
  robots: { index: false, follow: false },
};

/**
 * The gate in front of every dashboard page (A-1).
 *
 * The middleware has already turned away anyone with no cookie; this is the check that the cookie still
 * identifies an active admin, which only the API can answer. It also sends an admin who has not finished
 * setting themselves up — a temporary password, or no payment PIN — to the page that finishes it, because
 * the API refuses everything else until they do.
 */
export default async function AdminPanelLayout({ children }: { children: React.ReactNode }) {
  const session = await getAdminSession().catch(() => null);

  if (!session?.admin) {
    redirect("/admin/login");
  }
  if (session.admin.mustChangePassword) {
    redirect("/admin/choose-password");
  }

  return <AdminShell session={session}>{children}</AdminShell>;
}
