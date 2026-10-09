/**
 * Money — the only module where naira arithmetic happens (overview §6.6).
 *
 * Every amount is an integer number of kobo (₦1 = 100 kobo). Arithmetic runs in `bigint`, so a cart total, an
 * order total or a year of revenue can never pick up a floating-point error. Inputs may be a `bigint` or a
 * safe-integer `number`; a fractional number is rejected outright rather than silently rounded.
 *
 * Nothing outside this module may divide, multiply or round an amount.
 */

export type Kobo = bigint;
export type KoboInput = bigint | number;

const KOBO_PER_NAIRA = 100n;
const MINUS_SIGN = "−";

export class MoneyError extends Error {
  override name = "MoneyError";
}

/** Normalise an amount to `bigint` kobo. Throws on fractional or unsafe numbers. */
export function kobo(value: KoboInput): Kobo {
  if (typeof value === "bigint") {
    return value;
  }
  if (!Number.isSafeInteger(value)) {
    throw new MoneyError(`Kobo must be a whole number — got ${value}.`);
  }
  return BigInt(value);
}

/** Kobo as a naira `number`, for charts and display only — never for arithmetic. Exact to ₦90 trillion. */
export function koboToNaira(value: KoboInput): number {
  return Number(kobo(value)) / 100;
}

/**
 * A naira amount (`1250.5`, `"₦1,250.50"`, `"1 250"`) as integer kobo, rounded half away from zero at the
 * third decimal. Used for URL price filters and any typed amount.
 */
export function parseNairaToKobo(naira: number | string): number {
  const text = typeof naira === "number" ? numberToDecimalString(naira) : naira;
  return Number(parseDecimal(text, 2));
}

/** `₦125,500` on the storefront; `₦125,500.00` with `{ decimals: true }` on invoices. */
export function formatNaira(value: KoboInput, opts: { decimals?: boolean } = {}): string {
  const amount = kobo(value);
  const negative = amount < 0n;
  const magnitude = negative ? -amount : amount;
  const sign = negative ? MINUS_SIGN : "";

  if (opts.decimals) {
    const naira = magnitude / KOBO_PER_NAIRA;
    const remainder = (magnitude % KOBO_PER_NAIRA).toString().padStart(2, "0");
    return `${sign}₦${groupThousands(naira.toString())}.${remainder}`;
  }

  return `${sign}₦${groupThousands(divRound(magnitude, KOBO_PER_NAIRA).toString())}`;
}

/** Whole naira as a bare grouped number — `125,500` — for URLs, CSV columns and input fields. */
export function formatNairaPlain(value: KoboInput): string {
  const amount = kobo(value);
  const negative = amount < 0n;
  const magnitude = negative ? -amount : amount;
  return `${negative ? MINUS_SIGN : ""}${groupThousands(divRound(magnitude, KOBO_PER_NAIRA).toString())}`;
}

export function addKobo(...values: KoboInput[]): number {
  return Number(values.reduce<Kobo>((sum, value) => sum + kobo(value), 0n));
}

export function subtractKobo(a: KoboInput, b: KoboInput): number {
  return Number(kobo(a) - kobo(b));
}

/** Price × quantity. The quantity must be a whole number. */
export function multiplyKobo(value: KoboInput, quantity: number): number {
  if (!Number.isSafeInteger(quantity)) {
    throw new MoneyError(`Quantity must be a whole number — got ${quantity}.`);
  }
  return Number(kobo(value) * BigInt(quantity));
}

/** How much `price` is off `compareAt`, as a whole percentage. `null` when there is no genuine saving. */
export function discountPercent(
  priceKobo: KoboInput,
  compareAtKobo: KoboInput | null | undefined,
): number | null {
  if (compareAtKobo === null || compareAtKobo === undefined) {
    return null;
  }
  const price = kobo(priceKobo);
  const compareAt = kobo(compareAtKobo);
  if (compareAt <= price || compareAt === 0n) {
    return null;
  }
  const percent = Number(divRound((compareAt - price) * 100n, compareAt));
  return percent > 0 ? percent : null;
}

/** Integer division rounding half away from zero. `divisor` must be positive. */
function divRound(dividend: bigint, divisor: bigint): bigint {
  const quotient = dividend / divisor;
  const remainder = dividend % divisor;
  const doubled = (remainder < 0n ? -remainder : remainder) * 2n;
  if (doubled >= divisor) {
    return dividend < 0n ? quotient - 1n : quotient + 1n;
  }
  return quotient;
}

/** Parse a decimal string into an integer scaled by 10^scale, rounding half away from zero. */
function parseDecimal(raw: string, scale: number): bigint {
  const cleaned = raw.replace(/[₦,\s_]/g, "").replace(MINUS_SIGN, "-");
  const match = /^([+-]?)(\d*)(?:\.(\d*))?$/.exec(cleaned);
  if (!match || (match[2] === "" && (match[3] ?? "") === "")) {
    throw new MoneyError(`"${raw}" is not an amount.`);
  }
  const [, sign = "", whole = "", fraction = ""] = match;
  const kept = fraction.slice(0, scale).padEnd(scale, "0");
  let magnitude = BigInt(`${whole || "0"}${kept}`);
  const nextDigit = fraction.charAt(scale);
  if (nextDigit !== "" && Number(nextDigit) >= 5) {
    magnitude += 1n;
  }
  return sign === "-" ? -magnitude : magnitude;
}

/** The shortest decimal string that round-trips `value` — `1.005` stays `"1.005"`, not `1.00499…`. */
function numberToDecimalString(value: number): string {
  if (!Number.isFinite(value)) {
    throw new MoneyError(`${value} is not an amount.`);
  }
  const text = String(value);
  if (!text.includes("e")) {
    return text;
  }
  if (Math.abs(value) < 1) {
    return "0";
  }
  throw new MoneyError(`${value} is too large to be an amount.`);
}

function groupThousands(digits: string): string {
  return digits.replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}
