import { model, Schema, type Types } from "mongoose";

/**
 * Invoices (overview §7). One is issued automatically the moment a payment is confirmed, so every paid order
 * has a document behind it. `pdfPath` is where the rendered A4 file lives — local disk in development, the
 * storage provider in production.
 *
 * `sentAt` is a list, not a flag: a customer who asks for the invoice again gets it again, and the record
 * shows every time it went.
 */
export type InvoiceDoc = {
  _id: Types.ObjectId;
  invoiceNumber: string;
  order: Types.ObjectId;
  customer: Types.ObjectId;
  issuedBy: Types.ObjectId | null;
  issuedAt: Date;
  totalKobo: number;
  pdfPath: string;
  sentAt: Date[];
  status: "ISSUED" | "SENT" | "VOID";
  voidReason: string | null;
  createdAt: Date;
  updatedAt: Date;
};

const invoiceSchema = new Schema<InvoiceDoc>(
  {
    invoiceNumber: { type: String, required: true, unique: true },
    order: { type: Schema.Types.ObjectId, ref: "Order", required: true, index: true },
    customer: { type: Schema.Types.ObjectId, ref: "Customer", required: true },
    issuedBy: { type: Schema.Types.ObjectId, ref: "Admin", default: null },
    issuedAt: { type: Date, required: true },
    totalKobo: { type: Number, required: true, min: 0 },
    pdfPath: { type: String, default: "" },
    sentAt: { type: [Date], default: [] },
    status: { type: String, enum: ["ISSUED", "SENT", "VOID"], default: "ISSUED", index: true },
    voidReason: { type: String, default: null },
  },
  { timestamps: true },
);

invoiceSchema.index({ issuedAt: -1 });

export const Invoice = model<InvoiceDoc>("Invoice", invoiceSchema);
