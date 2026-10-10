"use client";

import { useState } from "react";
import type { Permission } from "@aib/shared";
import { useRouter } from "next/navigation";
import { SearchIcon } from "lucide-react";
import { Input } from "@/components/ui/input";

/** `AIB-ORD-202610-0001` — what the shop reads off a customer's phone. */
const ORDER_NUMBER = /^AIB-ORD-\d{6}-\d{4}$/i;
const INVOICE_NUMBER = /^AIB-INV-\d{6}-\d{4}$/i;

/**
 * One search box for the whole dashboard (A-2). It does not guess: an order number opens that order, an
 * invoice number opens the invoices list filtered to it, something with an `@` in it looks in customers, and
 * anything else goes to products — which is what someone at the counter is usually holding.
 */
export function AdminSearch({ permissions }: { permissions: Set<Permission> }) {
  const router = useRouter();
  const [term, setTerm] = useState("");

  function destinationFor(raw: string): string | null {
    const value = raw.trim();
    if (!value) {
      return null;
    }

    if (ORDER_NUMBER.test(value) && permissions.has("orders.view")) {
      return `/admin/orders/${value.toUpperCase()}`;
    }
    if (INVOICE_NUMBER.test(value) && permissions.has("invoices.manage")) {
      return `/admin/invoices?q=${encodeURIComponent(value)}`;
    }
    if (value.includes("@") && permissions.has("customers.view")) {
      return `/admin/customers?q=${encodeURIComponent(value)}`;
    }
    if (permissions.has("products.view")) {
      return `/admin/products?q=${encodeURIComponent(value)}`;
    }
    if (permissions.has("orders.view")) {
      return `/admin/orders?q=${encodeURIComponent(value)}`;
    }
    return null;
  }

  return (
    <form
      role="search"
      className="relative mr-auto w-full max-w-sm"
      onSubmit={(event) => {
        event.preventDefault();
        const destination = destinationFor(term);
        if (destination) {
          router.push(destination);
          setTerm("");
        }
      }}
    >
      <SearchIcon
        aria-hidden="true"
        className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-text-muted"
      />
      <Input
        type="search"
        value={term}
        onChange={(event) => setTerm(event.target.value)}
        aria-label="Search orders, customers and products"
        placeholder="Order number, email or product…"
        className="pl-9"
      />
    </form>
  );
}
