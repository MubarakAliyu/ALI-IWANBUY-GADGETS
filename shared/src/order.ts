/**
 * Checkout and orders (overview §7, §8, §9 S-9 to S-11).
 *
 * The checkout request carries what the customer chose — the delivery method, the address, how they will pay —
 * and the lines only as product, variant and quantity. It never carries a price: the server prices every order
 * from the database (AC2.3).
 */

import { z } from "zod";
import { addressDtoSchema, addressSchema } from "./account.js";
import { objectIdSchema, openingHoursSchema, slugSchema } from "./catalog.js";
import { DELIVERY_METHOD, ORDER_STATUS, PAYMENT_METHOD, PAYMENT_STATUS } from "./enums.js";

export const checkoutLineSchema = z.object({
  productId: objectIdSchema,
  variantId: objectIdSchema,
  qty: z.number().int().min(1).max(99),
});
export type CheckoutLine = z.infer<typeof checkoutLineSchema>;

export const placeOrderSchema = z
  .object({
    items: z.array(checkoutLineSchema).min(1, "Your cart is empty").max(50),
    deliveryMethod: z.enum(DELIVERY_METHOD),
    paymentMethod: z.enum(PAYMENT_METHOD),
    /** An existing saved address. Ignored when `newAddress` is given, and not needed for pickup. */
    addressId: objectIdSchema.optional(),
    /** A new address typed at checkout; saved to the customer's address book if `saveAddress` is set. */
    newAddress: addressSchema.optional(),
    saveAddress: z.boolean().optional(),
    note: z.string().trim().max(500).optional(),
  })
  .refine((value) => value.deliveryMethod === "PICKUP" || Boolean(value.addressId ?? value.newAddress), {
    message: "Choose where we should deliver",
    path: ["addressId"],
  });
export type PlaceOrderInput = z.infer<typeof placeOrderSchema>;

export const orderItemSchema = z.object({
  productId: objectIdSchema,
  variantId: objectIdSchema,
  name: z.string(),
  slug: slugSchema,
  variantLabel: z.string(),
  sku: z.string(),
  image: z.string().nullable(),
  unitPriceKobo: z.number().int().min(0),
  qty: z.number().int().min(1),
  lineTotalKobo: z.number().int().min(0),
});
export type OrderItem = z.infer<typeof orderItemSchema>;

export const statusEventSchema = z.object({
  status: z.enum(ORDER_STATUS),
  at: z.string(),
  by: z.string(),
  note: z.string().nullable(),
});
export type StatusEvent = z.infer<typeof statusEventSchema>;

export const orderSummarySchema = z.object({
  orderNumber: z.string(),
  status: z.enum(ORDER_STATUS),
  paymentStatus: z.enum(PAYMENT_STATUS),
  paymentMethod: z.enum(PAYMENT_METHOD),
  deliveryMethod: z.enum(DELIVERY_METHOD),
  itemCount: z.number().int().min(0),
  totalKobo: z.number().int().min(0),
  placedAt: z.string(),
});
export type OrderSummary = z.infer<typeof orderSummarySchema>;

export const orderDetailSchema = orderSummarySchema.extend({
  items: z.array(orderItemSchema),
  subtotalKobo: z.number().int().min(0),
  deliveryFeeKobo: z.number().int().min(0),
  shippingAddress: addressDtoSchema.nullable(),
  customerTransferRef: z.string().nullable(),
  note: z.string().nullable(),
  cancelledReason: z.string().nullable(),
  statusHistory: z.array(statusEventSchema),
  hasInvoice: z.boolean(),
  paidAt: z.string().nullable(),
  completedAt: z.string().nullable(),
});
export type OrderDetail = z.infer<typeof orderDetailSchema>;

export const orderListResponseSchema = z.object({
  data: z.array(orderSummarySchema),
  page: z.number().int().min(1),
  limit: z.number().int().min(1),
  total: z.number().int().min(0),
  pages: z.number().int().min(0),
});
export type OrderListResponse = z.infer<typeof orderListResponseSchema>;

export const transferMadeSchema = z.object({
  reference: z.string().trim().max(60).optional(),
});
export type TransferMadeInput = z.infer<typeof transferMadeSchema>;

export const cancelOrderSchema = z.object({
  reason: z.string().trim().max(200).optional(),
});
export type CancelOrderInput = z.infer<typeof cancelOrderSchema>;

/** What checkout needs to show before anything is placed: the fees and where to collect. */
export const checkoutSettingsSchema = z.object({
  deliveryFees: z.object({
    localKobo: z.number().int().min(0),
    nationwideKobo: z.number().int().min(0),
  }),
  freeDeliveryThresholdKobo: z.number().int().min(0).nullable(),
  pickupAddress: z.string(),
  /** So the success page can tell a customer who to call if the bank details are not published yet. */
  phone: z.string(),
  openingHours: z.array(openingHoursSchema),
  bank: z.object({ bankName: z.string(), accountName: z.string(), accountNumber: z.string() }),
});
export type CheckoutSettings = z.infer<typeof checkoutSettingsSchema>;

/** The server cart (overview §7). Prices always come from here, never from the browser. */
export const serverCartSchema = z.object({
  items: z.array(
    z.object({
      productId: objectIdSchema,
      variantId: objectIdSchema,
      name: z.string(),
      slug: slugSchema,
      variantLabel: z.string(),
      sku: z.string(),
      image: z.string().nullable(),
      unitPriceKobo: z.number().int().min(0),
      qty: z.number().int().min(1),
      stock: z.number().int().min(0),
      lineTotalKobo: z.number().int().min(0),
    }),
  ),
  subtotalKobo: z.number().int().min(0),
});
export type ServerCart = z.infer<typeof serverCartSchema>;

export const saveCartSchema = z.object({
  items: z.array(checkoutLineSchema).max(50),
});
export type SaveCartInput = z.infer<typeof saveCartSchema>;
