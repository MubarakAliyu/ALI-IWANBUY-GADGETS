/**
 * Unpaid bank-transfer orders hold stock that nobody has paid for (overview §8). This job releases it: every
 * fifteen minutes it cancels orders still in `PENDING_PAYMENT` after the window the owner set in Store
 * Settings, puts the items back on the shelf, and tells the customer.
 *
 * The work is a plain exported function so tests can call it directly; only `index.ts` starts the timer, never
 * `app.ts` — a test that mounts the app must not acquire a background interval.
 */

import { logger } from "../lib/logger.js";
import { loadSettings } from "../lib/settings.js";
import { Order } from "../models/index.js";
import { cancelOrder } from "../services/order.service.js";

const EVERY_MS = 15 * 60 * 1000;

/** Cancel everything that has run out of time. Returns the order numbers it cancelled. */
export async function runAutoCancel(now: Date = new Date()): Promise<string[]> {
  const settings = await loadSettings();
  const cutoff = new Date(now.getTime() - settings.unpaidAutoCancelHours * 60 * 60 * 1000);

  const stale = await Order.find({ status: "PENDING_PAYMENT", placedAt: { $lte: cutoff } })
    .select("orderNumber")
    .lean()
    .exec();

  const cancelled: string[] = [];
  for (const order of stale) {
    try {
      await cancelOrder(
        order.orderNumber,
        { type: "SYSTEM", id: null, name: "Auto-cancel" },
        { reason: `No payment received within ${settings.unpaidAutoCancelHours} hours` },
      );
      cancelled.push(order.orderNumber);
    } catch (error) {
      // One stubborn order must not stop the rest of the sweep.
      logger.error({ err: error, orderNumber: order.orderNumber }, "Could not auto-cancel an order");
    }
  }

  if (cancelled.length > 0) {
    logger.info({ cancelled }, "Auto-cancelled unpaid orders");
  }
  return cancelled;
}

/** Starts the sweep and returns a stop function, so a shutdown can clear it. */
export function startAutoCancelJob(): () => void {
  const timer = setInterval(() => {
    void runAutoCancel().catch((error: unknown) => {
      logger.error({ err: error }, "The auto-cancel sweep failed");
    });
  }, EVERY_MS);

  // An interval must never be the reason the process refuses to exit.
  timer.unref();
  return () => clearInterval(timer);
}
