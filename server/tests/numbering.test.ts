import { beforeEach, describe, expect, it } from "vitest";
import { nextNumber } from "../src/lib/numbering.js";
import { Counter } from "../src/models/index.js";

describe("nextNumber", () => {
  beforeEach(async () => {
    await Counter.deleteMany({});
  });

  it("formats a number as AIB-KIND-YYYYMM-NNNN", async () => {
    const number = await nextNumber("order", { at: new Date("2026-10-08T12:00:00.000Z") });
    expect(number).toBe("AIB-ORD-202610-0001");
  });

  it("keeps a separate sequence per kind and per month", async () => {
    const october = new Date("2026-10-08T12:00:00.000Z");
    const november = new Date("2026-11-02T12:00:00.000Z");

    expect(await nextNumber("order", { at: october })).toBe("AIB-ORD-202610-0001");
    expect(await nextNumber("invoice", { at: october })).toBe("AIB-INV-202610-0001");
    expect(await nextNumber("payment", { at: october })).toBe("AIB-PAY-202610-0001");
    expect(await nextNumber("order", { at: october })).toBe("AIB-ORD-202610-0002");
    expect(await nextNumber("order", { at: november })).toBe("AIB-ORD-202611-0001");
  });

  it("counts the month in Lagos, not in UTC", async () => {
    // 23:30 UTC on 31 October is already 00:30 on 1 November in Lagos.
    const number = await nextNumber("order", { at: new Date("2026-10-31T23:30:00.000Z") });
    expect(number).toBe("AIB-ORD-202611-0001");
  });

  it("hands out fifty distinct numbers to fifty concurrent callers", async () => {
    const at = new Date("2026-10-08T12:00:00.000Z");
    const numbers = await Promise.all(Array.from({ length: 50 }, () => nextNumber("order", { at })));

    expect(new Set(numbers).size).toBe(50);
    expect(numbers.every((number) => number.startsWith("AIB-ORD-202610-"))).toBe(true);
    const sequences = numbers.map((number) => Number(number.slice(-4))).sort((a, b) => a - b);
    expect(sequences).toEqual(Array.from({ length: 50 }, (_, index) => index + 1));
  });
});
