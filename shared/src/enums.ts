/**
 * The vocabulary both sides of the wire agree on (overview §7, §8). Each list is the single definition of its
 * values: Mongoose enums, zod schemas, badge maps and the lifecycle table all read from here.
 */

export const PRODUCT_STATUS = ["DRAFT", "ACTIVE", "ARCHIVED"] as const;
export type ProductStatus = (typeof PRODUCT_STATUS)[number];

export const PRODUCT_CONDITION = ["NEW", "UK_USED", "REFURBISHED"] as const;
export type ProductCondition = (typeof PRODUCT_CONDITION)[number];

/** What each status is called in the dashboard — the storefront never shows anything but ACTIVE. */
export const PRODUCT_STATUS_LABEL: Record<ProductStatus, string> = {
  DRAFT: "Draft",
  ACTIVE: "In the shop",
  ARCHIVED: "Archived",
};

export const CONDITION_LABEL: Record<ProductCondition, string> = {
  NEW: "Brand new",
  UK_USED: "UK used",
  REFURBISHED: "Refurbished",
};

/** Order lifecycle (overview §8). The transition table itself lives on the server. */
export const ORDER_STATUS = [
  "PENDING_PAYMENT",
  "AWAITING_CONFIRMATION",
  "PAID",
  "PROCESSING",
  "READY_FOR_PICKUP",
  "SHIPPED",
  "DELIVERED",
  "COMPLETED",
  "CANCELLED",
  "REFUNDED",
] as const;
export type OrderStatus = (typeof ORDER_STATUS)[number];

export const ORDER_STATUS_LABEL: Record<OrderStatus, string> = {
  PENDING_PAYMENT: "Pending payment",
  AWAITING_CONFIRMATION: "Awaiting confirmation",
  PAID: "Paid",
  PROCESSING: "Processing",
  READY_FOR_PICKUP: "Ready for pickup",
  SHIPPED: "Shipped",
  DELIVERED: "Delivered",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
  REFUNDED: "Refunded",
};

export const PAYMENT_STATUS = ["UNPAID", "AWAITING_CONFIRMATION", "PAID", "REFUNDED"] as const;
export type PaymentStatus = (typeof PAYMENT_STATUS)[number];

export const PAYMENT_STATUS_LABEL: Record<PaymentStatus, string> = {
  UNPAID: "Unpaid",
  AWAITING_CONFIRMATION: "Awaiting confirmation",
  PAID: "Paid",
  REFUNDED: "Refunded",
};

export const PAYMENT_METHOD = ["BANK_TRANSFER", "PAY_ON_DELIVERY"] as const;
export type PaymentMethod = (typeof PAYMENT_METHOD)[number];

export const DELIVERY_METHOD = ["PICKUP", "LOCAL_DELIVERY", "NATIONWIDE"] as const;
export type DeliveryMethod = (typeof DELIVERY_METHOD)[number];

export const PRODUCT_SORT = ["newest", "price-asc", "price-desc", "name"] as const;
export type ProductSort = (typeof PRODUCT_SORT)[number];

export const PRODUCT_SORT_LABEL: Record<ProductSort, string> = {
  newest: "Newest first",
  "price-asc": "Price: low to high",
  "price-desc": "Price: high to low",
  name: "Name A to Z",
};
