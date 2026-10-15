/**
 * Admin authentication (overview §6.4).
 *
 * Like the customer realm, the cookie is only half of it: every request re-reads the account and compares the
 * `tokenVersion` the token was signed with, so suspending an admin or changing their role ends their session
 * on their next click rather than in eight hours. The session also slides — each authenticated request issues
 * a fresh cookie, so an admin working through the day is not signed out mid-task.
 */

import type { NextFunction, Request, Response } from "express";
import { AppError } from "../lib/app-error.js";
import { ADMIN_COOKIE, clearAdminCookie, readAdminToken, setAdminCookie } from "../lib/tokens.js";
import { Admin, type AdminDoc } from "../models/index.js";
import { recordAudit } from "../services/audit.service.js";

export type SignedInAdmin = Pick<
  AdminDoc,
  | "_id"
  | "firstName"
  | "lastName"
  | "email"
  | "phone"
  | "role"
  | "status"
  | "mustChangePassword"
  | "pinHash"
  | "tokenVersion"
  | "lastLoginAt"
  | "createdAt"
>;

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      admin?: SignedInAdmin;
    }
  }
}

const ADMIN_FIELDS =
  "firstName lastName email phone role status mustChangePassword pinHash tokenVersion lastLoginAt createdAt";

/** The signed-in admin, or `null`. Never throws — used by `GET /admin/auth/me`. */
export async function readAdmin(req: Request): Promise<SignedInAdmin | null> {
  const payload = readAdminToken(req.cookies?.[ADMIN_COOKIE] as string | undefined);
  if (!payload) {
    return null;
  }

  const admin = await Admin.findById(payload.sub).select(ADMIN_FIELDS).lean<SignedInAdmin>().exec();
  if (!admin || admin.status !== "ACTIVE" || admin.tokenVersion !== payload.v) {
    return null;
  }
  return admin;
}

/** Refuses the request unless an admin is signed in, and slides their session forward. */
export async function requireAdmin(req: Request, res: Response, next: NextFunction): Promise<void> {
  const admin = await readAdmin(req);

  if (!admin) {
    if (req.cookies?.[ADMIN_COOKIE]) {
      clearAdminCookie(res);
      await recordAudit({
        actorType: "SYSTEM",
        action: "ADMIN_SESSION_REJECTED",
        entityType: "Admin",
        summary: `A stale or revoked admin session was refused at ${req.method} ${req.originalUrl}`,
        req,
      });
    }
    next(new AppError(401, "UNAUTHENTICATED", "Please sign in to the dashboard."));
    return;
  }

  req.admin = admin;
  setAdminCookie(res, admin._id.toString(), admin.tokenVersion);
  next();
}

/**
 * An admin who has not yet chosen their own password may only reach the routes that let them choose one.
 * Everything else waits until they have.
 */
export function requirePasswordChosen(req: Request, _res: Response, next: NextFunction): void {
  const admin = currentAdmin(req);
  if (admin.mustChangePassword) {
    next(new AppError(403, "PASSWORD_CHANGE_REQUIRED", "Choose your own password before you continue."));
    return;
  }
  next();
}

export function currentAdmin(req: Request): SignedInAdmin {
  if (!req.admin) {
    throw new AppError(401, "UNAUTHENTICATED", "Please sign in to the dashboard.");
  }
  return req.admin;
}
