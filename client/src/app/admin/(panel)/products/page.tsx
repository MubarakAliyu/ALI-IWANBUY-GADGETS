import type { Metadata } from "next";
import type { AdminProductQuery, Permission } from "@aib/shared";
import Link from "next/link";
import { PlusIcon } from "lucide-react";
import { ProductsTable } from "@/components/admin/products-table";
import { Button } from "@/components/ui/button";
import { getAdminSession, listAdminBrands, listAdminCategories, listAdminProducts } from "@/lib/admin";

export const metadata: Metadata = { title: "Products" };

/** The catalogue (A-5), as the shop manages it. */
export default async function AdminProductsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const query = readQuery(params);

  const [result, categories, brands, session] = await Promise.all([
    listAdminProducts(query),
    listAdminCategories(),
    listAdminBrands(),
    getAdminSession(),
  ]);

  const permissions = new Set(session.permissions as Permission[]);

  return (
    <div className="grid gap-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="grid gap-1">
          <h1 className="text-h1 text-brand-navy">Products</h1>
          <p className="text-body-sm text-text-muted">
            Everything the shop sells. Stock here is the stock the storefront shows.
          </p>
        </div>

        {permissions.has("products.manage") ? (
          <Button asChild>
            <Link href="/admin/products/new">
              <PlusIcon aria-hidden="true" className="size-4" />
              Add a product
            </Link>
          </Button>
        ) : null}
      </div>

      <ProductsTable
        result={result}
        categories={categories.data}
        brands={brands.data}
        permissions={permissions}
      />
    </div>
  );
}

function readQuery(params: Record<string, string | string[] | undefined>): AdminProductQuery {
  const one = (key: string): string | undefined => {
    const value = params[key];
    return Array.isArray(value) ? value[0] : value;
  };
  const page = Number(one("page"));

  return {
    ...(one("q") ? { q: one("q") } : {}),
    ...(one("status") ? { status: one("status") as AdminProductQuery["status"] } : {}),
    ...(one("category") ? { category: one("category") } : {}),
    ...(one("brand") ? { brand: one("brand") } : {}),
    ...(one("stock") ? { stock: one("stock") as AdminProductQuery["stock"] } : {}),
    ...(one("sort") ? { sort: one("sort") as AdminProductQuery["sort"] } : {}),
    ...(one("dir") ? { dir: one("dir") as AdminProductQuery["dir"] } : {}),
    ...(Number.isFinite(page) && page > 1 ? { page } : {}),
  };
}
