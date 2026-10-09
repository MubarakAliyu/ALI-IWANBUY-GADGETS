import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CONDITION_LABEL, PRODUCT_PAGE_SIZE_MAX } from "@aib/shared";
import { MessageCircleIcon, ShieldCheckIcon, StoreIcon, TruckIcon } from "lucide-react";
import { Container, SectionHeading } from "@/components/shared/container";
import { ProductGallery } from "@/components/store/product-gallery";
import { ProductGrid } from "@/components/store/product-grid";
import { ProductPurchase } from "@/components/store/product-purchase";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { getProduct, getRelatedProducts, listProducts } from "@/lib/catalog";
import { koboToNaira } from "@/lib/money";
import { SITE, whatsappLink } from "@/lib/site";

export const revalidate = 60;

type PageProps = { params: Promise<{ slug: string }> };

/**
 * Prerender every product in the catalogue, so a product page is a static document with its metadata already
 * in the head — which is what a search engine and a link preview read. A slug that is not in this list still
 * renders on demand, and if the API is unreachable at build time the build simply falls back to that.
 */
export async function generateStaticParams(): Promise<{ slug: string }[]> {
  try {
    const products = await listProducts(`limit=${PRODUCT_PAGE_SIZE_MAX}&sort=newest`);
    const pages = Math.min(products.pages, 20);
    const rest = await Promise.all(
      Array.from({ length: Math.max(0, pages - 1) }, (_, index) =>
        listProducts(`limit=${PRODUCT_PAGE_SIZE_MAX}&sort=newest&page=${index + 2}`),
      ),
    );
    return [products, ...rest].flatMap((page) => page.data.map((product) => ({ slug: product.slug })));
  } catch {
    return [];
  }
}

export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProduct(slug);
  if (!product) {
    return { title: "Product not found" };
  }

  return {
    title: product.name,
    description: product.shortDescription || SITE.description,
    alternates: { canonical: `/product/${product.slug}` },
    openGraph: {
      type: "website",
      title: product.name,
      description: product.shortDescription,
      images: product.images[0] ? [{ url: product.images[0].url, alt: product.images[0].alt }] : undefined,
    },
  };
}

