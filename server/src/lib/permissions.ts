/**
 * Who may do what (overview §3.2, CLAUDE.md non-negotiable).
 *
 * The matrix itself lives in `@aib/shared` so the dashboard can render from it, but the decision is made
 * here, on the server, on every request. Hiding a button is a courtesy; this is the control. A refusal is
 * always audited — an admin trying to reach something their role does not allow is worth knowing about.
 */

import { roleCan, type AdminRole, type Permission } from "@aib/shared";
import type { NextFunction, Request, Response } from "express";
import { AppError } from "./app-error.js";
import { recordAudit } from "../services/audit.service.js";
import { currentAdmin } from "../middleware/require-admin.js";

export { PERMISSIONS, permissionsFor, roleCan, type Permission } from "@aib/shared";

/**
 * Refuses the request unless the signed-in admin's role holds `permission`. Sits behind `requireAdmin`, which
 * has already established who is asking.
 */
export function requirePermission(permission: Permission) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    const admin = currentAdmin(req);

    if (roleCan(admin.role, permission)) {
      next();
      return;
    }

    void recordAudit({
      actorType: "ADMIN",
      actor: admin._id,
      actorName: `${admin.firstName} ${admin.lastName}`,
      action: "PERMISSION_DENIED",
      entityType: "Permission",
      entityId: permission,
      summary: `${admin.role} was refused ${permission} at ${req.method} ${req.originalUrl}`,
      req,
    });

    next(new AppError(403, "FORBIDDEN", "Your role does not allow that. Ask the owner if you need access."));
  };
}

/** For services that need to branch on a role rather than refuse outright — hiding spend totals from staff. */
export function can(role: AdminRole, permission: Permission): boolean {
  return roleCan(role, permission);
}
