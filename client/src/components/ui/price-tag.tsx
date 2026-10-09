import { cn } from "@/lib/cn";
import { discountPercent, formatNaira } from "@/lib/money";

type PriceTagProps = {
  priceKobo: number;
  compareAtPriceKobo?: number | null;
  /** Shown before the price when a product has several variants: "From ₦285,000". */
  from?: boolean;
  size?: "sm" | "md" | "lg";
  className?: string;
};

const SIZES = {
  sm: { price: "text-body-sm font-semibold", compare: "text-caption", chip: "text-caption" },
  md: { price: "text-h4 font-semibold", compare: "text-body-sm", chip: "text-caption" },
  lg: { price: "text-h2", compare: "text-body-sm", chip: "text-caption" },
} as const;

/**
 * A price, the price it used to be, and how much that saves — the three things a customer compares. The
 * discount chip only appears when the saving is real (overview §4.6).
 */
export function PriceTag({ priceKobo, compareAtPriceKobo, from, size = "md", className }: PriceTagProps) {
  const saving = discountPercent(priceKobo, compareAtPriceKobo);
  const styles = SIZES[size];

  return (
    <p data-slot="price-tag" className={cn("flex flex-wrap items-baseline gap-x-2 gap-y-1", className)}>
      {from ? <span className="text-caption text-text-muted">From</span> : null}
      <span className={cn("numeric text-brand-navy", styles.price)}>{formatNaira(priceKobo)}</span>
      {saving !== null && compareAtPriceKobo ? (
        <>
          <span className={cn("numeric text-text-muted line-through", styles.compare)}>
            {formatNaira(compareAtPriceKobo)}
          </span>
          <span
            className={cn(
              "rounded-sm bg-success-tint px-1.5 py-0.5 font-semibold text-success-text",
              styles.chip,
            )}
          >
            <span aria-hidden="true">−{saving}%</span>
            <span className="sr-only">Save {saving} percent</span>
          </span>
        </>
      ) : null}
    </p>
  );
}
