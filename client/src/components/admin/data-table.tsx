"use client";

import { flexRender, getCoreRowModel, useReactTable, type ColumnDef } from "@tanstack/react-table";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { ArrowDownIcon, ArrowUpIcon, ChevronsUpDownIcon } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/cn";
import { AdminPagination } from "./admin-pagination";

/**
 * The table every admin list uses (A-2).
 *
 * The rows come from the server already filtered, sorted and paged — the URL is the state, so a filtered
 * table is a link someone can send, and the back button walks back through what was actually looked at.
 * TanStack Table is used for column definition and rendering only; sorting a column rewrites the URL rather
 * than reordering an array in the browser, because the browser only ever holds one page of the answer.
 */
export type DataTableColumn<T> = ColumnDef<T> & {
  /** The `sort` value this column sends. Omit for a column that cannot be sorted. */
  sortKey?: string;
  /** Right-aligned, for money and counts. */
  numeric?: boolean;
};

export function DataTable<T>({
  columns,
  rows,
  total,
  page,
  pages,
  loading = false,
  empty,
  rowKey,
  caption,
}: {
  columns: DataTableColumn<T>[];
  rows: T[];
  total: number;
  page: number;
  pages: number;
  loading?: boolean;
  empty: React.ReactNode;
  rowKey: (row: T) => string;
  caption: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const sort = params.get("sort");
  const dir = params.get("dir") === "asc" ? "asc" : "desc";

  /**
   * React Compiler cannot memoize what `useReactTable` returns, so it skips memoizing this component. That
   * is fine here and the warning is suppressed deliberately: the rows arrive from the server already
   * filtered, sorted and paged, so this never renders more than one page of them, and every re-render is a
   * navigation that was going to repaint the table anyway.
   */
  // eslint-disable-next-line react-hooks/incompatible-library
  const table = useReactTable({
    data: rows,
    columns,
    getCoreRowModel: getCoreRowModel(),
    manualSorting: true,
    manualPagination: true,
    manualFiltering: true,
  });

  /** Clicking a sorted column flips its direction; clicking a new one starts at descending. */
  function toggleSort(key: string) {
    const search = new URLSearchParams(params.toString());
    search.set("sort", key);
    search.set("dir", sort === key && dir === "desc" ? "asc" : "desc");
    search.delete("page");
    router.push(`${pathname}?${search.toString()}`);
  }

  if (!loading && rows.length === 0) {
    return <div className="rounded-lg border border-grey-200 bg-white">{empty}</div>;
  }

  return (
    <div className="grid gap-4">
      <div className="overflow-x-auto rounded-lg border border-grey-200 bg-white">
        <table className="w-full min-w-[720px] border-collapse text-left">
          <caption className="sr-only">{caption}</caption>

          {/* `top-0`, not an offset below the top bar: the wrapper scrolls horizontally, which makes it the
              sticky container, so any offset would push the header down over the first row. */}
          <thead className="sticky top-0 z-10 bg-grey-50">
            {table.getHeaderGroups().map((group) => (
              <tr key={group.id} className="border-b border-grey-200">
                {group.headers.map((header) => {
                  const column = header.column.columnDef as DataTableColumn<T>;
                  const sortable = Boolean(column.sortKey);
                  const active = sortable && sort === column.sortKey;

                  return (
                    <th
                      key={header.id}
                      scope="col"
                      aria-sort={active ? (dir === "asc" ? "ascending" : "descending") : undefined}
                      className={cn(
                        "px-4 py-2.5 text-caption font-semibold tracking-wide text-text-muted uppercase",
                        column.numeric && "text-right",
                      )}
                    >
                      {sortable ? (
                        <button
                          type="button"
                          onClick={() => toggleSort(column.sortKey as string)}
                          className={cn(
                            "inline-flex items-center gap-1 rounded-sm hover:text-brand-navy",
                            "focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:outline-none",
                            active && "text-brand-navy",
                          )}
                        >
                          {flexRender(header.column.columnDef.header, header.getContext())}
                          {active ? (
                            dir === "asc" ? (
                              <ArrowUpIcon aria-hidden="true" className="size-3" />
                            ) : (
                              <ArrowDownIcon aria-hidden="true" className="size-3" />
                            )
                          ) : (
                            <ChevronsUpDownIcon aria-hidden="true" className="size-3 opacity-50" />
                          )}
                        </button>
                      ) : (
                        flexRender(header.column.columnDef.header, header.getContext())
                      )}
                    </th>
                  );
                })}
              </tr>
            ))}
          </thead>

          <tbody className="divide-y divide-grey-200">
            {loading
              ? Array.from({ length: 8 }, (_, index) => (
                  <tr key={index}>
                    {columns.map((_column, cellIndex) => (
                      <td key={cellIndex} className="px-4 py-3">
                        <Skeleton className="h-4 w-full max-w-32" />
                      </td>
                    ))}
                  </tr>
                ))
              : table.getRowModel().rows.map((row) => (
                  <tr key={rowKey(row.original)} className="hover:bg-grey-50">
                    {row.getVisibleCells().map((cell) => (
                      <td
                        key={cell.id}
                        className={cn(
                          "px-4 py-3 text-body-sm text-brand-navy",
                          (cell.column.columnDef as DataTableColumn<T>).numeric && "text-right tabular-nums",
                        )}
                      >
                        {flexRender(cell.column.columnDef.cell, cell.getContext())}
                      </td>
                    ))}
                  </tr>
                ))}
          </tbody>
        </table>
      </div>

      <AdminPagination page={page} pages={pages} total={total} />
    </div>
  );
}
