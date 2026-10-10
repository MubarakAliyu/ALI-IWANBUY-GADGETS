"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Paging for the admin tables. It says how many rows there are in total, not just how many pages — "34
 * orders" is the answer to the question someone actually has.
 */
export function AdminPagination({ page, pages, total }: { page: number; pages: number; total: number }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  function goTo(next: number) {
    const search = new URLSearchParams(params.toString());
    if (next <= 1) {
      search.delete("page");
    } else {
      search.set("page", String(next));
    }
    router.push(`${pathname}?${search.toString()}`);
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <p aria-live="polite" className="text-body-sm text-text-muted">
        {total.toLocaleString("en-NG")} {total === 1 ? "row" : "rows"}
        {pages > 1 ? ` · page ${page} of ${pages}` : ""}
      </p>

      {pages > 1 ? (
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => goTo(page - 1)}>
            <ChevronLeftIcon aria-hidden="true" className="size-4" />
            Previous
          </Button>
          <Button variant="outline" size="sm" disabled={page >= pages} onClick={() => goTo(page + 1)}>
            Next
            <ChevronRightIcon aria-hidden="true" className="size-4" />
          </Button>
        </div>
      ) : null}
    </div>
  );
}
