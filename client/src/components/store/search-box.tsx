"use client";

import { useEffect, useId, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { SearchIcon, XIcon } from "lucide-react";
import { suggestProducts } from "@/lib/catalog";
import type { SearchSuggestion } from "@aib/shared";
import { cn } from "@/lib/cn";
import { formatNaira } from "@/lib/money";

/**
 * Search with instant suggestions from the second character (S-1).
 *
 * It is a combobox: the input owns the ARIA state, the list is a `listbox`, and Arrow keys, Enter and Escape
 * all work without a mouse. Submitting without choosing a suggestion goes to `/search?q=…`, so the results
 * page is always reachable.
 */
/** Matches the server: suggestions start at the second character (S-1). */
const SUGGEST_MIN_LENGTH = 2;
const SUGGEST_DEBOUNCE_MS = 150;

export function SearchBox({ className }: { className?: string }) {
  const router = useRouter();
  const listId = useId();
  const [term, setTerm] = useState("");
  const [open, setOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);

  /** The last answer and the term it answers, so a result can never be shown against a newer query. */
  const [answer, setAnswer] = useState<{ term: string; items: SearchSuggestion[] } | null>(null);

  const trimmed = term.trim();
  const suggestions = answer?.term === trimmed ? answer.items : [];
  const searching = trimmed.length >= SUGGEST_MIN_LENGTH && answer?.term !== trimmed;

  /**
   * Suggestions are fetched directly rather than through a query client: this box is in the header of every
   * page, and a catalogue page should not have to download a cache to answer three keystrokes. The request is
   * debounced, and the previous one is aborted, so only the latest answer is ever kept.
   */
  useEffect(() => {
    if (trimmed.length < SUGGEST_MIN_LENGTH) {
      return;
    }

    const controller = new AbortController();
    const timer = setTimeout(() => {
      suggestProducts(trimmed, controller.signal)
        .then((items) => setAnswer({ term: trimmed, items }))
        .catch(() => {
          if (!controller.signal.aborted) {
            setAnswer({ term: trimmed, items: [] });
          }
        });
    }, SUGGEST_DEBOUNCE_MS);

    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [trimmed]);

  useEffect(() => {
    function onPointerDown(event: PointerEvent) {
      if (!containerRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, []);

  const showList = open && trimmed.length >= SUGGEST_MIN_LENGTH;

  function goToSearch() {
    if (!trimmed) {
      return;
    }
    setOpen(false);
    router.push(`/search?q=${encodeURIComponent(trimmed)}`);
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (!showList || suggestions.length === 0) {
      return;
    }
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setHighlighted((index) => (index + 1) % suggestions.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setHighlighted((index) => (index <= 0 ? suggestions.length - 1 : index - 1));
    } else if (event.key === "Escape") {
      setOpen(false);
    } else if (event.key === "Enter" && highlighted >= 0) {
      const choice = suggestions[highlighted];
      if (choice) {
        event.preventDefault();
        setOpen(false);
        router.push(`/product/${choice.slug}`);
      }
    }
  }

  return (
    <div ref={containerRef} className={cn("relative", className)}>
      <form
        role="search"
        onSubmit={(event) => {
          event.preventDefault();
          goToSearch();
        }}
      >
        <label htmlFor={`${listId}-input`} className="sr-only">
          Search products
        </label>
        <div className="relative">
          <SearchIcon
            aria-hidden="true"
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-grey-500"
          />
          <input
            id={`${listId}-input`}
            type="search"
            autoComplete="off"
            value={term}
            placeholder="Search phones, laptops, accessories…"
            role="combobox"
            aria-expanded={showList}
            aria-controls={listId}
            aria-autocomplete="list"
            aria-activedescendant={highlighted >= 0 ? `${listId}-option-${highlighted}` : undefined}
            onChange={(event) => {
              setTerm(event.target.value);
              // A new term means a new list, so nothing in the old one stays highlighted.
              setHighlighted(-1);
              setOpen(true);
            }}
            onFocus={() => setOpen(true)}
            onKeyDown={onKeyDown}
            className="h-11 w-full rounded-md border border-grey-200 bg-white pr-10 pl-9 text-body-sm text-brand-navy transition-colors duration-150 ease-out placeholder:text-text-muted hover:border-grey-300 focus-visible:border-brand-primary [&::-webkit-search-cancel-button]:appearance-none"
          />
          {term ? (
            <button
              type="button"
              aria-label="Clear search"
              onClick={() => {
                setTerm("");
                setOpen(false);
              }}
              className="absolute top-1/2 right-2 inline-flex size-7 -translate-y-1/2 items-center justify-center rounded-sm text-grey-500 hover:bg-grey-100 hover:text-brand-navy"
            >
              <XIcon aria-hidden="true" className="size-4" />
            </button>
          ) : null}
        </div>
      </form>

      {showList ? (
        <div className="absolute top-[calc(100%+6px)] right-0 left-0 z-40 overflow-hidden rounded-md border border-grey-200 bg-white shadow-lg">
          <ul
            id={listId}
            role="listbox"
            aria-label="Product suggestions"
            className="max-h-96 overflow-y-auto"
          >
            {suggestions.map((suggestion, index) => (
              <li key={suggestion.slug} role="none">
                <Link
                  id={`${listId}-option-${index}`}
                  role="option"
                  aria-selected={index === highlighted}
                  href={`/product/${suggestion.slug}`}
                  onClick={() => setOpen(false)}
                  onMouseEnter={() => setHighlighted(index)}
                  className={cn(
                    "flex items-center gap-3 px-3 py-2.5 text-body-sm",
                    index === highlighted ? "bg-grey-100" : "bg-white",
                  )}
                >
                  <span className="relative size-10 shrink-0 overflow-hidden rounded-sm bg-grey-50">
                    {suggestion.image ? (
                      <Image src={suggestion.image} alt="" fill sizes="40px" className="object-contain" />
                    ) : null}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium text-brand-navy">{suggestion.name}</span>
                    <span className="block text-caption text-text-muted">{suggestion.brand}</span>
                  </span>
                  <span className="shrink-0 text-body-sm font-semibold numeric text-brand-navy">
                    {formatNaira(suggestion.priceFromKobo)}
                  </span>
                </Link>
              </li>
            ))}
            {suggestions.length === 0 ? (
              <li className="px-3 py-3 text-body-sm text-text-muted">
                {searching ? "Searching…" : `No products match “${trimmed}”.`}
              </li>
            ) : null}
          </ul>
          <button
            type="button"
            onClick={goToSearch}
            className="w-full border-t border-grey-200 bg-grey-50 px-3 py-2.5 text-left text-body-sm font-semibold text-brand-primary hover:bg-grey-100"
          >
            See all results for “{trimmed}”
          </button>
        </div>
      ) : null}
    </div>
  );
}
