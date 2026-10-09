import Link from "next/link";
import { PackageSearchIcon } from "lucide-react";
import { Container } from "@/components/shared/container";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { Pagination } from "@/components/ui/pagination";
import { getBrands, getCategories, listProducts } from "@/lib/catalog";
import { buildFilterHref, toApiQuery, withFilter, type ShopFilters } from "@/lib/filters";
import { FilterPanel } from "./filter-panel";
import { ProductGrid } from "./product-grid";
import { ShopToolbar } from "./shop-toolbar";

type CatalogueViewProps = {
  filters: ShopFilters;
  /** The path these filters belong to: `/shop`, `/category/phones` or `/search`. */
  pathname: string;
  /** On a category page the category is fixed by the path and is not offered as a filter. */
  lockedCategory?: string;
  heading: string;
  description?: string;
  /** Breadcrumb trail, innermost last. */
  breadcrumbs?: { href: string; label: string }[];
};

/**
 * The listing shared by the shop, every category page and search (S-3, S-4): filters on the left from `lg`,
 * a toolbar with the count and sort above the grid, and pagination below. Everything it renders comes from
 * the URL, so the page is fully server-rendered and a shared link reproduces the view exactly.
 */
export async function CatalogueView({
  filters,
  pathname,
  lockedCategory,
  heading,
  description,
  breadcrumbs,
}: CatalogueViewProps) {
  const [products, brands, categories] = await Promise.all([
    listProducts(toApiQuery(filters, lockedCategory ? { category: lockedCategory } : {})),
    getBrands(),
    getCategories(),
  ]);

  return (
    <Container className="py-8">
      {breadcrumbs && breadcrumbs.length > 0 ? (
        <nav aria-label="Breadcrumb" className="mb-4">
          <ol className="flex flex-wrap items-center gap-1.5 text-caption text-text-muted">
            {breadcrumbs.map((crumb, index) => (
              <li key={crumb.href} className="flex items-center gap-1.5">
                {index > 0 ? <span aria-hidden="true">/</span> : null}
                {index === breadcrumbs.length - 1 ? (
                  <span aria-current="page" className="text-brand-navy">
                    {crumb.label}
                  </span>
                ) : (
                  <Link href={crumb.href} className="hover:text-brand-primary">
                    {crumb.label}
                  </Link>
                )}
              </li>
            ))}
          </ol>
        </nav>
      ) : null}

      <div className="mb-6 grid gap-1">
        <h1 className="text-h1 text-brand-navy">{heading}</h1>
        {description ? <p className="text-body-sm text-text-muted">{description}</p> : null}
      </div>

      <div className="grid gap-8 lg:grid-cols-[260px_1fr]">
        <aside aria-label="Filters" className="hidden lg:block">
          <div className="sticky top-24">
            <FilterPanel
              filters={filters}
              brands={brands}
              categories={categories}
              pathname={pathname}
              {...(lockedCategory ? { lockedCategory } : {})}
            />
          </div>
        </aside>

        <div className="grid content-start gap-6">
          <ShopToolbar
            filters={filters}
            brands={brands}
            categories={categories}
            pathname={pathname}
            {...(lockedCategory ? { lockedCategory } : {})}
            total={products.total}
          />

          {products.data.length === 0 ? (
            <EmptyState
              icon={<PackageSearchIcon />}
              title="Nothing matches those filters"
              description="Try widening the price range, or clear the filters and start again."
              action={
                <Button asChild variant="outline">
                  <Link href={lockedCategory ? pathname : "/shop"}>Clear filters</Link>
                </Button>
              }
            />
          ) : (
            <>
              <ProductGrid products={products.data} priorityCount={4} />
              <Pagination
                page={products.page}
                pages={products.pages}
                hrefFor={(page) => buildFilterHref(pathname, withFilter(filters, { page }))}
                className="pt-2"
              />
            </>
          )}
        </div>
      </div>
    </Container>
  );
}
