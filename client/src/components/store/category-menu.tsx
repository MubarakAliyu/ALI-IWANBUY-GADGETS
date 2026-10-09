"use client";

import type { CategoryNode } from "@aib/shared";
import Link from "next/link";
import { ChevronDownIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

/**
 * The desktop category menu (S-1): one trigger, every category and sub-category in a single panel, so a
 * customer sees the whole shop at once instead of hunting through nested menus.
 */
export function CategoryMenu({ categories }: { categories: CategoryNode[] }) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="gap-1.5 px-3">
          All categories
          <ChevronDownIcon aria-hidden="true" className="size-4" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-[min(90vw,44rem)] p-4">
        <div className="grid grid-cols-2 gap-x-6 gap-y-5 md:grid-cols-3">
          {categories.map((category) => (
            <div key={category.slug} className="grid gap-1.5">
              <Link
                href={`/category/${category.slug}`}
                className="text-body-sm font-semibold text-brand-navy hover:text-brand-primary"
              >
                {category.name}
                <span className="ml-1.5 text-caption font-normal numeric text-text-muted">
                  {category.productCount ?? 0}
                </span>
              </Link>
              {category.children.length > 0 ? (
                <ul className="grid gap-1">
                  {category.children.map((child) => (
                    <li key={child.slug}>
                      <Link
                        href={`/category/${child.slug}`}
                        className="text-body-sm text-text-muted hover:text-brand-primary"
                      >
                        {child.name}
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          ))}
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
