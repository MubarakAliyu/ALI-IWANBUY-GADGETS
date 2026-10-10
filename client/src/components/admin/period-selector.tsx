"use client";

import { DASHBOARD_PERIODS, DASHBOARD_PERIOD_LABEL, type DashboardPeriod } from "@aib/shared";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/cn";

/**
 * The period the overview is read over, kept in the URL (A-3) — so a link to "last month" is a link someone
 * can send, and the back button walks back through what was actually looked at.
 */
export function PeriodSelector({ period, from, to }: { period: DashboardPeriod; from?: string; to?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  function choose(next: DashboardPeriod) {
    const search = new URLSearchParams(params.toString());
    search.set("period", next);
    if (next !== "custom") {
      search.delete("from");
      search.delete("to");
    }
    router.push(`${pathname}?${search.toString()}`);
  }

  function setBound(key: "from" | "to", value: string) {
    const search = new URLSearchParams(params.toString());
    search.set("period", "custom");
    if (value) {
      search.set(key, value);
    } else {
      search.delete(key);
    }
    router.push(`${pathname}?${search.toString()}`);
  }

  return (
    <div className="grid gap-3">
      <div role="group" aria-label="Period" className="flex flex-wrap gap-1">
        {DASHBOARD_PERIODS.map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => choose(key)}
            aria-pressed={period === key}
            className={cn(
              "rounded-md px-3 py-1.5 text-body-sm transition-colors",
              "focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:outline-none",
              period === key
                ? "bg-brand-navy font-semibold text-white"
                : "border border-grey-200 bg-white text-text-muted hover:text-brand-navy",
            )}
          >
            {DASHBOARD_PERIOD_LABEL[key]}
          </button>
        ))}
      </div>

      {period === "custom" ? (
        <div className="flex flex-wrap items-end gap-3">
          <div className="grid gap-1.5">
            <Label htmlFor="period-from">From</Label>
            <Input
              id="period-from"
              type="date"
              defaultValue={from ?? ""}
              onChange={(event) => setBound("from", event.target.value)}
              className="w-44"
            />
          </div>
          <div className="grid gap-1.5">
            <Label htmlFor="period-to">To</Label>
            <Input
              id="period-to"
              type="date"
              defaultValue={to ?? ""}
              onChange={(event) => setBound("to", event.target.value)}
              className="w-44"
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}
