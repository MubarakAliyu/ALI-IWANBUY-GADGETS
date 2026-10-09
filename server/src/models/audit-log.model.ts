import { model, Schema, type Types } from "mongoose";

/**
 * The audit trail (overview §7, CLAUDE.md non-negotiable). Every mutation by a customer or an admin, and every
 * security event, leaves a row here.
 *
 * It is **append-only**: the hooks below make the model refuse every update and delete, so the only way to
 * change history is outside the application entirely. Secrets are never written — `diff` carries changed fields
 * only, with anything sensitive redacted by `audit.service` before it gets here.
 */

export type AuditActorType = "ADMIN" | "CUSTOMER" | "SYSTEM";

export type AuditLogDoc = {
  _id: Types.ObjectId;
  at: Date;
  actorType: AuditActorType;
  actor: Types.ObjectId | null;
  actorName: string;
  action: string;
  entityType: string;
  entityId: string | null;
  summary: string;
  diff: { before?: Record<string, unknown>; after?: Record<string, unknown> } | null;
  ip: string | null;
  userAgent: string | null;
};

const auditLogSchema = new Schema<AuditLogDoc>(
  {
    at: { type: Date, required: true, default: () => new Date() },
    actorType: { type: String, enum: ["ADMIN", "CUSTOMER", "SYSTEM"], required: true },
    actor: { type: Schema.Types.ObjectId, default: null },
    actorName: { type: String, default: "" },
    action: { type: String, required: true },
    entityType: { type: String, required: true },
    entityId: { type: String, default: null },
    summary: { type: String, default: "" },
    diff: { type: Schema.Types.Mixed, default: null },
    ip: { type: String, default: null },
    userAgent: { type: String, default: null },
  },
  { versionKey: false },
);

auditLogSchema.index({ at: -1 });
auditLogSchema.index({ actor: 1, at: -1 });
auditLogSchema.index({ entityType: 1, entityId: 1 });

const APPEND_ONLY = "The audit trail is append-only.";

for (const hook of ["updateOne", "updateMany", "findOneAndUpdate", "replaceOne"] as const) {
  auditLogSchema.pre(hook, function refuse(next) {
    next(new Error(APPEND_ONLY));
  });
}

for (const hook of ["deleteOne", "deleteMany", "findOneAndDelete"] as const) {
  auditLogSchema.pre(hook, function refuse(next) {
    next(new Error(APPEND_ONLY));
  });
}

export const AuditLog = model<AuditLogDoc>("AuditLog", auditLogSchema);
