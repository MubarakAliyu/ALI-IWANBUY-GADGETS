import { describe, expect, it } from "vitest";
import { AppError } from "../src/lib/app-error.js";
import { allowedTransitions, assertTransition, canTransition } from "../src/lib/order-lifecycle.js";

describe("the order lifecycle table", () => {
  it("lets a customer say they have paid, and cancel before they have", () => {
    expect(canTransition("PENDING_PAYMENT", "AWAITING_CONFIRMATION", "CUSTOMER")).toBe(true);
    expect(canTransition("PENDING_PAYMENT", "CANCELLED", "CUSTOMER")).toBe(true);
    expect(canTransition("AWAITING_CONFIRMATION", "CANCELLED", "CUSTOMER")).toBe(true);
  });

  it("does not let a customer mark their own order paid or shipped", () => {
    expect(canTransition("AWAITING_CONFIRMATION", "PAID", "CUSTOMER")).toBe(false);
    expect(canTransition("PROCESSING", "SHIPPED", "CUSTOMER")).toBe(false);
    expect(canTransition("PROCESSING", "CANCELLED", "CUSTOMER")).toBe(false);
  });

  it("lets only the auto-cancel job and people cancel an unpaid order", () => {
    expect(canTransition("PENDING_PAYMENT", "CANCELLED", "SYSTEM")).toBe(true);
    expect(canTransition("PAID", "CANCELLED", "SYSTEM")).toBe(false);
  });

  it("treats completed and cancelled as the end of the road", () => {
    expect(allowedTransitions("CANCELLED", "ADMIN")).toEqual([]);
    expect(allowedTransitions("REFUNDED", "ADMIN")).toEqual([]);
    expect(allowedTransitions("COMPLETED", "ADMIN")).toEqual(["REFUNDED"]);
  });

  it("explains an illegal move in words a person can read", () => {
    expect(() => assertTransition("PENDING_PAYMENT", "DELIVERED", "ADMIN")).toThrow(AppError);
    try {
      assertTransition("PENDING_PAYMENT", "DELIVERED", "ADMIN");
    } catch (error) {
      expect((error as AppError).code).toBe("INVALID_TRANSITION");
      expect((error as AppError).message).toBe("An order that is pending payment cannot become delivered.");
    }
  });

  it("refuses a move to the status the order is already in", () => {
    expect(() => assertTransition("PAID", "PAID", "ADMIN")).toThrow("already paid");
  });
});
