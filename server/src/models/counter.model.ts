import { model, Schema } from "mongoose";

/**
 * Monthly sequences for human-readable numbers (overview §6.6). One document per kind and month, e.g.
 * `order-202610`. Only `lib/numbering.ts` touches it, and only through an atomic `$inc`.
 */
export type CounterDoc = {
  _id: string;
  seq: number;
};

const counterSchema = new Schema<CounterDoc>(
  {
    _id: { type: String, required: true },
    seq: { type: Number, required: true, default: 0 },
  },
  { versionKey: false },
);

export const Counter = model<CounterDoc>("Counter", counterSchema);
