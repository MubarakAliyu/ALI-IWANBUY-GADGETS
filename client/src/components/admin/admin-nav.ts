import type { Permission } from "@aib/shared";
import {
  BanknoteIcon,
  BoxesIcon,
  FileTextIcon,
  LayoutDashboardIcon,
  ScrollTextIcon,
  SettingsIcon,
  ShoppingBagIcon,
  TagsIcon,
  UsersIcon,
  UserCogIcon,
  type LucideIcon,
} from "lucide-react";

/**
 * The dashboard's navigation, and the permission each item needs (overview §3.2, §10).
 *
 * An item the role cannot use is not rendered — but that is tidiness, not security: every one of these pages
 * calls an endpoint that checks the same permission server-side. Removing an item here would hide a page, not
 * protect it.
 */
export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
  permission: Permission;
  /** Marked active for any path beneath it, not just an exact match. */
  section?: boolean;
};

export type NavGroup = {
  heading: string;
  items: NavItem[];
};

export const ADMIN_NAV: NavGroup[] = [
  {
    heading: "Overview",
    items: [
      {
        href: "/admin",
        label: "Dashboard",
        icon: LayoutDashboardIcon,
        permission: "dashboard.operational",
      },
    ],
  },
  {
    heading: "Selling",
    items: [
      {
        href: "/admin/orders",
        label: "Orders",
        icon: ShoppingBagIcon,
        permission: "orders.view",
        section: true,
      },
      { href: "/admin/payments", label: "Payments", icon: BanknoteIcon, permission: "payments.view" },
      { href: "/admin/invoices", label: "Invoices", icon: FileTextIcon, permission: "invoices.manage" },
    ],
  },
  {
    heading: "Catalogue",
    items: [
      {
        href: "/admin/products",
        label: "Products",
        icon: BoxesIcon,
        permission: "products.view",
        section: true,
      },
      {
        href: "/admin/categories",
        label: "Categories & brands",
        icon: TagsIcon,
        permission: "catalogue.manage",
      },
    ],
  },
  {
    heading: "People",
    items: [
      {
        href: "/admin/customers",
        label: "Customers",
        icon: UsersIcon,
        permission: "customers.view",
        section: true,
      },
      { href: "/admin/admins", label: "Admin users", icon: UserCogIcon, permission: "admins.manage" },
    ],
  },
  {
    heading: "Shop",
    items: [
      { href: "/admin/settings", label: "Store settings", icon: SettingsIcon, permission: "settings.manage" },
      { href: "/admin/audit", label: "Audit trail", icon: ScrollTextIcon, permission: "audit.view" },
    ],
  },
];

/** The groups this role can see, with empty groups dropped. */
export function navFor(permissions: Set<Permission>): NavGroup[] {
  return ADMIN_NAV.map((group) => ({
    ...group,
    items: group.items.filter((item) => permissions.has(item.permission)),
  })).filter((group) => group.items.length > 0);
}

/** Whether a nav item is the one the current path belongs to. */
export function isActive(item: NavItem, pathname: string): boolean {
  if (item.href === "/admin") {
    return pathname === "/admin";
  }
  return item.section ? pathname.startsWith(item.href) : pathname === item.href;
}
