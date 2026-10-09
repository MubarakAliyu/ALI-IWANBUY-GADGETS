import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

/**
 * The type scale from `globals.css`. tailwind-merge has to be told these are font sizes; otherwise it reads
 * `text-caption` as a colour and drops it when merged with `text-danger`, or the other way round.
 */
export const TYPE_SCALE = [
  "display",
  "h1",
  "h2",
  "h3",
  "h4",
  "kpi",
  "body",
  "lead",
  "body-sm",
  "label",
  "caption",
] as const;

const twMerge = extendTailwindMerge<"numeric">({
  extend: {
    theme: { text: [...TYPE_SCALE] },
    classGroups: { numeric: ["numeric"] },
  },
});

/** Merge class names, letting later Tailwind utilities override earlier conflicting ones. */
export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}
