import Link from "next/link";
import { Container, SectionHeading } from "@/components/shared/container";
import { Hero } from "@/components/store/hero";
import { BrandStrip, CategoryTiles, PromoBanner, ValueProps } from "@/components/store/home-sections";
import { ProductGrid, ProductScroller } from "@/components/store/product-grid";
import { Button } from "@/components/ui/button";
import { getHome } from "@/lib/catalog";
import { SITE } from "@/lib/site";

export const revalidate = 60;

export const metadata = {
  // Absolute: the home page is the one title that should not be suffixed with the shop name twice.
  title: { absolute: `${SITE.name} — Phones & gadgets in ${SITE.city}` },
  description: SITE.description,
  alternates: { canonical: "/" },
};

/** The home page (S-2). A Server Component: the whole page is HTML by the time it reaches the phone. */
export default async function HomePage() {
  const { featured, newArrivals, categories, brands } = await getHome();

  return (
    <>
      <Hero />

      <Container className="py-12">
        <SectionHeading
          title="Shop by category"
          description="Everything we stock, grouped the way you ask for it."
        />
        <CategoryTiles categories={categories} />
      </Container>

      {featured.length > 0 ? (
        <Container className="pb-12">
          <SectionHeading
            title="Featured products"
            description="What is moving fastest this month."
            action={
              <Button asChild variant="outline" size="sm">
                <Link href="/shop">See all</Link>
              </Button>
            }
            className="mb-5"
          />
          <ProductGrid products={featured} priorityCount={4} />
        </Container>
      ) : null}

      {newArrivals.length > 0 ? (
        <section className="bg-grey-50 py-12">
          <Container>
            <SectionHeading
              title="New arrivals"
              description="Just landed in the shop."
              action={
                <Button asChild variant="outline" size="sm">
                  <Link href="/shop?sort=newest">See all</Link>
                </Button>
              }
              className="mb-5"
            />
            <ProductScroller products={newArrivals} />
          </Container>
        </section>
      ) : null}

      <Container className="py-12">
        <SectionHeading title="Shop by brand" className="mb-5" />
        <BrandStrip brands={brands} />
      </Container>

      <Container className="pb-12">
        <ValueProps />
      </Container>

      <PromoBanner />
    </>
  );
}
