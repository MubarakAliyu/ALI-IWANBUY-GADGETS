/**
 * Admin sessions and the account each admin manages for themselves, over HTTP.
 */

import type { AdminChangePasswordInput, AdminLoginInput, AdminProfileInput, SetPinInput } from "@aib/shared";
import type { Request, Response } from "express";
import { clearAdminCookie, setAdminCookie } from "../lib/tokens.js";
import { currentAdmin, readAdmin } from "../middleware/require-admin.js";
import { validated } from "../middleware/validate.js";
import {
  adminLogin,
  changeAdminPassword,
  toAdminDto,
  toAdminSession,
  updateAdminProfile,
} from "../services/admin-auth.service.js";
import { recordAudit } from "../services/audit.service.js";
import { setPin } from "../services/pin.service.js";

export async function login(req: Request, res: Response): Promise<void> {
  const admin = await adminLogin(validated<AdminLoginInput>(res), req);
  setAdminCookie(res, admin._id.toString(), admin.tokenVersion);

  res.json({
    admin: toAdminDto(admin),
    /** The dashboard sends them straight to whichever of these is still outstanding. */
    mustChangePassword: admin.mustChangePassword,
    mustSetPin: admin.pinHash === null && admin.role !== "STAFF",
  });
}

export async function logout(req: Request, res: Response): Promise<void> {
  const admin = await readAdmin(req);
  clearAdminCookie(res);

  if (admin) {
    await recordAudit({
      actorType: "ADMIN",
      actor: admin._id,
      actorName: `${admin.firstName} ${admin.lastName}`,
      action: "ADMIN_SIGNED_OUT",
      entityType: "Admin",
      entityId: admin._id,
      summary: `${admin.email} signed out of the dashboard`,
      req,
    });
  }

  res.json({ ok: true });
}

/** Answers for a signed-out visitor too, so the dashboard shell can decide where to send them. */
export async function me(req: Request, res: Response): Promise<void> {
  res.json(toAdminSession(await readAdmin(req)));
}

export async function changePassword(req: Request, res: Response): Promise<void> {
  const signedIn = currentAdmin(req);
  const admin = await changeAdminPassword(
    signedIn._id.toString(),
    validated<AdminChangePasswordInput>(res),
    req,
  );

  // This session continues with a cookie for the new token version; every other one is now stale.
  setAdminCookie(res, admin._id.toString(), admin.tokenVersion);
  res.json({ admin: toAdminDto(admin) });
}

export async function updateProfile(req: Request, res: Response): Promise<void> {
  const signedIn = currentAdmin(req);
  const admin = await updateAdminProfile(signedIn._id.toString(), validated<AdminProfileInput>(res), req);
  res.json({ admin: toAdminDto(admin) });
}

export async function setOwnPin(req: Request, res: Response): Promise<void> {
  const admin = currentAdmin(req);
  await setPin(admin._id.toString(), validated<SetPinInput>(res), req);
  res.json({ ok: true });
}
