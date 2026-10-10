"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { PanelLeftCloseIcon, PanelLeftOpenIcon } from "lucide-react";
import { Logo } from "@/components/brand/logo";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/cn";
import { isActive, type NavGroup } from "./admin-nav";

/**
 * The navy sidebar (A-2): 260px, collapsing to a 72px rail of icons. Collapsed, each item keeps its label in
 * a tooltip, so the rail stays usable rather than becoming a row of guesses.
 */
export function AdminSidebar({
  groups,
  collapsed,
  onToggle,
  onNavigate,
  className,
}: {
  groups: NavGroup[];
  collapsed: boolean;
  onToggle?: () => void;
  /** Called when an item is clicked — the mobile drawer uses it to close itself. */
  onNavigate?: () => void;
  className?: string;
}) {
  const pathname = usePathname();

  return (
    <nav
      data-surface="dark"
      aria-label="Dashboard"
      className={cn(
        "flex h-full flex-col gap-6 bg-brand-navy py-5 transition-[width] duration-200",
        collapsed ? "w-[72px] px-3" : "w-[260px] px-4",
        className,
      )}
    >
      <div className={cn("flex items-center", collapsed ? "justify-center" : "justify-between gap-2")}>
        <Link href="/admin" aria-label="Dashboard home" onClick={onNavigate}>
          {collapsed ? (
            <Logo variant="markWhite" width={32} />
          ) : (
            <Logo variant="horizontalWhite" width={152} />
          )}
        </Link>

        {onToggle ? (
          <button
            type="button"
            onClick={onToggle}
            aria-label={collapsed ? "Expand the menu" : "Collapse the menu"}
            className={cn(
              "inline-flex size-8 items-center justify-center rounded-sm text-on-dark-muted",
              "hover:bg-white/10 hover:text-on-dark focus-visible:ring-2 focus-visible:ring-white/60 focus-visible:outline-none",
              collapsed && "hidden",
            )}
          >
            <PanelLeftCloseIcon aria-hidden="true" className="size-4" />
          </button>
        ) : null}
      </div>

      {collapsed && onToggle ? (
        <button
          type="button"
          onClick={onToggle}
          aria-label="Expand the menu"
          className="mx-auto inline-flex size-8 items-center justify-center rounded-sm text-on-dark-muted hover:bg-white/10 hover:text-on-dark focus-visible:ring-2 focus-visible:ring-white/60 focus-visible:outline-none"
        >
          <PanelLeftOpenIcon aria-hidden="true" className="size-4" />
        </button>
      ) : null}

      <div className="flex-1 overflow-y-auto">
        {groups.map((group) => (
          <div key={group.heading} className="mb-5 grid gap-1">
            {collapsed ? (
              <span className="sr-only">{group.heading}</span>
            ) : (
              <p className="px-3 pb-1 text-caption font-semibold tracking-wide text-on-dark-muted uppercase">
                {group.heading}
              </p>
            )}

            {group.items.map((item) => {
              const active = isActive(item, pathname);
              const link = (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onNavigate}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "relative flex items-center gap-3 rounded-md py-2.5 text-body-sm transition-colors",
                    collapsed ? "justify-center px-0" : "px-3",
                    active
                      ? "bg-white/10 font-semibold text-on-dark"
                      : "text-on-dark-muted hover:bg-white/5 hover:text-on-dark",
                    "focus-visible:ring-2 focus-visible:ring-white/60 focus-visible:outline-none",
                  )}
                >
                  {/* The active marker is the primary blue bar on the left edge (overview §4.3). */}
                  {active ? (
                    <span
                      aria-hidden="true"
                      className="absolute top-1.5 bottom-1.5 -left-1 w-1 rounded-full bg-brand-primary"
                    />
                  ) : null}
                  <item.icon aria-hidden="true" className="size-[18px] shrink-0" />
                  {collapsed ? null : <span className="truncate">{item.label}</span>}
                </Link>
              );

              return collapsed ? (
                <Tooltip key={item.href}>
                  <TooltipTrigger asChild>{link}</TooltipTrigger>
                  <TooltipContent side="right">{item.label}</TooltipContent>
                </Tooltip>
              ) : (
                link
              );
            })}
          </div>
        ))}
      </div>

      <Link
        href="/"
        onClick={onNavigate}
        className={cn(
          "rounded-md py-2 text-caption text-on-dark-muted hover:text-on-dark focus-visible:ring-2 focus-visible:ring-white/60 focus-visible:outline-none",
          collapsed ? "text-center" : "px-3",
        )}
      >
        {collapsed ? "↗" : "View the shop ↗"}
      </Link>
    </nav>
  );
}
