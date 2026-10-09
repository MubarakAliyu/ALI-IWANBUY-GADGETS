import { describe, expect, it } from "vitest";
import {
  addKobo,
  discountPercent,
  formatNaira,
  formatNairaPlain,
  koboToNaira,
  MoneyError,
  multiplyKobo,
  parseNairaToKobo,
  subtractKobo,
} from "../src/money.js";

describe("formatNaira", () => {
  it("renders whole naira by default", () => {
    expect(formatNaira(125_000_00)).toBe("₦125,000");
    expect(formatNaira(0)).toBe("₦0");
    expect(formatNaira(99)).toBe("₦1");
    expect(formatNaira(49)).toBe("₦0");
  });

  it("renders kobo on invoices", () => {
    expect(formatNaira(125_000_50, { decimals: true })).toBe("₦125,000.50");
    expect(formatNaira(7, { decimals: true })).toBe("₦0.07");
  });

  it("groups thousands and marks negatives", () => {
    expect(formatNaira(1_250_000_00)).toBe("₦1,250,000");
    expect(formatNaira(-5_000_00)).toBe("−₦5,000");
    expect(formatNairaPlain(1_250_000_00)).toBe("1,250,000");
  });

  it("stays exact well past the float-safe range for naira", () => {
    expect(formatNaira(9_007_199_254_740_993n, { decimals: true })).toBe("₦90,071,992,547,409.93");
  });
});

describe("parseNairaToKobo", () => {
  it("reads typed and formatted amounts", () => {
    expect(parseNairaToKobo("125000")).toBe(12_500_000);
    expect(parseNairaToKobo("₦125,000.50")).toBe(12_500_050);
    expect(parseNairaToKobo(1250.5)).toBe(125_050);
    expect(parseNairaToKobo("0")).toBe(0);
  });

  it("rounds half away from zero at the third decimal", () => {
    expect(parseNairaToKobo("1.005")).toBe(101);
    expect(parseNairaToKobo("1.004")).toBe(100);
  });

  it("rejects what is not an amount", () => {
    expect(() => parseNairaToKobo("abc")).toThrow(MoneyError);
    expect(() => parseNairaToKobo("")).toThrow(MoneyError);
  });
});

describe("integer arithmetic", () => {
  it("adds, subtracts and multiplies without floating point", () => {
    expect(addKobo(10_01, 20_02, 30_03)).toBe(6006);
    expect(subtractKobo(10_000, 2_500)).toBe(7_500);
    expect(multiplyKobo(33_33, 3)).toBe(9_999);
  });

  it("refuses fractional kobo and fractional quantities", () => {
    expect(() => addKobo(10.5)).toThrow(MoneyError);
    expect(() => multiplyKobo(100, 1.5)).toThrow(MoneyError);
  });

  it("converts to naira for display only", () => {
    expect(koboToNaira(12_500_050)).toBe(125000.5);
  });
});

describe("discountPercent", () => {
  it("reports a whole-percent saving", () => {
    expect(discountPercent(80_000_00, 100_000_00)).toBe(20);
    expect(discountPercent(74_900_00, 89_900_00)).toBe(17);
  });

  it("returns null when there is no genuine saving", () => {
    expect(discountPercent(100_000_00, null)).toBeNull();
    expect(discountPercent(100_000_00, 100_000_00)).toBeNull();
    expect(discountPercent(100_000_00, 90_000_00)).toBeNull();
  });
});
