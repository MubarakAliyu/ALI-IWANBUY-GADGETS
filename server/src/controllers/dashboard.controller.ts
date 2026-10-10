/**
 * `GET /admin/dashboard` (overview §10 A-3).
 *
 * The role decides what is computed, not what is filtered out afterwards: a STAFF request never runs the
 * money aggregations, and the `financial` half of the response is null. That is the difference between a
 * hidden figure and one that was never sent.
 */

import type { DashboardQuery } from "@aib/shared";
import type { Request, Response } from "express";
import { can } from "../lib/permissions.js";
import { loadSettings } from "../lib/settings.js";
import { currentAdmin } from "../middleware/require-admin.js";
import { validatedQuery } from "../middleware/validate.js";
import { buildDashboard } from "../services/dashboard.service.js";

export async function dashboard(req: Request, res: Response): Promise<void> {
  const admin = currentAdmin(req);
  const query = validatedQuery<DashboardQuery>(res);
  const settings = await loadSettings();

  res.json(
    await buildDashboard(query, {
      includeFinancial: can(admin.role, "dashboard.financial"),
      lowStockThreshold: settings.lowStockDefault,
    }),
  );
}
