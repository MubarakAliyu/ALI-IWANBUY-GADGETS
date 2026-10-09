import type { CategoryNode } from "@aib/shared";
import { CartHydrator } from "@/components/store/cart-hydrator";
import { SiteFooter } from "@/components/store/site-footer";
import { SiteHeader } from "@/components/store/site-header";
import { getCategories } from "@/lib/catalog";

/**
 * The chrome every storefront page shares. The category tree is fetched once here and handed to both the
 * header and the footer, so one request serves the whole navigation.
 *
 * If the API cannot be reached the chrome still renders with an empty menu: a customer should see the shop's
 * name and phone number even when the catalogue is unavailable, not a stack trace.
 */
async function getCategoriesOrEmpty(): Promise<CategoryNode[]> {
  try {
    return await getCategories();
  } catch {
    return [];
  }
}

export default async function StoreLayout({ children }: { children: React.ReactNode }) {
  const categories = await getCategoriesOrEmpty();

  return (
    <div className="flex min-h-dvh flex-col">
      <a
        href="#main"
        className="sr-only focus-visible:not-sr-only focus-visible:absolute focus-visible:top-2 focus-visible:left-2 focus-visible:z-50 focus-visible:rounded-md focus-visible:bg-white focus-visible:px-4 focus-visible:py-2 focus-visible:text-body-sm focus-visible:font-semibold focus-visible:shadow-md"
      >
        Skip to content
      </a>

      <CartHydrator />
      <SiteHeader categories={categories} />
      <main id="main" className="flex-1">
        {children}
      </main>
      <SiteFooter categories={categories} />
    </div>
  );
}
