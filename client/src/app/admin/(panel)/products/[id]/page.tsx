import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { ProductEditor } from "@/components/admin/product-editor";
import { getAdminProduct, listAdminBrands, listAdminCategories } from "@/lib/admin";
import { ApiRequestError } from "@/lib/api";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ id: string }>;
}): Promise<Metadata> {
  const { id } = await params;
  const product = await getAdminProduct(id).catch(() => null);
  return { title: product?.name ?? "Product" };
}

export default async function EditProductPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  const [product, categories, brands] = await Promise.all([
    getAdminProduct(id).catch((error: unknown) => {
      if (error instanceof ApiRequestError && error.isNotFound) {
        return null;
      }
      throw error;
    }),
    listAdminCategories(),
    listAdminBrands(),
  ]);

  if (!product) {
    notFound();
  }

  return <ProductEditor product={product} categories={categories.data} brands={brands.data} />;
}
