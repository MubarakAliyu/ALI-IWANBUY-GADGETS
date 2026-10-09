import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { CatalogueView } from "@/components/store/catalogue-view";
import { getCategories } from "@/lib/catalog";
import { parseFilters } from "@/lib/filters";

export const revalidate = 60;

type PageProps = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

/** The category and its parent, or `null` when the slug is not a category we show. */
async function findCategory(slug: string) {
  const tree = await getCategories();
  for (const parent of tree) {
    if (parent.slug === slug) {
      return { category: parent, parent: null };
    }
    const child = parent.children.find((candidate) => candidate.slug === slug);
    if (child) {
      return { category: child, parent };
    }
  }
  return null;
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const found = await findCategory(slug);
  if (!found) {
    return { title: "Category not found" };
  }
  return {
    title: found.category.name,
    description: `Buy ${found.category.name.toLowerCase()} in Birnin Kebbi — in stock at ALI_IWANBUY Gadgets with warranty on every sale.`,
    alternates: { canonical: `/category/${slug}` },
  };
}

/** A category listing (S-3). A parent category also shows everything in its children. */
export default async function CategoryPage({ params, searchParams }: PageProps) {
  const { slug } = await params;
  const [found, filters] = await Promise.all([findCategory(slug), parseFilters(await searchParams)]);

  if (!found) {
    notFound();
  }

  const { category, parent } = found;

  return (
    <CatalogueView
      filters={filters}
      pathname={`/category/${slug}`}
      lockedCategory={slug}
      heading={category.name}
      description={`${category.productCount ?? 0} ${category.productCount === 1 ? "product" : "products"} in ${category.name.toLowerCase()}.`}
      breadcrumbs={[
        { href: "/", label: "Home" },
        { href: "/shop", label: "Shop" },
        ...(parent ? [{ href: `/category/${parent.slug}`, label: parent.name }] : []),
        { href: `/category/${slug}`, label: category.name },
      ]}
    />
  );
}
