import { model, Schema, type Types } from "mongoose";

/**
 * The server-side cart of a signed-in customer (overview §7). It holds only what was chosen — product,
 * variant and quantity — because every price is read from the catalogue when the cart is shown or an order is
 * placed. A guest's cart lives in their browser and is merged into this one at sign-in.
 */
export type CartDoc = {
  _id: Types.ObjectId;
  customer: Types.ObjectId;
  items: { product: Types.ObjectId; variantId: Types.ObjectId; qty: number }[];
  createdAt: Date;
  updatedAt: Date;
};

const cartSchema = new Schema<CartDoc>(
  {
    customer: { type: Schema.Types.ObjectId, ref: "Customer", required: true, unique: true },
    items: {
      type: [
        new Schema(
          {
            product: { type: Schema.Types.ObjectId, ref: "Product", required: true },
            variantId: { type: Schema.Types.ObjectId, required: true },
            qty: { type: Number, required: true, min: 1, max: 99 },
          },
          { _id: false },
        ),
      ],
      default: [],
    },
  },
  { timestamps: true },
);

export const Cart = model<CartDoc>("Cart", cartSchema);
