/**
 * The order lifecycle (overview §8) — one table for the whole project. Batch 3's admin actions read the same
 * rules, so there is exactly one answer anywhere to "can this order move from here to there, and by whom".
 *
 *   PENDING_PAYMENT ──customer says they paid──▶ AWAITING_CONFIRMATION ──admin confirms──▶ PAID ──▶ PROCESSING
 *          │                                              │                                          │
 *          └──────────── cancelled ◀───────────── customer, admin or the auto-cancel job     READY_FOR_PICKUP
 *                                                                                              or SHIPPED
 *                                                                                                  │
 *                                                                                      DELIVERED ──▶ COMPLETED
 *
 * Pay-on-delivery orders skip the first two states: they are placed straight into PROCESSING, unpaid.
 */

import type { OrderStatus } from "@aib/shared";
import { AppError } from "./app-error.js";

export type TransitionActor = "CUSTOMER" | "ADMIN" | "SYSTEM";

/** Who may make each move. A status missing from the table is terminal. */
const TRANSITIONS: Partial<Record<OrderStatus, Partial<Record<OrderStatus, TransitionActor[]>>>> = {
  PENDING_PAYMENT: {
    AWAITING_CONFIRMATION: ["CUSTOMER", "ADMIN"],
    PAID: ["ADMIN"],
    CANCELLED: ["CUSTOMER", "ADMIN", "SYSTEM"],
  },
  AWAITING_CONFIRMATION: {
    PAID: ["ADMIN"],
    PENDING_PAYMENT: ["ADMIN"],
    CANCELLED: ["CUSTOMER", "ADMIN"],
  },
  PAID: {
    PROCESSING: ["ADMIN"],
    CANCELLED: ["ADMIN"],
    REFUNDED: ["ADMIN"],
  },
  PROCESSING: {
    READY_FOR_PICKUP: ["ADMIN"],
    SHIPPED: ["ADMIN"],
    DELIVERED: ["ADMIN"],
    CANCELLED: ["ADMIN"],
    REFUNDED: ["ADMIN"],
  },
  READY_FOR_PICKUP: {
    DELIVERED: ["ADMIN"],
    COMPLETED: ["ADMIN"],
    CANCELLED: ["ADMIN"],
    REFUNDED: ["ADMIN"],
  },
  SHIPPED: {
    DELIVERED: ["ADMIN"],
    CANCELLED: ["ADMIN"],
    REFUNDED: ["ADMIN"],
  },
  DELIVERED: {
    COMPLETED: ["ADMIN"],
    REFUNDED: ["ADMIN"],
  },
  COMPLETED: {
    REFUNDED: ["ADMIN"],
  },
};

/** The statuses whose stock has to go back on the shelf when an order reaches them (overview §8). */
export const RESTOCKING_STATUSES: OrderStatus[] = ["CANCELLED", "REFUNDED"];

/** The statuses a customer may still cancel from — before any money has been confirmed (S-11). */
export const CUSTOMER_CANCELLABLE: OrderStatus[] = ["PENDING_PAYMENT", "AWAITING_CONFIRMATION"];

export function allowedTransitions(from: OrderStatus, actor: TransitionActor): OrderStatus[] {
  const moves = TRANSITIONS[from] ?? {};
  return (Object.keys(moves) as OrderStatus[]).filter((to) => moves[to]?.includes(actor));
}

export function canTransition(from: OrderStatus, to: OrderStatus, actor: TransitionActor): boolean {
  return TRANSITIONS[from]?.[to]?.includes(actor) ?? false;
}

/**
 * Throws unless the move is legal for this actor. Every status change in the project goes through here —
 * nothing writes `status` directly.
 */
export function assertTransition(from: OrderStatus, to: OrderStatus, actor: TransitionActor): void {
  if (from === to) {
    throw new AppError(409, "INVALID_TRANSITION", `This order is already ${label(to)}.`);
  }
  if (!canTransition(from, to, actor)) {
    throw new AppError(
      409,
      "INVALID_TRANSITION",
      `An order that is ${label(from)} cannot become ${label(to)}.`,
    );
  }
}

function label(status: OrderStatus): string {
  return status.toLowerCase().replace(/_/g, " ");
}
