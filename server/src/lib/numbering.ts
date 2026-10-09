/**
 * Human-readable numbers (overview §6.6): `AIB-ORD-202610-0001`, `AIB-INV-202610-0001`,
 * `AIB-PAY-202610-0001`. The sequence restarts each month and comes from an atomic `$inc` on a single counter
 * document, so two requests can never be handed the same number — even under a flood of concurrent checkouts.
 */

import type { ClientSession } from "mongoose";
import { Counter } from "../models/counter.model.js";
import { lagosYearMonth } from "./dates.js";

export const NUMBER_KIND = { order: "ORD", invoice: "INV", payment: "PAY" } as const;
export type NumberKind = keyof typeof NUMBER_KIND;

const PREFIX = "AIB";
const SEQUENCE_DIGITS = 4;

/** The next number for `kind` in the month of `at` (Africa/Lagos), reserving it atomically. */
export async function nextNumber(
  kind: NumberKind,
  options: { at?: Date; session?: ClientSession } = {},
): Promise<string> {
  const period = lagosYearMonth(options.at ?? new Date());
  const counterId = `${kind}-${period}`;

  const counter = await Counter.findByIdAndUpdate(
    counterId,
    { $inc: { seq: 1 } },
    { new: true, upsert: true, ...(options.session ? { session: options.session } : {}) },
  )
    .lean()
    .exec();

  const seq = counter?.seq ?? 1;
  return `${PREFIX}-${NUMBER_KIND[kind]}-${period}-${String(seq).padStart(SEQUENCE_DIGITS, "0")}`;
}
