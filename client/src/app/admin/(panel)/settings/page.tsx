import type { Metadata } from "next";
import { SettingsForm } from "@/components/admin/settings-form";
import { getStoreSettings } from "@/lib/admin";

export const metadata: Metadata = { title: "Store settings" };

/** The shop's own details (A-12). Everything the storefront and the invoices say comes from here. */
export default async function AdminSettingsPage() {
  const settings = await getStoreSettings();

  return (
    <div className="grid gap-5">
      <div className="grid gap-1">
        <h1 className="text-h1 text-brand-navy">Store settings</h1>
        <p className="text-body-sm text-text-muted">
          The storefront footer, the bank details at checkout and the company block on every invoice all read
          from this page. Every change is recorded.
        </p>
      </div>

      <SettingsForm settings={settings} />
    </div>
  );
}
