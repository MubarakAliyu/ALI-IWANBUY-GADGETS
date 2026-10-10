"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { DownloadIcon, SearchIcon, XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export type FilterSelect = {
  name: string;
  label: string;
  options: { value: string; label: string }[];
};

/**
 * Search, filters and the CSV export, over a table (A-2).
 *
 * Everything is in the URL, so the export link carries exactly what the table is showing — the file the owner
 * downloads is the thing they were looking at, which is the only behaviour that is not a trap.
 *
 * The search box commits on submit rather than on every keystroke: each change here is a server round trip,
 * and a table that reloads eight times while someone types a name is slower than one that waits for Enter.
 */
export function AdminFilterBar({
  selects = [],
  dateFilter = false,
  exportHref,
  searchLabel = "Search",
  searchPlaceholder = "Search…",
}: {
  selects?: FilterSelect[];
  dateFilter?: boolean;
  exportHref?: string;
  searchLabel?: string;
  searchPlaceholder?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const queryTerm = params.get("q") ?? "";

  function update(changes: Record<string, string | null>) {
    const search = new URLSearchParams(params.toString());
    for (const [key, value] of Object.entries(changes)) {
      if (value === null || value === "") {
        search.delete(key);
      } else {
        search.set(key, value);
      }
    }
    // Any change to what is being looked at starts again at page one.
    search.delete("page");
    router.push(`${pathname}?${search.toString()}`);
  }

  const active = [...params.keys()].filter((key) => !["page", "sort", "dir"].includes(key));

  return (
    <div className="grid gap-3 rounded-lg border border-grey-200 bg-white p-3">
      <div className="flex flex-wrap items-end gap-3">
        <form
          role="search"
          className="relative min-w-56 flex-1"
          onSubmit={(event) => {
            event.preventDefault();
            const field = event.currentTarget.elements.namedItem("q") as HTMLInputElement | null;
            update({ q: field?.value.trim() || null });
          }}
        >
          <Label htmlFor="filter-search" className="sr-only">
            {searchLabel}
          </Label>
          <SearchIcon
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-text-muted"
          />
          {/* Uncontrolled, keyed on the URL's term: the box holds what is being typed, and a new URL — from
              Clear, or the back button — remounts it with the new value. No effect has to copy one into the
              other. */}
          <Input
            key={queryTerm}
            id="filter-search"
            name="q"
            type="search"
            defaultValue={queryTerm}
            placeholder={searchPlaceholder}
            className="pl-9"
          />
        </form>

        {selects.map((select) => (
          <div key={select.name} className="grid gap-1.5">
            <Label htmlFor={`filter-${select.name}`} className="text-caption">
              {select.label}
            </Label>
            <select
              id={`filter-${select.name}`}
              value={params.get(select.name) ?? ""}
              onChange={(event) => update({ [select.name]: event.target.value || null })}
              className="h-10 rounded-md border border-grey-200 bg-white px-3 text-body-sm text-brand-navy focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:outline-none"
            >
              <option value="">All</option>
              {select.options.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        ))}

        {dateFilter ? (
          <>
            <div className="grid gap-1.5">
              <Label htmlFor="filter-from" className="text-caption">
                From
              </Label>
              <Input
                id="filter-from"
                type="date"
                value={params.get("from") ?? ""}
                onChange={(event) => update({ from: event.target.value || null })}
                className="w-40"
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="filter-to" className="text-caption">
                To
              </Label>
              <Input
                id="filter-to"
                type="date"
                value={params.get("to") ?? ""}
                onChange={(event) => update({ to: event.target.value || null })}
                className="w-40"
              />
            </div>
          </>
        ) : null}

        <div className="ml-auto flex items-end gap-2">
          {active.length > 0 ? (
            <Button variant="ghost" size="sm" onClick={() => router.push(pathname)}>
              <XIcon aria-hidden="true" className="size-4" />
              Clear
            </Button>
          ) : null}

          {exportHref ? (
            <Button asChild variant="outline" size="sm">
              <a href={exportHref} download>
                <DownloadIcon aria-hidden="true" className="size-4" />
                Export CSV
              </a>
            </Button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
