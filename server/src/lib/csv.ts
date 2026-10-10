/**
 * CSV export (overview §10 A-4, A-7, A-9). Every admin table exports the **filtered set**, not the page, so
 * the owner can open the month in a spreadsheet.
 *
 * Money is written in naira with two decimals and no thousands separators or currency symbol, because that is
 * the only form a spreadsheet will treat as a number — the ₦ belongs on the screen, not in a cell.
 */

import { lagosDayKey } from "./dates.js";

/** A cell is escaped only when it has to be, so an ordinary file stays readable in a text editor. */
function cell(value: string | number | null | undefined): string {
  if (value === null || value === undefined) {
    return "";
  }
  const text = String(value);
  // A leading =, +, - or @ is read as a formula by Excel; prefixing with a quote makes it plain text.
  // A plain number is left alone: a refund of -15000.00 must stay a number the spreadsheet can add up.
  const isNumber = /^-?\d+(\.\d+)?$/.test(text);
  const safe = !isNumber && /^[=+\-@\t\r]/.test(text) ? `'${text}` : text;
  return /[",\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

export type CsvColumn<T> = {
  header: string;
  value: (row: T) => string | number | null | undefined;
};

export function toCsv<T>(rows: T[], columns: CsvColumn<T>[]): string {
  const lines = [columns.map((column) => cell(column.header)).join(",")];
  for (const row of rows) {
    lines.push(columns.map((column) => cell(column.value(row))).join(","));
  }
  // A BOM, so Excel on Windows opens a UTF-8 file with Nigerian names in it correctly.
  return `\uFEFF${lines.join("\r\n")}\r\n`;
}

/** Kobo as a spreadsheet number: `1500000` → `15000.00`. */
export function csvNaira(kobo: number): string {
  const negative = kobo < 0;
  const magnitude = Math.abs(kobo);
  const naira = Math.trunc(magnitude / 100);
  return `${negative ? "-" : ""}${naira}.${String(magnitude % 100).padStart(2, "0")}`;
}

/** `aib-orders-2026-10-10.csv` — a name that sorts, says what it is, and is dated in Lagos. */
export function csvFilename(what: string, now: Date = new Date()): string {
  return `aib-${what}-${lagosDayKey(now)}.csv`;
}
