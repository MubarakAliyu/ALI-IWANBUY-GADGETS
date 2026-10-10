import type { Metadata } from "next";
import { ProductEditor } from "@/components/admin/product-editor";
import { listAdminBrands, listAdminCategories } from "@/lib/admin";

export const metadata: Metadata = { title: "New product" };

export default async function NewProductPage() {
  const [categories, brands] = await Promise.all([listAdminCategories(), listAdminBrands()]);

  return <ProductEditor product={null} categories={categories.data} brands={brands.data} />;
}
