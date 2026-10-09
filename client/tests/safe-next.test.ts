import { describe, expect, it } from "vitest";
import { safeNext } from "@/lib/safe-next";

/**
 * `?next=` is attacker-controlled. An open redirect here would let a phishing link send someone from our own
 * sign-in form to a lookalike site, which is why only a path on this site is ever honoured.
 */
describe("safeNext", () => {
  it("keeps a path on this site", () => {
    expect(safeNext("/checkout")).toBe("/checkout");
    expect(safeNext("/account/orders?status=PAID")).toBe("/account/orders?status=PAID");
    expect(safeNext("/product/apple-iphone-15#specs")).toBe("/product/apple-iphone-15#specs");
  });

  it("falls back when there is nothing to go back to", () => {
    expect(safeNext(null)).toBe("/account/orders");
    expect(safeNext("")).toBe("/account/orders");
    expect(safeNext(undefined, "/cart")).toBe("/cart");
  });

  it("refuses anything that could leave the site", () => {
    for (const hostile of [
      "https://evil.example.com",
      "//evil.example.com",
      "/\\evil.example.com",
      "javascript:alert(1)",
      "/javascript:alert(1)",
      "http://localhost:3000/account",
      "data:text/html,<script>",
    ]) {
      expect(safeNext(hostile)).toBe("/account/orders");
    }
  });
});
