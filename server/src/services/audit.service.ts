/**
 * The audit trail (CLAUDE.md non-negotiable, overview §7). Every mutation and every security event goes
 * through here, which is also the only place that decides what a row may contain: changed fields only, with
 * anything sensitive redacted before it is written.
 *
 * Writing an audit row must never be the reason an otherwise good request fails, so a failure here is logged
 * and swallowed. Within a transaction the write joins the session, so a rolled-back order leaves no trace of
 * having happened.
 */

import type { ClientSession, Types } from "mongoose";
import type { Request } from "express";
import { logger } from "../lib/logger.js";
import { AuditLog, type AuditActorType } from "../models/index.js";

/** Field names whose values never appear in an audit row, whatever the caller passes. */
const REDACTED = new Set([
  "password",
  "newPassword",
  "currentPassword",
  "confirmPassword",
  "passwordHash",
  "pin",
  "pinHash",
  "token",
  "tokenVersion",
]);

export type AuditEntry = {
  actorType: AuditActorType;
  actor?: Types.ObjectId | string | null;
  actorName?: string;
  action: string;
  entityType: string;
  entityId?: Types.ObjectId | string | null;
  summary?: string;
  before?: Record<string, unknown>;
  after?: Record<string, unknown>;
  req?: Request;
  session?: ClientSession;
};

function redact(values: Record<string, unknown> | undefined): Record<string, unknown> | undefined {
  if (!values) {
    return undefined;
  }
  return Object.fromEntries(
    Object.entries(values).map(([key, value]) => [key, REDACTED.has(key) ? "[redacted]" : value]),
  );
}

/** Only the fields that actually changed, so a diff reads as an answer rather than a dump. */
function changedFields(
  before: Record<string, unknown> | undefined,
  after: Record<string, unknown> | undefined,
): { before?: Record<string, unknown>; after?: Record<string, unknown> } | null {
  if (!before && !after) {
    return null;
  }
  if (!before || !after) {
    return { ...(before ? { before: redact(before) } : {}), ...(after ? { after: redact(after) } : {}) };
  }

  const keys = [...new Set([...Object.keys(before), ...Object.keys(after)])].filter(
    (key) => JSON.stringify(before[key]) !== JSON.stringify(after[key]),
  );
  if (keys.length === 0) {
    return null;
  }
  return {
    before: redact(Object.fromEntries(keys.map((key) => [key, before[key]]))),
    after: redact(Object.fromEntries(keys.map((key) => [key, after[key]]))),
  };
}

export async function recordAudit(entry: AuditEntry): Promise<void> {
  try {
    await AuditLog.create(
      [
        {
          at: new Date(),
          actorType: entry.actorType,
          actor: entry.actor ?? null,
          actorName: entry.actorName ?? "",
          action: entry.action,
          entityType: entry.entityType,
          entityId: entry.entityId ? String(entry.entityId) : null,
          summary: entry.summary ?? "",
          diff: changedFields(entry.before, entry.after),
          ip: entry.req?.ip ?? null,
          userAgent: entry.req?.get("user-agent") ?? null,
        },
      ],
      entry.session ? { session: entry.session } : {},
    );
  } catch (error) {
    logger.error({ err: error, action: entry.action }, "Could not write an audit row");
  }
}
