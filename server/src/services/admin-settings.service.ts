/**
 * Store settings and the audit trail (overview §10 A-12, A-13).
 *
 * Settings are a single document the whole project reads: the storefront's footer, the checkout's bank
 * details and the invoice PDF all come from here, so changing it changes the shop everywhere at once — which
 * is exactly why every change is audited field by field.
 *
 * The audit trail has no write path. There is no service function that edits or deletes a row, and the model
 * throws on every update and delete hook; this file only reads it.
 */

import type { AuditQuery, AuditRow, StoreSettingsInput } from "@aib/shared";
import type { Request } from "express";
import type { FilterQuery } from "mongoose";
import { AppError } from "../lib/app-error.js";
import { lagosDayEnd, lagosDayStart } from "../lib/dates.js";
import { paginate, skipFor, type Paginated } from "../lib/pagination.js";
import { AuditLog, Setting, type AuditLogDoc, type SettingDoc } from "../models/index.js";
import type { SignedInAdmin } from "../middleware/require-admin.js";
import { recordAudit } from "./audit.service.js";

export async function getSettings(): Promise<SettingDoc> {
  const setting = await Setting.findOne().lean().exec();
  if (!setting) {
    throw new AppError(503, "NOT_SET_UP", "The store has not been set up yet. Run `pnpm seed`.");
  }
  return setting;
}

export async function updateSettings(
  input: StoreSettingsInput,
  admin: SignedInAdmin,
  req?: Request,
): Promise<SettingDoc> {
  const setting = await Setting.findOne().exec();
  if (!setting) {
    throw new AppError(503, "NOT_SET_UP", "The store has not been set up yet. Run `pnpm seed`.");
  }

  // Only the fields that actually moved reach the audit row, which is what makes the trail readable.
  const before = {
    storeName: setting.storeName,
    registeredAddress: setting.registeredAddress,
    shopAddress: setting.shopAddress,
    phone: setting.phone,
    whatsapp: setting.whatsapp,
    email: setting.email,
    bankName: setting.bank.bankName,
    accountName: setting.bank.accountName,
    accountNumber: setting.bank.accountNumber,
    localKobo: setting.deliveryFees.localKobo,
    nationwideKobo: setting.deliveryFees.nationwideKobo,
    freeDeliveryThresholdKobo: setting.freeDeliveryThresholdKobo,
    unpaidAutoCancelHours: setting.unpaidAutoCancelHours,
    lowStockDefault: setting.lowStockDefault,
  };

  setting.set(input);
  await setting.save();

  await recordAudit({
    actorType: "ADMIN",
    actor: admin._id,
    actorName: `${admin.firstName} ${admin.lastName}`,
    action: "SETTINGS_UPDATED",
    entityType: "Setting",
    entityId: setting._id,
    summary: "Updated the store settings",
    before,
    after: {
      storeName: input.storeName,
      registeredAddress: input.registeredAddress,
      shopAddress: input.shopAddress,
      phone: input.phone,
      whatsapp: input.whatsapp,
      email: input.email,
      bankName: input.bank.bankName,
      accountName: input.bank.accountName,
      accountNumber: input.bank.accountNumber,
      localKobo: input.deliveryFees.localKobo,
      nationwideKobo: input.deliveryFees.nationwideKobo,
      freeDeliveryThresholdKobo: input.freeDeliveryThresholdKobo,
      unpaidAutoCancelHours: input.unpaidAutoCancelHours,
      lowStockDefault: input.lowStockDefault,
    },
    ...(req ? { req } : {}),
  });

  return setting.toObject() as SettingDoc;
}

// ── The audit trail (read-only, by construction) ────────────────────────────────────────────────────

export async function listAudit(query: AuditQuery): Promise<Paginated<AuditRow>> {
  const filter: FilterQuery<AuditLogDoc> = {};

  if (query.action) {
    filter.action = query.action;
  }
  if (query.entityType) {
    filter.entityType = query.entityType;
  }
  if (query.actorType) {
    filter.actorType = query.actorType;
  }
  if (query.actor) {
    filter.actor = query.actor;
  }

  const from = query.from ? lagosDayStart(query.from) : null;
  const to = query.to ? lagosDayEnd(query.to) : null;
  if (from || to) {
    filter.at = { ...(from ? { $gte: from } : {}), ...(to ? { $lte: to } : {}) };
  }

  const term = query.q?.trim();
  if (term) {
    const pattern = new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    filter.$or = [{ summary: pattern }, { actorName: pattern }, { entityId: pattern }];
  }

  const page = Math.max(1, query.page ?? 1);
  const limit = query.limit ?? 50;

  const [rows, total] = await Promise.all([
    AuditLog.find(filter).sort({ at: -1 }).skip(skipFor(page, limit)).limit(limit).lean().exec(),
    AuditLog.countDocuments(filter).exec(),
  ]);

  return paginate(
    rows.map((row): AuditRow => ({
      id: row._id.toString(),
      at: row.at.toISOString(),
      actorType: row.actorType,
      actorName: row.actorName,
      actor: row.actor ? row.actor.toString() : null,
      action: row.action,
      entityType: row.entityType,
      entityId: row.entityId,
      summary: row.summary,
      diff: row.diff,
      ip: row.ip,
    })),
    total,
    page,
    limit,
  );
}

/** The distinct actions and entity types actually present, so the filters offer only what exists. */
export async function auditFilters(): Promise<{ actions: string[]; entityTypes: string[] }> {
  const [actions, entityTypes] = await Promise.all([
    AuditLog.distinct("action").exec(),
    AuditLog.distinct("entityType").exec(),
  ]);
  return {
    actions: (actions as string[]).sort(),
    entityTypes: (entityTypes as string[]).sort(),
  };
}
