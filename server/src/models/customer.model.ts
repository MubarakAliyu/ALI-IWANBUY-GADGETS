import { NIGERIAN_STATES } from "@aib/shared";
import { model, Schema, type Types } from "mongoose";

/**
 * Customers (overview §7).
 *
 * The email address is the account's identity: it is stored lower-cased, uniquely indexed, and marked
 * `immutable`, so Mongoose silently drops it from any update — the route layer rejects the attempt outright
 * with `EMAIL_IMMUTABLE` rather than letting it look like it worked (CLAUDE.md non-negotiable, AC2.1).
 *
 * `tokenVersion` is bumped whenever a session must be invalidated — a password change, a suspension — and
 * every authenticated request compares it, so revocation is immediate (overview §6.4).
 */

export type AddressDoc = {
  _id: Types.ObjectId;
  label: string;
  fullName: string;
  phone: string;
  line1: string;
  line2: string;
  city: string;
  state: string;
  landmark: string;
  isDefault: boolean;
};

export type CustomerDoc = {
  _id: Types.ObjectId;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  passwordHash: string;
  tokenVersion: number;
  addresses: AddressDoc[];
  wishlist: Types.ObjectId[];
  status: "ACTIVE" | "SUSPENDED";
  lastLoginAt: Date | null;
  failedLogins: number;
  lockedUntil: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

const addressSchema = new Schema<AddressDoc>(
  {
    label: { type: String, default: "", trim: true, maxlength: 40 },
    fullName: { type: String, required: true, trim: true },
    phone: { type: String, required: true, trim: true },
    line1: { type: String, required: true, trim: true },
    line2: { type: String, default: "", trim: true },
    city: { type: String, required: true, trim: true },
    state: { type: String, required: true, enum: NIGERIAN_STATES },
    landmark: { type: String, default: "", trim: true },
    isDefault: { type: Boolean, default: false },
  },
  { _id: true },
);

const customerSchema = new Schema<CustomerDoc>(
  {
    firstName: { type: String, required: true, trim: true, maxlength: 60 },
    lastName: { type: String, required: true, trim: true, maxlength: 60 },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      immutable: true,
    },
    phone: { type: String, default: "", trim: true },
    passwordHash: { type: String, required: true },
    tokenVersion: { type: Number, default: 0 },
    addresses: { type: [addressSchema], default: [] },
    wishlist: { type: [{ type: Schema.Types.ObjectId, ref: "Product" }], default: [] },
    status: { type: String, enum: ["ACTIVE", "SUSPENDED"], default: "ACTIVE", index: true },
    lastLoginAt: { type: Date, default: null },
    failedLogins: { type: Number, default: 0 },
    lockedUntil: { type: Date, default: null },
  },
  { timestamps: true },
);

/**
 * `immutable` only covers the document paths Mongoose builds from a save. A query-level `$set` would slip past
 * it, so the update hooks strip `email` from every update as well — there is no route through this model that
 * changes an address someone's orders are filed under.
 */
for (const hook of ["updateOne", "findOneAndUpdate", "updateMany"] as const) {
  customerSchema.pre(hook, function stripEmail() {
    const update = this.getUpdate() as Record<string, unknown> | null;
    if (!update) {
      return;
    }
    delete update.email;
    const set = update.$set as Record<string, unknown> | undefined;
    if (set) {
      delete set.email;
    }
  });
}

export const Customer = model<CustomerDoc>("Customer", customerSchema);
