import { describe, expect, it } from "vitest";
import { formatDate, formatDateTime } from "@/lib/date";
import { discountPercent, formatNaira, multiplyKobo, parseNairaToKobo } from "@/lib/money";

describe("money on the storefront", () => {
  it("formats prices the way the catalogue shows them", () => {
    expect(formatNaira(125_000_000)).toBe("₦1,250,000");
    expect(formatNaira(3_250_000)).toBe("₦32,500");
    expect(formatNaira(0)).toBe("₦0");
  });

  it("shows kobo only where an invoice needs them", () => {
    expect(formatNaira(125_050, { decimals: true })).toBe("₦1,250.50");
  });

  it("multiplies a line total without floating point", () => {
    expect(multiplyKobo(3_333_333, 3)).toBe(9_999_999);
  });

  it("reads a price filter typed in naira", () => {
    expect(parseNairaToKobo("100,000")).toBe(10_000_000);
  });

  it("only reports a discount when there is a real saving", () => {
    expect(discountPercent(42_500_000, 49_000_000)).toBe(13);
    expect(discountPercent(42_500_000, null)).toBeNull();
  });
});

describe("dates in Africa/Lagos", () => {
  it("formats a date as 12 Oct 2026", () => {
    expect(formatDate("2026-10-12T09:30:00.000Z")).toBe("12 Oct 2026");
  });

  it("uses the Lagos wall clock, not UTC", () => {
    // 23:30 UTC on 31 October is 00:30 on 1 November in Lagos.
    expect(formatDate("2026-10-31T23:30:00.000Z")).toBe("1 Nov 2026");
    expect(formatDateTime("2026-10-31T23:30:00.000Z")).toBe("1 Nov 2026, 00:30");
  });
});
