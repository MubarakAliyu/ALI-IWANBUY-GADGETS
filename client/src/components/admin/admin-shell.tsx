"use client";

import { useState } from "react";
import type { AdminSession, Permission } from "@aib/shared";
import { ADMIN_ROLE_LABEL } from "@aib/shared";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { BellIcon, LogOutIcon, MenuIcon, UserCogIcon } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { adminLogout, listAwaitingPayments } from "@/lib/admin";
import { navFor } from "./admin-nav";
import { AdminSidebar } from "./admin-sidebar";
import { AdminSearch } from "./admin-search";
import { useRailState } from "./use-rail-state";

/**
 * The dashboard shell (A-2): navy sidebar, white top bar, everything else inside.
 *
 * The collapse state lives in `localStorage` and is read through `useRailState`, which treats it as the
 * external store it is — the server cannot know what this browser chose, so it renders the expanded sidebar
 * and React swaps in the remembered rail on hydration.
 */
export function AdminShell({ session, children }: { session: AdminSession; children: React.ReactNode }) {
  const router = useRouter();
  const [collapsed, toggle] = useRailState();
  const [drawerOpen, setDrawerOpen] = useState(false);

  const permissions = new Set(session.permissions as Permission[]);
  const groups = navFor(permissions);
  const admin = session.admin;

  // The orders waiting on someone to confirm a transfer. Polled, because money arriving is not something the
  // shop should have to refresh for.
  const awaiting = useQuery({
    queryKey: ["admin", "awaiting"],
    queryFn: listAwaitingPayments,
    enabled: permissions.has("payments.view"),
    refetchInterval: 60_000,
    staleTime: 30_000,
  });
  const awaitingCount = awaiting.data?.data.length ?? 0;

  async function signOut() {
    await adminLogout();
    window.location.assign("/admin/login");
  }

  return (
    <div className="flex min-h-dvh bg-grey-50">
      <aside className="sticky top-0 hidden h-dvh shrink-0 lg:block">
        <AdminSidebar groups={groups} collapsed={collapsed} onToggle={toggle} />
      </aside>

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-grey-200 bg-white px-4 sm:px-6">
          <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
            <SheetTrigger asChild>
              <button
                type="button"
                aria-label="Open the menu"
                className="inline-flex size-10 items-center justify-center rounded-md text-brand-navy hover:bg-grey-100 focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:outline-none lg:hidden"
              >
                <MenuIcon aria-hidden="true" className="size-5" />
              </button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[260px] border-0 bg-brand-navy p-0" showCloseButton={false}>
              <AdminSidebar
                groups={groups}
                collapsed={false}
                onNavigate={() => setDrawerOpen(false)}
                className="h-full w-full"
              />
            </SheetContent>
          </Sheet>

          <AdminSearch permissions={permissions} />

          {permissions.has("payments.view") ? (
            <Link
              href="/admin/payments"
              className="relative inline-flex size-10 items-center justify-center rounded-md text-brand-navy hover:bg-grey-100 focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:outline-none"
              aria-label={
                awaitingCount === 0
                  ? "No payments waiting to be confirmed"
                  : `${awaitingCount} payment${awaitingCount === 1 ? "" : "s"} waiting to be confirmed`
              }
            >
              <BellIcon aria-hidden="true" className="size-5" />
              {awaitingCount > 0 ? (
                <span
                  aria-hidden="true"
                  className="absolute top-1 right-1 inline-flex min-w-[18px] items-center justify-center rounded-full bg-brand-primary px-1 text-[11px] leading-[18px] font-semibold text-white"
                >
                  {awaitingCount > 9 ? "9+" : awaitingCount}
                </span>
              ) : null}
            </Link>
          ) : null}

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="flex items-center gap-2 rounded-md py-1.5 pr-2 pl-1.5 text-left hover:bg-grey-100 focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:outline-none"
              >
                <span
                  aria-hidden="true"
                  className="inline-flex size-8 items-center justify-center rounded-full bg-brand-navy text-caption font-semibold text-white"
                >
                  {initials(admin?.firstName, admin?.lastName)}
                </span>
                <span className="hidden sm:grid">
                  <span className="text-body-sm font-semibold text-brand-navy">
                    {admin?.firstName} {admin?.lastName}
                  </span>
                  <span className="text-caption text-text-muted">
                    {admin ? ADMIN_ROLE_LABEL[admin.role] : ""}
                  </span>
                </span>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>{admin?.email}</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => router.push("/admin/account")}>
                <UserCogIcon aria-hidden="true" className="size-4" />
                Account settings
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onSelect={() => void signOut()}>
                <LogOutIcon aria-hidden="true" className="size-4" />
                Sign out
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>

        <main id="main" className="min-w-0 flex-1 p-4 sm:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}

function initials(first?: string, last?: string): string {
  return `${first?.[0] ?? ""}${last?.[0] ?? ""}`.toUpperCase() || "AB";
}
