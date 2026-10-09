import { model, Schema, type Types } from "mongoose";

/**
 * Categories are at most two levels deep (overview §7): a top-level category, optionally with children.
 * Nothing is deleted — `isActive` hides a category from the storefront while its products keep their link.
 */
export type CategoryDoc = {
  _id: Types.ObjectId;
  name: string;
  slug: string;
  parent: Types.ObjectId | null;
  image: string | null;
  sortOrder: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};

const categorySchema = new Schema<CategoryDoc>(
  {
    name: { type: String, required: true, trim: true, maxlength: 80 },
    slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
    parent: { type: Schema.Types.ObjectId, ref: "Category", default: null, index: true },
    image: { type: String, default: null },
    sortOrder: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true, index: true },
  },
  { timestamps: true },
);

categorySchema.index({ isActive: 1, sortOrder: 1 });

export const Category = model<CategoryDoc>("Category", categorySchema);
