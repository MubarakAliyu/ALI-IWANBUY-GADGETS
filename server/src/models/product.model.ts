import { PRODUCT_CONDITION, PRODUCT_STATUS, type ProductCondition, type ProductStatus } from "@aib/shared";
import { model, Schema, type HydratedDocument, type Types } from "mongoose";

/**
 * Products and their variants (overview §7). A product is never priced directly: every price and every unit of
 * stock belongs to a variant, and the list endpoints read the denormalised `priceFromKobo`, `compareAtPriceKobo`
 * and `totalStock` that the pre-save hook keeps in step (ADR-009).
 *
 * `brandName` is denormalised too, so search can match a brand without a join; a brand rename has to rewrite it
 * (noted for the admin batch).
 */

export type VariantDoc = {
  _id: Types.ObjectId;
  sku: string;
  label: string;
  attributes: { storage: string | null; colour: string | null; ram: string | null };
  priceKobo: number;
  compareAtPriceKobo: number | null;
  stock: number;
  lowStockThreshold: number;
  isActive: boolean;
};

export type ProductImageDoc = {
  url: string;
  alt: string;
  sortOrder: number;
};

export type ProductDoc = {
  _id: Types.ObjectId;
  name: string;
  slug: string;
  brand: Types.ObjectId;
  brandName: string;
  category: Types.ObjectId;
  shortDescription: string;
  description: string;
  highlights: string[];
  specs: { label: string; value: string }[];
  images: ProductImageDoc[];
  condition: ProductCondition;
  warrantyMonths: number;
  tags: string[];
  isFeatured: boolean;
  isNewArrival: boolean;
  status: ProductStatus;
  variants: VariantDoc[];
  priceFromKobo: number;
  compareAtPriceKobo: number | null;
  totalStock: number;
  createdAt: Date;
  updatedAt: Date;
};

const variantSchema = new Schema<VariantDoc>(
  {
    sku: { type: String, required: true, uppercase: true, trim: true },
    label: { type: String, required: true, trim: true, maxlength: 80 },
    attributes: {
      storage: { type: String, default: null },
      colour: { type: String, default: null },
      ram: { type: String, default: null },
    },
    priceKobo: { type: Number, required: true, min: 0, validate: Number.isInteger },
    compareAtPriceKobo: { type: Number, default: null, min: 0, validate: isNullableInteger },
    stock: { type: Number, required: true, min: 0, default: 0, validate: Number.isInteger },
    lowStockThreshold: { type: Number, required: true, min: 0, default: 3, validate: Number.isInteger },
    isActive: { type: Boolean, default: true },
  },
  { _id: true },
);

const productSchema = new Schema<ProductDoc>(
  {
    name: { type: String, required: true, trim: true, maxlength: 140 },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    brand: { type: Schema.Types.ObjectId, ref: "Brand", required: true },
    brandName: { type: String, required: true, trim: true },
    category: { type: Schema.Types.ObjectId, ref: "Category", required: true },
    shortDescription: { type: String, default: "", maxlength: 240 },
    description: { type: String, default: "" },
    highlights: { type: [String], default: [] },
    specs: {
      type: [new Schema({ label: String, value: String }, { _id: false })],
      default: [],
    },
    images: {
      type: [
        new Schema<ProductImageDoc>(
          {
            url: { type: String, required: true },
            alt: { type: String, default: "" },
            sortOrder: { type: Number, default: 0 },
          },
          { _id: false },
        ),
      ],
      default: [],
    },
    condition: { type: String, enum: PRODUCT_CONDITION, default: "NEW" },
    warrantyMonths: { type: Number, default: 0, min: 0 },
    tags: { type: [String], default: [] },
    isFeatured: { type: Boolean, default: false },
    isNewArrival: { type: Boolean, default: false },
    status: { type: String, enum: PRODUCT_STATUS, default: "DRAFT", index: true },
    variants: { type: [variantSchema], default: [] },

    // Denormalised from `variants` by the hook below — never written by hand.
    priceFromKobo: { type: Number, default: 0, min: 0 },
    compareAtPriceKobo: { type: Number, default: null },
    totalStock: { type: Number, default: 0, min: 0 },
  },
  { timestamps: true },
);

productSchema.index({ status: 1, category: 1 });
productSchema.index({ status: 1, brand: 1 });
productSchema.index({ status: 1, priceFromKobo: 1 });
productSchema.index({ status: 1, createdAt: -1 });
productSchema.index({ status: 1, isFeatured: 1 });
productSchema.index({ status: 1, isNewArrival: 1 });
productSchema.index({ "variants.sku": 1 }, { unique: true, sparse: true });

/** The summary fields every listing reads, recomputed from the active variants. */
export function summariseVariants(variants: readonly VariantDoc[]): {
  priceFromKobo: number;
  compareAtPriceKobo: number | null;
  totalStock: number;
} {
  const active = variants.filter((variant) => variant.isActive);
  const considered = active.length > 0 ? active : variants;
  if (considered.length === 0) {
    return { priceFromKobo: 0, compareAtPriceKobo: null, totalStock: 0 };
  }
  const cheapest = considered.reduce((lowest, variant) =>
    variant.priceKobo < lowest.priceKobo ? variant : lowest,
  );
  return {
    priceFromKobo: cheapest.priceKobo,
    compareAtPriceKobo: cheapest.compareAtPriceKobo ?? null,
    totalStock: active.reduce((sum, variant) => sum + variant.stock, 0),
  };
}

productSchema.pre("save", function syncVariantSummary(next) {
  const summary = summariseVariants(this.variants);
  this.priceFromKobo = summary.priceFromKobo;
  this.compareAtPriceKobo = summary.compareAtPriceKobo;
  this.totalStock = summary.totalStock;
  next();
});

function isNullableInteger(value: number | null): boolean {
  return value === null || Number.isInteger(value);
}

export type ProductHydrated = HydratedDocument<ProductDoc>;

export const Product = model<ProductDoc>("Product", productSchema);
