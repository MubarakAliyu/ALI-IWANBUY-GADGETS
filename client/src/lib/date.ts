/**
 * Dates on the storefront — Africa/Lagos, always (overview §6.6). Month names come from a fixed table rather
 * than `Intl` month formatting, because locale data varies between runtimes and "Sept" is not the house style.
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

function parts(value: Date | string): {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
} {
  const date = typeof value === "string" ? new Date(value) : value;
  const read: Record<string, number> = {};
  for (const part of wallClock.formatToParts(date)) {
    if (part.type !== "literal") {
      read[part.type] = Number(part.value);
    }
  }
  return {
    year: read.year ?? 0,
    month: read.month ?? 1,
    day: read.day ?? 1,
    hour: read.hour ?? 0,
    minute: read.minute ?? 0,
  };
}

/** `12 Oct 2026`. */
export function formatDate(value: Date | string): string {
  const { year, month, day } = parts(value);
  return `${day} ${MONTHS[month - 1]} ${year}`;
}

/** `12 Oct 2026, 14:05`. */
export function formatDateTime(value: Date | string): string {
  const { hour, minute } = parts(value);
  return `${formatDate(value)}, ${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}
