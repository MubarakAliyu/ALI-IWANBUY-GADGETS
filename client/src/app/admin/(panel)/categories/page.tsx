import type { Metadata } from "next";
import type { Permission } from "@aib/shared";
import { CatalogueManager } from "@/components/admin/catalogue-manager";
import { getAdminSession, listAdminBrands, listAdminCategories } from "@/lib/admin";

export const metadata: Metadata = { title: "Categories & brands" };

/** How the shop is organised (A-6) — both lists on one page, because they are edited together. */
export default async function AdminCataloguePage() {
  const [categories, brands, session] = await Promise.all([
    listAdminCategories(),
    listAdminBrands(),
    getAdminSession(),
  ]);

  const permissions = new Set(session.permissions as Permission[]);

  return (
    <div className="grid gap-5">
      <div className="grid gap-1">
        <h1 className="text-h1 text-brand-navy">Categories &amp; brands</h1>
        <p className="text-body-sm text-text-muted">
          How the shop is organised. The order here is the order customers see.
        </p>
      </div>

      <CatalogueManager
        categories={categories.data}
        brands={brands.data}
        canManage={permissions.has("catalogue.manage")}
      />
    </div>
  );
}
