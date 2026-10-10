import { model, Schema, type Types } from "mongoose";

/**
 * Store settings (overview §5, §7) — one document for the whole shop. The owner edits it in admin; the
 * storefront reads the public half of it for the footer, contact page and checkout.
 */
export type SettingDoc = {
  _id: Types.ObjectId;
  storeName: string;
  legalName: string;
  rcNumber: string;
  tin: string;
  registeredAddress: string;
  shopAddress: string;
  phone: string;
  whatsapp: string;
  email: string;
  bank: { bankName: string; accountName: string; accountNumber: string };
  openingHours: { days: string; opens: string; closes: string }[];
  deliveryFees: { localKobo: number; nationwideKobo: number };
  freeDeliveryThresholdKobo: number | null;
  unpaidAutoCancelHours: number;
  lowStockDefault: number;
  invoiceFooterNote: string;
  createdAt: Date;
  updatedAt: Date;
};

const settingSchema = new Schema<SettingDoc>(
  {
    storeName: { type: String, required: true },
    legalName: { type: String, required: true },
    rcNumber: { type: String, required: true },
    tin: { type: String, required: true },
    registeredAddress: { type: String, required: true },
    shopAddress: { type: String, required: true },
    phone: { type: String, required: true },
    whatsapp: { type: String, required: true },
    email: { type: String, required: true },
    bank: {
      bankName: { type: String, default: "" },
      accountName: { type: String, default: "" },
      accountNumber: { type: String, default: "" },
    },
    openingHours: {
      type: [new Schema({ days: String, opens: String, closes: String }, { _id: false })],
      default: [],
    },
    deliveryFees: {
      localKobo: { type: Number, default: 0, min: 0 },
      nationwideKobo: { type: Number, default: 0, min: 0 },
    },
    freeDeliveryThresholdKobo: { type: Number, default: null },
    unpaidAutoCancelHours: { type: Number, default: 48, min: 1 },
    lowStockDefault: { type: Number, default: 3, min: 0 },
    invoiceFooterNote: { type: String, default: "Clean. Modern. Reliable." },
  },
  { timestamps: true },
);

export const Setting = model<SettingDoc>("Setting", settingSchema);
