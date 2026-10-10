"use client";

import type { CategoryNode, PublicSettings } from "@aib/shared";
import Link from "next/link";
import { MenuIcon } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { telHref } from "@/lib/site";
import { useUiStore } from "@/stores/ui";

const QUICK_LINKS = [
  { href: "/shop", label: "Shop all" },
  { href: "/about", label: "About us" },
  { href: "/delivery-and-returns", label: "Delivery & returns" },
  { href: "/warranty", label: "Warranty" },
  { href: "/contact", label: "Contact" },
];

/** The phone navigation drawer (S-1): categories, then the pages people ask about at the counter. */
export function MobileNav({
  categories,
  settings,
}: {
  categories: CategoryNode[];
  settings: PublicSettings | null;
}) {
  const open = useUiStore((state) => state.mobileNavOpen);
  const setOpen = useUiStore((state) => state.setMobileNavOpen);

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Open menu" className="lg:hidden">
          <MenuIcon aria-hidden="true" className="size-5" />
        </Button>
      </SheetTrigger>
      <SheetContent side="left" className="w-[88%] max-w-sm p-0">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Logo variant="mark" width={28} decorative />
            Menu
          </SheetTitle>
        </SheetHeader>

        <nav aria-label="Categories" className="grid gap-5 p-5">
          {categories.map((category) => (
            <div key={category.slug} className="grid gap-2">
              <Link
                href={`/category/${category.slug}`}
                onClick={() => setOpen(false)}
                className="text-body font-semibold text-brand-navy"
              >
                {category.name}
              </Link>
              {category.children.length > 0 ? (
                <ul className="grid gap-2 border-l border-grey-200 pl-4">
                  {category.children.map((child) => (
                    <li key={child.slug}>
                      <Link
                        href={`/category/${child.slug}`}
                        onClick={() => setOpen(false)}
                        className="text-body-sm text-text-muted"
                      >
                        {child.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          ))}
        </nav>

        <nav aria-label="More" className="grid gap-3 border-t border-grey-200 p-5">
          {QUICK_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setOpen(false)}
              className="text-body-sm text-brand-navy"
            >
              {link.label}
            </Link>
          ))}
          {settings ? (
            <a href={telHref(settings.phone)} className="text-body-sm font-semibold text-brand-primary">
              Call {settings.phone}
            </a>
          ) : null}
        </nav>
      </SheetContent>
    </Sheet>
  );
}
