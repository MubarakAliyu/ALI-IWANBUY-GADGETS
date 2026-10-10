import { ADMIN_ROLES, type AdminRole } from "@aib/shared";
import { model, Schema, type Types } from "mongoose";

/**
 * Staff accounts (overview §7). Separate from `Customer` on purpose: a different cookie, a different signing
 * key, a different lockout, and a second secret — the payment PIN — that a customer has no equivalent of.
 *
 * `pinHash` is the second factor for money: confirming a payment, cancelling a paid order or issuing a refund
 * asks for it again even though the admin is already signed in (overview §6.5). It is hashed like a password
 * and never leaves the server.
 */
export type AdminDoc = {
  _id: Types.ObjectId;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  role: AdminRole;
  passwordHash: string;
  /** True for an account created by the owner: the first sign-in must choose a real password. */
  mustChangePassword: boolean;
  pinHash: string | null;
  pinFailed: number;
  pinLockedUntil: Date | null;
  tokenVersion: number;
  status: "ACTIVE" | "SUSPENDED";
  lastLoginAt: Date | null;
  failedLogins: number;
  lockedUntil: Date | null;
  createdBy: Types.ObjectId | null;
  createdAt: Date;
  updatedAt: Date;
};

const adminSchema = new Schema<AdminDoc>(
  {
    firstName: { type: String, required: true, trim: true, maxlength: 60 },
    lastName: { type: String, required: true, trim: true, maxlength: 60 },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, immutable: true },
    phone: { type: String, default: "", trim: true },
    role: { type: String, enum: ADMIN_ROLES, required: true, index: true },
    passwordHash: { type: String, required: true },
    mustChangePassword: { type: Boolean, default: false },
    pinHash: { type: String, default: null },
    pinFailed: { type: Number, default: 0 },
    pinLockedUntil: { type: Date, default: null },
    tokenVersion: { type: Number, default: 0 },
    status: { type: String, enum: ["ACTIVE", "SUSPENDED"], default: "ACTIVE", index: true },
    lastLoginAt: { type: Date, default: null },
    failedLogins: { type: Number, default: 0 },
    lockedUntil: { type: Date, default: null },
    createdBy: { type: Schema.Types.ObjectId, ref: "Admin", default: null },
  },
  { timestamps: true },
);

/** An admin's email identifies them in every audit row, so it is as immutable as a customer's. */
for (const hook of ["updateOne", "findOneAndUpdate", "updateMany"] as const) {
  adminSchema.pre(hook, function stripEmail() {
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

export const Admin = model<AdminDoc>("Admin", adminSchema);
