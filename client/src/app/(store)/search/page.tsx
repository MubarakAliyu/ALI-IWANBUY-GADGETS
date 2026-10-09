import type { Metadata } from "next";
import { CatalogueView } from "@/components/store/catalogue-view";
import { parseFilters } from "@/lib/filters";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Search",
  description: "Search phones, laptops, audio and accessories at ALI_IWANBUY Gadgets.",
  robots: { index: false, follow: true },
};

type PageProps = { searchParams: Promise<Record<string, string | string[] | undefined>> };

/** Search results (S-4) — the same listing as the shop, with the query in the URL. */
export default async function SearchPage({ searchParams }: PageProps) {
  const filters = parseFilters(await searchParams);

  return (
    <CatalogueView
      filters={filters}
      pathname="/search"
      heading={filters.q ? `Results for “${filters.q}”` : "Search"}
      description={filters.q ? undefined : "Type in the search box above to find a product."}
      breadcrumbs={[
        { href: "/", label: "Home" },
        { href: "/search", label: "Search" },
      ]}
    />
  );
}
