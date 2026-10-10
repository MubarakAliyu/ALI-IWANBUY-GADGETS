import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { SetPinForm } from "@/components/admin/set-pin-form";
import { getAdminSession } from "@/lib/admin";

export const metadata: Metadata = { title: "Set your payment PIN" };

/**
 * Only an admin whose role can move money is asked for a PIN, and only while they do not have one — a STAFF
 * account has nothing to protect with it, and someone who already set one does not need asking again.
 */
export default async function SetPinPage() {
  const session = await getAdminSession().catch(() => null);
  const admin = session?.admin;

  if (admin && (admin.hasPin || admin.role === "STAFF")) {
    redirect("/admin");
  }

  return <SetPinForm mode="first" />;
}
