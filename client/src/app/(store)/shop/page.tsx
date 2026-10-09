import type { Metadata } from "next";
import { CatalogueView } from "@/components/store/catalogue-view";
import { parseFilters } from "@/lib/filters";

export const revalidate = 60;

export const metadata: Metadata = {
  title: "Shop all products",
  description:
    "Browse every phone, tablet, laptop, smartwatch, audio device and accessory in stock at ALI_IWANBUY Gadgets.",
  alternates: { canonical: "/shop" },
};

type PageProps = { searchParams: Promise<Record<string, string | string[] | undefined>> };

/** The full catalogue (S-3). Every filter, sort and page is read from — and written back to — the URL. */
export default async function ShopPage({ searchParams }: PageProps) {
  const filters = parseFilters(await searchParams);

  return (
    <CatalogueView
      filters={filters}
      pathname="/shop"
      heading="Shop all products"
      description="Phones, tablets, laptops, watches, audio and accessories — everything we stock."
      breadcrumbs={[
        { href: "/", label: "Home" },
        { href: "/shop", label: "Shop" },
      ]}
    />
  );
}
