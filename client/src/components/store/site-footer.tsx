import type { CategoryNode } from "@aib/shared";
import Link from "next/link";
import { MailIcon, MapPinIcon, MessageCircleIcon, PhoneIcon } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { Container } from "@/components/shared/container";
import { SITE, whatsappLink } from "@/lib/site";

const SHOP_LINKS = [
  { href: "/shop", label: "Shop all" },
  { href: "/shop?sort=price-asc", label: "Lowest price first" },
  { href: "/shop?inStock=true", label: "In stock now" },
  { href: "/search", label: "Search" },
];

const HELP_LINKS = [
  { href: "/about", label: "About us" },
  { href: "/contact", label: "Contact" },
  { href: "/delivery-and-returns", label: "Delivery & returns" },
  { href: "/warranty", label: "Warranty" },
  { href: "/privacy", label: "Privacy" },
  { href: "/terms", label: "Terms" },
];

/** The navy footer (S-1): who we are, what to browse, how to get help, and how to reach the shop. */
export function SiteFooter({ categories }: { categories: CategoryNode[] }) {
  return (
    <footer data-surface="dark" className="mt-16 bg-brand-navy text-on-dark">
      <Container className="grid gap-10 py-12 md:grid-cols-2 lg:grid-cols-4">
        <div className="grid content-start gap-4">
          <Logo variant="horizontalWhite" width={180} />
          <p className="max-w-xs text-body-sm text-on-dark-muted">
            Phones, tablets, laptops and gadgets in {SITE.city}. Genuine devices, honest prices, warranty on
            every sale.
          </p>
          <p className="text-label text-on-dark-accent uppercase">{SITE.tagline}</p>
        </div>

        <nav aria-labelledby="footer-categories" className="grid content-start gap-3">
          <h2 id="footer-categories" className="text-label text-on-dark-accent uppercase">
            Categories
          </h2>
          <ul className="grid gap-2">
            {categories.slice(0, 6).map((category) => (
              <li key={category.slug}>
                <Link
                  href={`/category/${category.slug}`}
                  className="text-body-sm text-on-dark-muted hover:text-white"
                >
                  {category.name}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <nav aria-labelledby="footer-shop" className="grid content-start gap-3">
          <h2 id="footer-shop" className="text-label text-on-dark-accent uppercase">
            Shop
          </h2>
          <ul className="grid gap-2">
            {SHOP_LINKS.map((link) => (
              <li key={link.href}>
                <Link href={link.href} className="text-body-sm text-on-dark-muted hover:text-white">
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
          <h2 className="mt-3 text-label text-on-dark-accent uppercase">Help</h2>
          <ul className="grid gap-2">
            {HELP_LINKS.map((link) => (
              <li key={link.href}>
                <Link href={link.href} className="text-body-sm text-on-dark-muted hover:text-white">
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        <div className="grid content-start gap-3">
          <h2 className="text-label text-on-dark-accent uppercase">Visit or call</h2>
          <p className="flex items-start gap-2 text-body-sm text-on-dark-muted">
            <MapPinIcon aria-hidden="true" className="mt-0.5 size-4 shrink-0" />
            <span>{SITE.shopAddress}</span>
          </p>
          <a
            href={SITE.phoneHref}
            className="flex items-center gap-2 text-body-sm text-on-dark-muted hover:text-white"
          >
            <PhoneIcon aria-hidden="true" className="size-4 shrink-0" />
            {SITE.phone}
          </a>
          <a
            href={whatsappLink(`Hello ${SITE.name}, I have a question.`)}
            target="_blank"
            rel="noreferrer noopener"
            className="flex items-center gap-2 text-body-sm text-on-dark-muted hover:text-white"
          >
            <MessageCircleIcon aria-hidden="true" className="size-4 shrink-0" />
            WhatsApp us
          </a>
          <a
            href={`mailto:${SITE.email}`}
            className="flex items-center gap-2 text-body-sm text-on-dark-muted hover:text-white"
          >
            <MailIcon aria-hidden="true" className="size-4 shrink-0" />
            {SITE.email}
          </a>
        </div>
      </Container>

      <div className="border-t border-navy-700">
        <Container className="flex flex-col gap-1 py-6 text-caption text-on-dark-muted sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {new Date().getFullYear()} {SITE.legalName} · RC {SITE.rcNumber}
          </p>
          <p>
            {SITE.registeredAddress} · TIN {SITE.tin}
          </p>
        </Container>
      </div>
    </footer>
  );
}
