import {
  DELIVERY_METHOD,
  ORDER_STATUS,
  PAYMENT_METHOD,
  PAYMENT_STATUS,
  type DeliveryMethod,
  type OrderStatus,
  type PaymentMethod,
  type PaymentStatus,
} from "@aib/shared";
import { model, Schema, type Types } from "mongoose";

/**
 * Orders (overview §7, §8).
 *
 * Every line is a **snapshot**: the name, variant label, SKU, image and unit price as they were when the order
 * was placed. A later price change or a renamed product must never alter what someone agreed to pay, and an
 * archived product must still print on its invoice.
 *
 * `statusHistory` is append-only in practice — the lifecycle service adds an entry for every transition, and
 * nothing removes one.
 */

export type OrderItemDoc = {
  product: Types.ObjectId;
  variantId: Types.ObjectId;
  name: string;
  slug: string;
  variantLabel: string;
  sku: string;
  image: string | null;
  unitPriceKobo: number;
  qty: number;
  lineTotalKobo: number;
};

export type OrderAddressDoc = {
  label: string;
  fullName: string;
  phone: string;
  line1: string;
  line2: string;
  city: string;
  state: string;
  landmark: string;
};

export type StatusEventDoc = {
  status: OrderStatus;
  at: Date;
  by: Types.ObjectId | null;
  byType: "CUSTOMER" | "ADMIN" | "SYSTEM";
  byName: string;
  note: string | null;
};

export type OrderDoc = {
  _id: Types.ObjectId;
  orderNumber: string;
  customer: Types.ObjectId;
  items: OrderItemDoc[];
  subtotalKobo: number;
  deliveryFeeKobo: number;
  totalKobo: number;
  deliveryMethod: DeliveryMethod;
  shippingAddress: OrderAddressDoc | null;
  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  status: OrderStatus;
  customerTransferRef: string | null;
  note: string | null;
  statusHistory: StatusEventDoc[];
  invoice: Types.ObjectId | null;
  cancelledReason: string | null;
  placedAt: Date;
  paidAt: Date | null;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

const orderItemSchema = new Schema<OrderItemDoc>(
  {
    product: { type: Schema.Types.ObjectId, ref: "Product", required: true },
    variantId: { type: Schema.Types.ObjectId, required: true },
    name: { type: String, required: true },
    slug: { type: String, required: true },
    variantLabel: { type: String, required: true },
    sku: { type: String, required: true },
    image: { type: String, default: null },
    unitPriceKobo: { type: Number, required: true, min: 0 },
    qty: { type: Number, required: true, min: 1 },
    lineTotalKobo: { type: Number, required: true, min: 0 },
  },
  { _id: false },
);

const orderAddressSchema = new Schema<OrderAddressDoc>(
  {
    label: { type: String, default: "" },
    fullName: { type: String, required: true },
    phone: { type: String, required: true },
    line1: { type: String, required: true },
    line2: { type: String, default: "" },
    city: { type: String, required: true },
    state: { type: String, required: true },
    landmark: { type: String, default: "" },
  },
  { _id: false },
);

const statusEventSchema = new Schema<StatusEventDoc>(
  {
    status: { type: String, enum: ORDER_STATUS, required: true },
    at: { type: Date, required: true },
    by: { type: Schema.Types.ObjectId, default: null },
    byType: { type: String, enum: ["CUSTOMER", "ADMIN", "SYSTEM"], required: true },
    byName: { type: String, default: "" },
    note: { type: String, default: null },
  },
  { _id: false },
);

const orderSchema = new Schema<OrderDoc>(
  {
    orderNumber: { type: String, required: true, unique: true },
    customer: { type: Schema.Types.ObjectId, ref: "Customer", required: true },
    items: { type: [orderItemSchema], required: true },
    subtotalKobo: { type: Number, required: true, min: 0 },
    deliveryFeeKobo: { type: Number, required: true, min: 0 },
    totalKobo: { type: Number, required: true, min: 0 },
    deliveryMethod: { type: String, enum: DELIVERY_METHOD, required: true },
    shippingAddress: { type: orderAddressSchema, default: null },
    paymentMethod: { type: String, enum: PAYMENT_METHOD, required: true },
    paymentStatus: { type: String, enum: PAYMENT_STATUS, default: "UNPAID", index: true },
    status: { type: String, enum: ORDER_STATUS, required: true },
    customerTransferRef: { type: String, default: null },
    note: { type: String, default: null },
    statusHistory: { type: [statusEventSchema], default: [] },
    invoice: { type: Schema.Types.ObjectId, ref: "Invoice", default: null },
    cancelledReason: { type: String, default: null },
    placedAt: { type: Date, required: true },
    paidAt: { type: Date, default: null },
    completedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

orderSchema.index({ customer: 1, placedAt: -1 });
orderSchema.index({ status: 1, placedAt: -1 });

export const Order = model<OrderDoc>("Order", orderSchema);
