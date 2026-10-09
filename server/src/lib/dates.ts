/**
 * Dates — Africa/Lagos, always (overview §6.6). "This month" means the month in Lagos, not in UTC: an order
 * placed at 00:30 on 1 November in Lagos belongs to November even though it is still October in UTC.
 */

export const TZ = "Africa/Lagos";

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"] as const;

const wallClock = new Intl.DateTimeFormat("en-US", {
  timeZone: TZ,
  year: "numeric",
  month: "numeric",
  day: "numeric",
  hour: "numeric",
  minute: "numeric",
  hourCycle: "h23",
});

type LagosParts = { year: number; month: number; day: number; hour: number; minute: number };

function lagosParts(date: Date): LagosParts {
  const parts: Record<string, number> = {};
  for (const part of wallClock.formatToParts(date)) {
    if (part.type !== "literal") {
      parts[part.type] = Number(part.value);
    }
  }
  return {
    year: parts.year ?? 0,
    month: parts.month ?? 1,
    day: parts.day ?? 1,
    hour: parts.hour ?? 0,
    minute: parts.minute ?? 0,
  };
}

/** `202610` — the Lagos year and month, as the monthly counters key themselves. */
export function lagosYearMonth(date: Date): string {
  const { year, month } = lagosParts(date);
  return `${year}${String(month).padStart(2, "0")}`;
}

/** `12 Oct 2026` (overview §6.6). */
export function formatLagosDate(date: Date): string {
  const { year, month, day } = lagosParts(date);
  return `${day} ${MONTHS[month - 1]} ${year}`;
}

/** `14:05` in Lagos. */
export function formatLagosTime(date: Date): string {
  const { hour, minute } = lagosParts(date);
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}
