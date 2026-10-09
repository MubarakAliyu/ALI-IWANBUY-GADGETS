import Link from "next/link";
import { ChevronLeftIcon, ChevronRightIcon } from "lucide-react";
import { cn } from "@/lib/cn";

type PaginationProps = {
  page: number;
  pages: number;
  /** Builds the href for a page — the caller keeps the rest of the filters in the URL. */
  hrefFor: (page: number) => string;
  className?: string;
};

/**
 * Page numbers with ellipses: always the first and last page, the current page and its neighbours. Links, not
 * buttons, so a page can be opened in a new tab and the URL stays the source of truth (AC1.2).
 */
export function Pagination({ page, pages, hrefFor, className }: PaginationProps) {
  if (pages <= 1) {
    return null;
  }

  const numbers = pageNumbers(page, pages);

  return (
    <nav aria-label="Pagination" className={cn("flex items-center justify-center gap-1", className)}>
      <PageLink
        href={hrefFor(page - 1)}
        disabled={page <= 1}
        aria-label="Previous page"
        className="gap-1 px-3"
      >
        <ChevronLeftIcon aria-hidden="true" className="size-4" />
        <span className="hidden sm:inline">Previous</span>
      </PageLink>

      {numbers.map((number, index) =>
        number === null ? (
          <span key={`gap-${index}`} aria-hidden="true" className="px-2 text-text-muted">
            …
          </span>
        ) : (
          <PageLink
            key={number}
            href={hrefFor(number)}
            current={number === page}
            aria-label={`Page ${number}`}
            className="w-11 justify-center px-0 numeric"
          >
            {number}
          </PageLink>
        ),
      )}

      <PageLink
        href={hrefFor(page + 1)}
        disabled={page >= pages}
        aria-label="Next page"
        className="gap-1 px-3"
      >
        <span className="hidden sm:inline">Next</span>
        <ChevronRightIcon aria-hidden="true" className="size-4" />
      </PageLink>
    </nav>
  );
}

function PageLink({
  href,
  disabled,
  current,
  className,
  children,
  ...props
}: {
  href: string;
  disabled?: boolean;
  current?: boolean;
  className?: string;
  children: React.ReactNode;
} & React.ComponentProps<"a">) {
  const classes = cn(
    "inline-flex h-11 items-center rounded-md border px-3 text-body-sm font-medium transition-colors duration-150 ease-out",
    current
      ? "border-brand-primary bg-brand-primary text-white"
      : "border-grey-200 bg-white text-brand-navy hover:border-grey-300 hover:bg-grey-50",
    className,
  );

  if (disabled) {
    return (
      <span aria-disabled="true" className={cn(classes, "cursor-not-allowed border-grey-200 text-grey-500")}>
        {children}
      </span>
    );
  }

  return (
    <Link href={href} aria-current={current ? "page" : undefined} className={classes} {...props}>
      {children}
    </Link>
  );
}

/** First, last, current and its neighbours; `null` marks a gap. */
export function pageNumbers(page: number, pages: number): (number | null)[] {
  if (pages <= 7) {
    return Array.from({ length: pages }, (_, index) => index + 1);
  }

  const shown = new Set<number>([1, pages, page, page - 1, page + 1]);
  const sorted = [...shown].filter((number) => number >= 1 && number <= pages).sort((a, b) => a - b);

  const result: (number | null)[] = [];
  let previous = 0;
  for (const number of sorted) {
    if (previous && number - previous > 1) {
      result.push(null);
    }
    result.push(number);
    previous = number;
  }
  return result;
}