/** The product page (S-5). */
export default async function ProductPage({ params }: PageProps) {
  const { slug } = await params;
  const product = await getProduct(slug);
  if (!product) {
    notFound();
  }

  const related = await getRelatedProducts(slug).catch(() => []);
  const inStock = product.totalStock > 0;

  /** Schema.org Product, so the shop can appear properly in a search result (S-5). */
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.shortDescription || product.description,
    sku: product.variants[0]?.sku,
    brand: { "@type": "Brand", name: product.brand.name },
    category: product.category.name,
    image: product.images.map((image) => new URL(image.url, SITE.url).toString()),
    offers: {
      "@type": "AggregateOffer",
      priceCurrency: "NGN",
      lowPrice: koboToNaira(product.priceFromKobo),
      highPrice: koboToNaira(Math.max(...product.variants.map((variant) => variant.priceKobo))),
      offerCount: product.variants.length,
      availability: inStock ? "https://schema.org/InStock" : "https://schema.org/OutOfStock",
      seller: { "@type": "Organization", name: SITE.legalName },
    },
  };

  return (
    <Container className="py-8">
      <script
        type="application/ld+json"
        // The payload is built from our own catalogue, never from user input.
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <nav aria-label="Breadcrumb" className="mb-5">
        <ol className="flex flex-wrap items-center gap-1.5 text-caption text-text-muted">
          <li>
            <Link href="/" className="hover:text-brand-primary">
              Home
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li>
            <Link href={`/category/${product.category.slug}`} className="hover:text-brand-primary">
              {product.category.name}
            </Link>
          </li>
          <li aria-hidden="true">/</li>
          <li aria-current="page" className="text-brand-navy">
            {product.name}
          </li>
        </ol>
      </nav>

      <div className="grid gap-8 lg:grid-cols-2 lg:gap-12">
        <ProductGallery images={product.images} name={product.name} />

        <div className="grid content-start gap-5">
          <div className="grid gap-2">
            <Link
              href={`/shop?brand=${product.brand.slug}`}
              className="text-label text-text-muted uppercase hover:text-brand-primary"
            >
              {product.brand.name}
            </Link>
            <h1 className="text-h1 text-brand-navy">{product.name}</h1>
            {product.shortDescription ? (
              <p className="text-body text-text-muted">{product.shortDescription}</p>
            ) : null}
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline">{CONDITION_LABEL[product.condition]}</Badge>
              {product.warrantyMonths > 0 ? (
                <Badge variant="brand">{product.warrantyMonths}-month warranty</Badge>
              ) : null}
              {product.isNewArrival ? <Badge variant="success">New arrival</Badge> : null}
            </div>
          </div>

          <Separator />

          <ProductPurchase product={product} />

          <Separator />

          <ul className="grid gap-3">
            <li className="flex gap-3 text-body-sm">
              <StoreIcon aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-brand-primary" />
              <span>
                <strong className="font-semibold">Pickup in {SITE.city}</strong> — collect the same day at{" "}
                {SITE.shopAddress}.
              </span>
            </li>
            <li className="flex gap-3 text-body-sm">
              <TruckIcon aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-brand-primary" />
              <span>
                <strong className="font-semibold">Delivery</strong> — within Birnin Kebbi, or nationwide by
                courier. The fee is shown at checkout.
              </span>
            </li>
            <li className="flex gap-3 text-body-sm">
              <ShieldCheckIcon aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-brand-primary" />
              <span>
                <strong className="font-semibold">Warranty</strong> —{" "}
                {product.warrantyMonths > 0
                  ? `${product.warrantyMonths} months from the date on your receipt.`
                  : "covered by our returns policy; see Delivery & returns."}
              </span>
            </li>
          </ul>

          <a
            href={whatsappLink(`Hello ${SITE.name}, I would like to ask about the ${product.name}.`)}
            target="_blank"
            rel="noreferrer noopener"
            className="inline-flex w-fit items-center gap-2 text-body-sm font-semibold text-brand-primary hover:underline"
          >
            <MessageCircleIcon aria-hidden="true" className="size-4" />
            WhatsApp us about this product
          </a>
        </div>
      </div>

      {product.highlights.length > 0 ? (
        <section className="mt-12 grid gap-4">
          <h2 className="text-h2 text-brand-navy">Highlights</h2>
          <ul className="grid gap-2 sm:grid-cols-2">
            {product.highlights.map((highlight) => (
              <li key={highlight} className="flex gap-2 text-body-sm">
                <span aria-hidden="true" className="mt-2 size-1.5 shrink-0 rounded-full bg-brand-primary" />
                {highlight}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {product.description ? (
        <section className="mt-10 grid gap-3">
          <h2 className="text-h2 text-brand-navy">About this product</h2>
          <p className="max-w-prose text-body text-brand-navy">{product.description}</p>
        </section>
      ) : null}

      {product.specs.length > 0 ? (
        <section className="mt-10 grid gap-4">
          <h2 className="text-h2 text-brand-navy">Specifications</h2>
          <div className="overflow-hidden rounded-md border border-grey-200">
            <table className="w-full text-body-sm">
              <caption className="sr-only">Specifications for {product.name}</caption>
              <tbody className="divide-y divide-grey-200">
                {product.specs.map((spec) => (
                  <tr key={spec.label} className="even:bg-grey-50">
                    <th scope="row" className="w-2/5 px-4 py-3 text-left font-medium text-text-muted">
                      {spec.label}
                    </th>
                    <td className="px-4 py-3 text-brand-navy">{spec.value}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      ) : null}

      {related.length > 0 ? (
        <section className="mt-14 grid gap-5">
          <SectionHeading title="You might also like" />
          <ProductGrid products={related.slice(0, 4)} />
        </section>
      ) : null}
    </Container>
  );
}
