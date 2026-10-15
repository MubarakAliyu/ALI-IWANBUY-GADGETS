"use client";

import { useState } from "react";
import type { AuditRow } from "@aib/shared";
import Link from "next/link";
import { ChevronDownIcon, ChevronRightIcon, ScrollTextIcon } from "lucide-react";
import { AdminFilterBar } from "@/components/admin/admin-filter-bar";
import { AdminPagination } from "@/components/admin/admin-pagination";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { formatDate, formatDateTime } from "@/lib/date";
import type { Paginated } from "@/lib/admin";

/**
 * The audit trail (A-13).
 *
 * Rendered as a list of expandable rows rather than a grid, because a diff does not fit in a table cell and
 * flattening it would lose the thing that makes the trail worth keeping: exactly what changed, from what to
 * what. Values that were redacted on the way in stay redacted here — this page cannot reveal them because
 * they were never written.
 */
export function AuditTable({
  result,
  actions,
  entityTypes,
  exportHref,
}: {
  result: Paginated<AuditRow>;
  actions: string[];
  entityTypes: string[];
  exportHref: string;
}) {
  return (
    <div className="grid gap-4">
      <AdminFilterBar
        searchLabel="Search the trail"
        searchPlaceholder="What happened, or who did it…"
        exportHref={exportHref}
        dateFilter
        selects={[
          {
            name: "action",
            label: "Action",
            options: actions.map((action) => ({ value: action, label: humanise(action) })),
          },
          {
            name: "entityType",
            label: "Thing",
            options: entityTypes.map((type) => ({ value: type, label: type })),
          },
          {
            name: "actorType",
            label: "Who",
            options: [
              { value: "ADMIN", label: "An admin" },
              { value: "CUSTOMER", label: "A customer" },
              { value: "SYSTEM", label: "The system" },
            ],
          },
        ]}
      />

      {result.data.length === 0 ? (
        <div className="rounded-lg border border-grey-200 bg-white">
          <EmptyState
            icon={<ScrollTextIcon aria-hidden="true" />}
            title="Nothing matches that"
            description="Try a wider date range, or clear the filters."
          />
        </div>
      ) : (
        <ul className="divide-y divide-grey-200 rounded-lg border border-grey-200 bg-white">
          {result.data.map((row) => (
            <AuditEntry key={row.id} row={row} />
          ))}
        </ul>
      )}

      <AdminPagination page={result.page} pages={result.pages} total={result.total} />
    </div>
  );
}

function AuditEntry({ row }: { row: AuditRow }) {
  const [open, setOpen] = useState(false);
  const hasDiff = Boolean(row.diff?.before || row.diff?.after);

  const keys = [...new Set([...Object.keys(row.diff?.before ?? {}), ...Object.keys(row.diff?.after ?? {})])];

  return (
    <li className="grid">
      <div className="flex flex-wrap items-start gap-3 p-3">
        <button
          type="button"
          onClick={() => setOpen((value) => !value)}
          disabled={!hasDiff}
          aria-expanded={hasDiff ? open : undefined}
          className="mt-0.5 inline-flex size-6 shrink-0 items-center justify-center rounded-sm text-text-muted hover:bg-grey-100 focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:outline-none disabled:opacity-30"
        >
          {open ? (
            <ChevronDownIcon aria-hidden="true" className="size-4" />
          ) : (
            <ChevronRightIcon aria-hidden="true" className="size-4" />
          )}
          <span className="sr-only">{hasDiff ? "Show what changed" : "Nothing more to show"}</span>
        </button>

        <div className="grid min-w-0 flex-1 gap-1">
          <p className="text-body-sm text-brand-navy">{row.summary || humanise(row.action)}</p>
          <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-caption text-text-muted">
            <span>{formatDateTime(row.at)}</span>
            <span aria-hidden="true">·</span>
            <span>{row.actorName || row.actorType.toLowerCase()}</span>
            {row.entityId && row.entityType === "Order" ? (
              <>
                <span aria-hidden="true">·</span>
                <Link href={`/admin/orders`} className="text-brand-primary hover:underline">
                  {row.entityType}
                </Link>
              </>
            ) : row.entityType ? (
              <>
                <span aria-hidden="true">·</span>
                <span>{row.entityType}</span>
              </>
            ) : null}
            {row.ip ? (
              <>
                <span aria-hidden="true">·</span>
                <span>{row.ip}</span>
              </>
            ) : null}
          </p>
        </div>

        <Badge variant={badgeFor(row.action)}>{humanise(row.action)}</Badge>
      </div>

      {open && hasDiff ? (
        <div className="border-t border-grey-200 bg-grey-50 px-3 py-3 pl-12">
          <table className="w-full text-left text-caption">
            <thead>
              <tr className="text-text-muted">
                <th scope="col" className="py-1 pr-4 font-semibold">
                  Field
                </th>
                <th scope="col" className="py-1 pr-4 font-semibold">
                  Before
                </th>
                <th scope="col" className="py-1 font-semibold">
                  After
                </th>
              </tr>
            </thead>
            <tbody className="align-top">
              {keys.map((key) => (
                <tr key={key} className="border-t border-grey-200">
                  <th scope="row" className="font-mono py-1.5 pr-4 font-normal text-brand-navy">
                    {key}
                  </th>
                  <td className="font-mono py-1.5 pr-4 text-text-muted line-through decoration-grey-300">
                    {show((row.diff?.before ?? {})[key])}
                  </td>
                  <td className="font-mono py-1.5 text-brand-navy">{show((row.diff?.after ?? {})[key])}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : null}
    </li>
  );
}

/** `PAYMENT_CONFIRMED` → `Payment confirmed`. */
function humanise(action: string): string {
  const words = action.toLowerCase().replace(/_/g, " ");
  return words.charAt(0).toUpperCase() + words.slice(1);
}

function badgeFor(action: string): "paid" | "cancelled" | "awaiting" | "pending" {
  if (/DENIED|FAILED|LOCKED|REJECTED|SUSPENDED/.test(action)) {
    return "cancelled";
  }
  if (/CANCELLED|REFUNDED|VOIDED|DELETED/.test(action)) {
    return "awaiting";
  }
  if (/CONFIRMED|CREATED|PAID/.test(action)) {
    return "paid";
  }
  return "pending";
}

function show(value: unknown): string {
  if (value === undefined) {
    return "—";
  }
  if (value === null) {
    return "nothing";
  }
  if (typeof value === "string") {
    // An ISO timestamp in a diff reads better as a date.
    return /^\d{4}-\d{2}-\d{2}T/.test(value) ? formatDate(value) : value;
  }
  if (typeof value === "object") {
    return JSON.stringify(value);
  }
  return String(value);
}
