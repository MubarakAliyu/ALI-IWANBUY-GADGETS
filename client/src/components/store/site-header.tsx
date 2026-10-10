import type { CategoryNode, PublicSettings } from "@aib/shared";
import Link from "next/link";
import { PhoneIcon } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { Container } from "@/components/shared/container";
import { CategoryMenu } from "@/components/store/category-menu";
import { AccountMenu, CartButton, WishlistButton } from "@/components/store/header-actions";
import { MiniCartMount } from "@/components/store/mini-cart-mount";
import { MobileNav } from "@/components/store/mobile-nav";
import { SearchBox } from "@/components/store/search-box";
import { announcement, SITE } from "@/lib/site";

/**
 * The storefront header (S-1): a navy announcement bar, then a white bar with the logo, the category menu,
 * search, and the wishlist, cart and account controls. Below `lg` the categories move into a drawer and the
 * search box takes a row of its own, because that is the row a customer on a phone actually uses.
 */
export function SiteHeader({
  categories,
  settings,
}: {
  categories: CategoryNode[];
  settings: PublicSettings | null;
}) {
  return (
    <>
      <div data-surface="dark" className="bg-brand-navy text-on-dark">
        <Container className="flex min-h-9 items-center justify-center gap-2 py-1.5 text-center">
          <PhoneIcon aria-hidden="true" className="hidden size-3.5 shrink-0 text-on-dark-accent sm:block" />
          <p className="text-caption">
            {settings ? announcement(settings.phone) : `Pickup in ${SITE.city} · Nationwide delivery`}
          </p>
        </Container>
      </div>

      <header className="sticky top-0 z-40 border-b border-grey-200 bg-white">
        <Container>
          <div className="flex h-16 items-center gap-2">
            <MobileNav categories={categories} settings={settings} />

            <Link href="/" aria-label={`${SITE.name} home`} className="flex shrink-0 items-center">
              <Logo variant="primary" width={104} priority className="hidden sm:block" />
              <Logo variant="mark" width={38} priority className="sm:hidden" />
            </Link>

            <nav aria-label="Main" className="ml-2 hidden items-center gap-1 lg:flex">
              <CategoryMenu categories={categories} />
              <Link
                href="/shop"
                className="rounded-md px-3 py-2 text-body-sm font-medium text-brand-navy hover:bg-grey-100"
              >
                Shop all
              </Link>
              <Link
                href="/shop?sort=newest"
                className="rounded-md px-3 py-2 text-body-sm font-medium text-brand-navy hover:bg-grey-100"
              >
                New arrivals
              </Link>
            </nav>

            <SearchBox className="mx-auto hidden w-full max-w-xl lg:block" />

            <div className="ml-auto flex items-center gap-0.5 lg:ml-0">
              <WishlistButton />
              <CartButton />
              <AccountMenu />
            </div>
          </div>

          <div className="pb-3 lg:hidden">
            <SearchBox />
          </div>
        </Container>
      </header>

      <MiniCartMount />
    </>
  );
}
