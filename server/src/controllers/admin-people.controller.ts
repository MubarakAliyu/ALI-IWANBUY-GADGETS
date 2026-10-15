/**
 * Customers, admin users, store settings and the audit trail over HTTP (overview §10 A-9 … A-13).
 *
 * The only interesting decision here is in `customers`: whether to include what people have spent is decided
 * from the acting admin's role before the query runs, so a STAFF response never carries the figures.
 */

import type {
  AdminCustomerQuery,
  AdminRole,
  AuditQuery,
  CreateAdminInput,
  CustomerStatusInput,
  ResetAdminPasswordInput,
  StoreSettingsInput,
} from "@aib/shared";
import type { Request, Response } from "express";
import { csvFilename, csvNaira, toCsv } from "../lib/csv.js";
import { formatLagosDate, formatLagosTime } from "../lib/dates.js";
import { can } from "../lib/permissions.js";
import { currentAdmin } from "../middleware/require-admin.js";
import { validated, validatedQuery } from "../middleware/validate.js";
import * as people from "../services/admin-people.service.js";
import * as settings from "../services/admin-settings.service.js";

// ── Customers ───────────────────────────────────────────────────────────────────────────────────────

export async function customers(req: Request, res: Response): Promise<void> {
  const admin = currentAdmin(req);
  res.json(
    await people.listCustomers(validatedQuery<AdminCustomerQuery>(res), {
      includeSpend: can(admin.role, "customers.spend"),
    }),
  );
}

export async function setCustomerStatus(req: Request, res: Response): Promise<void> {
  const input = validated<CustomerStatusInput>(res);
  res.json(
    await people.setCustomerStatus(String(req.params.id), input.status, input.reason, currentAdmin(req), req),
  );
}

export async function exportCustomers(req: Request, res: Response): Promise<void> {
  const admin = currentAdmin(req);
  const includeSpend = can(admin.role, "customers.spend");
  const query = validatedQuery<AdminCustomerQuery>(res);
  const { data } = await people.listCustomers({ ...query, page: 1, limit: 200 }, { includeSpend });

  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="${csvFilename("customers")}"`);
  res.send(
    toCsv(data, [
      { header: "Name", value: (row) => row.name },
      { header: "Email", value: (row) => row.email },
      { header: "Phone", value: (row) => row.phone },
      { header: "Status", value: (row) => row.status },
      { header: "Orders", value: (row) => row.orders },
      ...(includeSpend
        ? [{ header: "Spend (NGN)", value: (row: (typeof data)[number]) => csvNaira(row.spendKobo ?? 0) }]
        : []),
      { header: "Joined", value: (row) => formatLagosDate(new Date(row.createdAt)) },
    ]),
  );
}

// ── Admin users ─────────────────────────────────────────────────────────────────────────────────────

export async function admins(_req: Request, res: Response): Promise<void> {
  res.json({ data: await people.listAdmins() });
}

export async function createAdmin(req: Request, res: Response): Promise<void> {
  res.status(201).json(await people.createAdmin(validated<CreateAdminInput>(res), currentAdmin(req), req));
}

export async function updateAdminRole(req: Request, res: Response): Promise<void> {
  const input = validated<{ role: AdminRole }>(res);
  res.json(await people.updateAdminRole(String(req.params.id), input.role, currentAdmin(req), req));
}

export async function setAdminStatus(req: Request, res: Response): Promise<void> {
  const input = validated<{ status: "ACTIVE" | "SUSPENDED" }>(res);
  res.json(await people.setAdminStatus(String(req.params.id), input.status, currentAdmin(req), req));
}

export async function resetAdminPassword(req: Request, res: Response): Promise<void> {
  const input = validated<ResetAdminPasswordInput>(res);
  res.json(await people.resetAdminPassword(String(req.params.id), input.reason, currentAdmin(req), req));
}

// ── Store settings ──────────────────────────────────────────────────────────────────────────────────

export async function getSettings(_req: Request, res: Response): Promise<void> {
  res.json(await settings.getSettings());
}

export async function updateSettings(req: Request, res: Response): Promise<void> {
  res.json(await settings.updateSettings(validated<StoreSettingsInput>(res), currentAdmin(req), req));
}

// ── Audit trail ─────────────────────────────────────────────────────────────────────────────────────

export async function audit(_req: Request, res: Response): Promise<void> {
  res.json(await settings.listAudit(validatedQuery<AuditQuery>(res)));
}

export async function auditFilters(_req: Request, res: Response): Promise<void> {
  res.json(await settings.auditFilters());
}

export async function exportAudit(_req: Request, res: Response): Promise<void> {
  const { data } = await settings.listAudit({ ...validatedQuery<AuditQuery>(res), page: 1, limit: 200 });

  res.setHeader("Content-Type", "text/csv; charset=utf-8");
  res.setHeader("Content-Disposition", `attachment; filename="${csvFilename("audit")}"`);
  res.send(
    toCsv(data, [
      {
        header: "When",
        value: (row) => `${formatLagosDate(new Date(row.at))} ${formatLagosTime(new Date(row.at))}`,
      },
      { header: "Who", value: (row) => row.actorName || row.actorType },
      { header: "Action", value: (row) => row.action },
      { header: "Thing", value: (row) => row.entityType },
      { header: "Id", value: (row) => row.entityId },
      { header: "What happened", value: (row) => row.summary },
      { header: "Before", value: (row) => (row.diff?.before ? JSON.stringify(row.diff.before) : "") },
      { header: "After", value: (row) => (row.diff?.after ? JSON.stringify(row.diff.after) : "") },
      { header: "IP", value: (row) => row.ip },
    ]),
  );
}
