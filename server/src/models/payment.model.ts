import { PAYMENT_METHOD, type PaymentMethod } from "@aib/shared";
import { model, Schema, type Types } from "mongoose";

/**
 * Payments and refunds (overview §7). A `Payment` is only ever written by an admin confirming money received,
 * with their own PIN — which is Batch 3. The model exists now so an order can be linked to one, and so the
 * collection and its index are in place before any money is recorded against them.
 */
export type PaymentDoc = {
  _id: Types.ObjectId;
  paymentNumber: string;
  order: Types.ObjectId;
  customer: Types.ObjectId;
  amountKobo: number;
  method: PaymentMethod;
  reference: string | null;
  status: "CONFIRMED" | "REFUNDED";
  confirmedBy: Types.ObjectId | null;
  confirmedAt: Date;
  note: string | null;
  refundOf: Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
};

const paymentSchema = new Schema<PaymentDoc>(
  {
    paymentNumber: { type: String, required: true, unique: true },
    order: { type: Schema.Types.ObjectId, ref: "Order", required: true },
    customer: { type: Schema.Types.ObjectId, ref: "Customer", required: true },
    amountKobo: { type: Number, required: true, min: 0 },
    method: { type: String, enum: PAYMENT_METHOD, required: true },
    reference: { type: String, default: null },
    status: { type: String, enum: ["CONFIRMED", "REFUNDED"], default: "CONFIRMED" },
    confirmedBy: { type: Schema.Types.ObjectId, ref: "Admin", default: null },
    confirmedAt: { type: Date, required: true },
    note: { type: String, default: null },
    refundOf: { type: Schema.Types.ObjectId, ref: "Payment", default: null },
  },
  { timestamps: true },
);

paymentSchema.index({ confirmedAt: -1 });

export const Payment = model<PaymentDoc>("Payment", paymentSchema);
