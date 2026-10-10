import type { Kpi } from "@aib/shared";
import { ArrowDownRightIcon, ArrowUpRightIcon, MinusIcon, type LucideIcon } from "lucide-react";
import { formatNaira } from "@/lib/money";
import { cn } from "@/lib/cn";

/**
 * One figure on the overview (A-3): a quiet caption, the number in bold tabular figures so a column of tiles
 * lines up, and a delta chip against the period before.
 *
 * Some measures have no meaningful "before" — what is waiting to be confirmed right now is a queue, not a
 * window — and those pass `compare={false}` rather than showing a delta of zero, which would read as "no
 * change" when it means "no comparison".
 */
export function KpiTile({
  label,
  kpi,
  format = "number",
  icon: Icon,
  compare = true,
  hint,
  /** True when going up is bad — refunds, for instance. */
  inverted = false,
}: {
  label: string;
  kpi: Kpi;
  format?: "number" | "money";
  icon?: LucideIcon;
  compare?: boolean;
  hint?: string;
  inverted?: boolean;
}) {
  const value = format === "money" ? formatNaira(kpi.value) : kpi.value.toLocaleString("en-NG");
  const delta = percentChange(kpi.value, kpi.previous);
  const good = delta === null || delta === 0 ? null : inverted ? delta < 0 : delta > 0;

  return (
    <div className="grid content-start gap-2 rounded-lg border border-grey-200 bg-white p-4">
      <p className="flex items-center gap-1.5 text-caption text-text-muted">
        {Icon ? <Icon aria-hidden="true" className="size-3.5" /> : null}
        {label}
      </p>

      <p className="text-h2 font-bold text-brand-navy tabular-nums">{value}</p>

      {compare && delta !== null ? (
        <p
          className={cn(
            "inline-flex w-fit items-center gap-1 rounded-full px-2 py-0.5 text-caption font-semibold",
            good === null && "bg-grey-100 text-text-muted",
            good === true && "bg-success-tint text-success-text",
            good === false && "bg-danger-tint text-danger-text",
          )}
        >
          {delta === 0 ? (
            <MinusIcon aria-hidden="true" className="size-3" />
          ) : delta > 0 ? (
            <ArrowUpRightIcon aria-hidden="true" className="size-3" />
          ) : (
            <ArrowDownRightIcon aria-hidden="true" className="size-3" />
          )}
          {Math.abs(delta)}% <span className="font-normal">vs previous</span>
        </p>
      ) : (
        <p className="text-caption text-text-muted">{hint ?? " "}</p>
      )}
    </div>
  );
}

/**
 * The change as a whole percentage, or null when there is nothing to compare against — going from nothing to
 * something is not "infinity per cent", and saying so would be worse than saying nothing.
 */
function percentChange(value: number, previous: number): number | null {
  if (previous === 0) {
    return value === 0 ? 0 : null;
  }
  return Math.round(((value - previous) / Math.abs(previous)) * 100);
}
