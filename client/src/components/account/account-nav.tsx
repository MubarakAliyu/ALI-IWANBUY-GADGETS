"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { HeartIcon, PackageIcon, SettingsIcon } from "lucide-react";
import { cn } from "@/lib/cn";

const LINKS = [
  { href: "/account/settings", label: "Settings", icon: SettingsIcon },
  { href: "/account/orders", label: "My orders", icon: PackageIcon },
  { href: "/account/wishlist", label: "Wishlist", icon: HeartIcon },
];

/** The account navigation (S-12): a sidebar on a desktop, a scrollable row of tabs on a phone. */
export function AccountNav() {
  const pathname = usePathname();

  return (
    <nav aria-label="Account" className="lg:sticky lg:top-24 lg:self-start">
      <ul className="scroll-slim -mx-4 flex gap-1 overflow-x-auto px-4 pb-2 lg:mx-0 lg:grid lg:gap-1 lg:overflow-visible lg:px-0 lg:pb-0">
        {LINKS.map((link) => {
          const active = pathname === link.href || pathname.startsWith(`${link.href}/`);
          return (
            <li key={link.href} className="shrink-0">
              <Link
                href={link.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex items-center gap-2 rounded-md px-3 py-2.5 text-body-sm font-medium whitespace-nowrap transition-colors duration-150 ease-out",
                  active
                    ? "bg-primary-50 text-brand-primary"
                    : "text-brand-navy hover:bg-grey-100 lg:text-text-muted lg:hover:text-brand-navy",
                )}
              >
                <link.icon aria-hidden="true" className="size-4" />
                {link.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
