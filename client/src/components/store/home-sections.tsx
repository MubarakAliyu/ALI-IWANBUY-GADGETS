import type { Brand, CategoryNode } from "@aib/shared";
import Image from "next/image";
import Link from "next/link";
import { BadgeCheckIcon, ShieldCheckIcon, StoreIcon, TruckIcon } from "lucide-react";
import { Container } from "@/components/shared/container";
import { Button } from "@/components/ui/button";
import { SITE } from "@/lib/site";

/** The category tiles under the hero (S-2). Each one is a photograph, a name and a count. */
export function CategoryTiles({ categories }: { categories: CategoryNode[] }) {
  if (categories.length === 0) {
    return null;
  }

  return (
    <ul className="grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-6">
      {categories.slice(0, 6).map((category) => (
        <li key={category.slug}>
          <Link
            href={`/category/${category.slug}`}
            className="group grid gap-2 rounded-md border border-grey-200 bg-white p-3 transition-shadow duration-150 ease-out hover:shadow-md"
          >
            <span className="relative block aspect-[4/3] overflow-hidden rounded-sm bg-grey-50">
              {category.image ? (
                <Image
                  src={category.image}
                  alt=""
                  fill
                  sizes="(max-width: 768px) 45vw, 200px"
                  className="object-cover transition-transform duration-200 ease-out group-hover:scale-105"
                />
              ) : null}
            </span>
            <span className="text-body-sm font-semibold text-brand-navy">{category.name}</span>
            <span className="text-caption numeric text-text-muted">
              {category.productCount ?? 0} {category.productCount === 1 ? "product" : "products"}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

/** The shop-by-brand strip (S-2). */
export function BrandStrip({ brands }: { brands: Brand[] }) {
  const withProducts = brands.filter((brand) => (brand.productCount ?? 0) > 0);
  if (withProducts.length === 0) {
    return null;
  }

  return (
    <ul className="flex flex-wrap gap-2">
      {withProducts.map((brand) => (
        <li key={brand.slug}>
          <Link
            href={`/shop?brand=${brand.slug}`}
            className="inline-flex items-center gap-2 rounded-full border border-grey-200 bg-white px-4 py-2 text-body-sm font-medium text-brand-navy transition-colors duration-150 ease-out hover:border-primary-200 hover:bg-primary-50"
          >
            {brand.name}
            <span className="text-caption numeric text-text-muted">{brand.productCount}</span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

const VALUE_PROPS = [
  {
    icon: BadgeCheckIcon,
    title: "Genuine devices",
    body: "Original stock, checked before it reaches the shelf.",
  },
  {
    icon: ShieldCheckIcon,
    title: "Warranty on every sale",
    body: "Up to 12 months, stated on the product page.",
  },
  { icon: StoreIcon, title: "Fast pickup", body: `Collect the same day at our shop in ${SITE.city}.` },
  { icon: TruckIcon, title: "Secure payment", body: "Bank transfer confirmed by us, or pay on delivery." },
];

/** The four promises, under the catalogue (S-2). */
export function ValueProps() {
  return (
    <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {VALUE_PROPS.map((prop) => (
        <li key={prop.title} className="flex gap-3 rounded-md border border-grey-200 bg-white p-4">
          <prop.icon aria-hidden="true" className="size-5 shrink-0 text-brand-primary" />
          <div className="grid gap-1">
            <p className="text-body-sm font-semibold text-brand-navy">{prop.title}</p>
            <p className="text-caption text-text-muted">{prop.body}</p>
          </div>
        </li>
      ))}
    </ul>
  );
}

/** The promo banner above the footer (S-2). */
export function PromoBanner() {
  return (
    <Container>
      <div data-surface="dark" className="relative overflow-hidden rounded-lg bg-brand-navy text-on-dark">
        <div className="grid items-center gap-6 p-8 md:grid-cols-2 md:p-10">
          <div className="grid gap-3">
            <p className="text-label text-on-dark-accent uppercase">Accessories</p>
            <h2 className="text-h2">Chargers, cases and power banks that last</h2>
            <p className="max-w-sm text-body-sm text-on-dark-muted">
              The small things that keep a phone alive — genuine Anker and Oraimo, fitted free in the shop.
            </p>
            <div>
              <Button asChild variant="onDark" className="mt-1">
                <Link href="/category/accessories">Shop accessories</Link>
              </Button>
            </div>
          </div>
          <div className="relative hidden aspect-[16/9] overflow-hidden rounded-md md:block">
            <Image
              src="/images/tech-futuristic.webp"
              alt=""
              fill
              sizes="(max-width: 768px) 0px, 480px"
              className="object-cover"
            />
          </div>
        </div>
      </div>
    </Container>
  );
}
