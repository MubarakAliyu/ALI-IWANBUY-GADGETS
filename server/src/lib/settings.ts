/**
 * Store settings, read once per request that needs them. Delivery fees, the free-delivery threshold and the
 * bank account all live in the database so the owner can change them without a deploy (overview §5, §7).
 */

import type { ClientSession } from "mongoose";
import { AppError } from "./app-error.js";
import { Setting, type SettingDoc } from "../models/index.js";
import type { CompanyBlock } from "./mailer/layout.js";

export async function loadSettings(session?: ClientSession): Promise<SettingDoc> {
  const query = Setting.findOne();
  if (session) {
    query.session(session);
  }
  const setting = await query.lean().exec();
  if (!setting) {
    throw new AppError(503, "NOT_SET_UP", "The store has not been set up yet. Run `pnpm seed`.");
  }
  return setting;
}

/** The company block every email footer carries. */
export function companyBlock(setting: SettingDoc): CompanyBlock {
  return {
    storeName: setting.storeName,
    legalName: setting.legalName,
    rcNumber: setting.rcNumber,
    phone: setting.phone,
    email: setting.email,
    address: setting.registeredAddress,
  };
}

/**
 * What delivery costs for this basket (overview §9 S-9): pickup is always free, and an order over the
 * free-delivery threshold ships at no charge.
 */
export function deliveryFeeKobo(
  setting: SettingDoc,
  method: "PICKUP" | "LOCAL_DELIVERY" | "NATIONWIDE",
  subtotalKobo: number,
): number {
  if (method === "PICKUP") {
    return 0;
  }
  const threshold = setting.freeDeliveryThresholdKobo;
  if (threshold !== null && threshold > 0 && subtotalKobo >= threshold) {
    return 0;
  }
  return method === "LOCAL_DELIVERY" ? setting.deliveryFees.localKobo : setting.deliveryFees.nationwideKobo;
}
