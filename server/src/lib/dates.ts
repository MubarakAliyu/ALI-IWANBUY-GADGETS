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

/**
 * Africa/Lagos is UTC+1 all year — West Africa Time has had no daylight saving since 1945 — so a Lagos day
 * boundary is an exact offset rather than something to look up. Everything that filters or groups by day uses
 * these two, so "today" means the same thing on every screen.
 */
export const LAGOS_UTC_OFFSET = "+01:00";

const DAY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/** The instant a Lagos day begins, from `YYYY-MM-DD`. Returns null for anything else. */
export function lagosDayStart(day: string): Date | null {
  if (!DAY_PATTERN.test(day)) {
    return null;
  }
  const date = new Date(`${day}T00:00:00.000${LAGOS_UTC_OFFSET}`);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** The instant a Lagos day ends — inclusive of the whole day, so `from=to=today` covers today. */
export function lagosDayEnd(day: string): Date | null {
  if (!DAY_PATTERN.test(day)) {
    return null;
  }
  const date = new Date(`${day}T23:59:59.999${LAGOS_UTC_OFFSET}`);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** `YYYY-MM-DD` for a Lagos wall-clock day — the inverse of `lagosDayStart`. */
export function lagosDayKey(date: Date): string {
  const { year, month, day } = lagosParts(date);
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

/** Start of the Lagos day that contains this instant. */
export function startOfLagosDay(date: Date): Date {
  return lagosDayStart(lagosDayKey(date)) ?? date;
}

/** Midnight at the start of the Lagos day `days` days before today. */
export function lagosDaysAgo(days: number, now: Date = new Date()): Date {
  const start = startOfLagosDay(now);
  return new Date(start.getTime() - days * 24 * 60 * 60 * 1000);
}
