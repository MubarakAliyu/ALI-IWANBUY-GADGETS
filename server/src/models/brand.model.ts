import { model, Schema, type Types } from "mongoose";

/**
 * Brands (overview §7). `code` is the three-letter prefix of every SKU this brand's variants are given
 * (`APL-13PM-256-0007`), so it is stored here rather than derived at write time.
 */
export type BrandDoc = {
  _id: Types.ObjectId;
  name: string;
  slug: string;
  code: string;
  logo: string | null;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};

const brandSchema = new Schema<BrandDoc>(
  {
    name: { type: String, required: true, trim: true, maxlength: 60 },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    code: { type: String, required: true, uppercase: true, trim: true, minlength: 3, maxlength: 3 },
    logo: { type: String, default: null },
    isActive: { type: Boolean, default: true, index: true },
  },
  { timestamps: true },
);

brandSchema.index({ isActive: 1, name: 1 });

export const Brand = model<BrandDoc>("Brand", brandSchema);
