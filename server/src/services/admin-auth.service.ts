/**
 * Admin sign-in and the account each admin manages for themselves (overview §6.4, §10 A-1, A-11).
 *
 * Same shape as the customer realm — a generic refusal, a lockout, a token version that ends other sessions —
 * with two additions: an account created by the owner starts with a temporary password it must replace, and
 * owners and managers are nudged to set a payment PIN before they can confirm money.
 */

import {
  permissionsFor,
  type Admin as AdminDto,
  type AdminChangePasswordInput,
  type AdminLoginInput,
  type AdminProfileInput,
  type AdminSession,
} from "@aib/shared";
import type { Request } from "express";
import { AppError } from "../lib/app-error.js";
import { hashPassword, verifyPassword } from "../lib/password.js";
import { Admin, type AdminDoc } from "../models/index.js";
import type { SignedInAdmin } from "../middleware/require-admin.js";
import { recordAudit } from "./audit.service.js";

const MAX_FAILED_LOGINS = 8;
const LOCK_MINUTES = 30;
const WRONG = "Email or password is incorrect.";

export function toAdminDto(admin: SignedInAdmin): AdminDto {
  return {
    id: admin._id.toString(),
    firstName: admin.firstName,
    lastName: admin.lastName,
    email: admin.email,
    phone: admin.phone ?? "",
    role: admin.role,
    status: admin.status,
    mustChangePassword: admin.mustChangePassword,
    hasPin: admin.pinHash !== null,
    lastLoginAt: admin.lastLoginAt ? admin.lastLoginAt.toISOString() : null,
    createdAt: admin.createdAt.toISOString(),
  };
}

/** The session payload the dashboard shell renders from: who, and what their role allows. */
export function toAdminSession(admin: SignedInAdmin | null): AdminSession {
  return {
    admin: admin ? toAdminDto(admin) : null,
    permissions: admin ? permissionsFor(admin.role) : [],
  };
}

export async function adminLogin(input: AdminLoginInput, req?: Request): Promise<AdminDoc> {
  const admin = await Admin.findOne({ email: input.email }).exec();

  if (!admin) {
    await verifyPassword(
      input.password,
      "$2b$12$invalidinvalidinvalidinvalidinvalidinvalidinvalidinvalidinv",
    );
    await recordAudit({
      actorType: "SYSTEM",
      action: "ADMIN_LOGIN_FAILED",
      entityType: "Admin",
      summary: `Dashboard sign-in attempted for an unknown address (${input.email})`,
      ...(req ? { req } : {}),
    });
    throw new AppError(401, "INVALID_CREDENTIALS", WRONG);
  }

  if (admin.lockedUntil && admin.lockedUntil > new Date()) {
    throw new AppError(
      423,
      "ACCOUNT_LOCKED",
      "Too many failed attempts. Try again in a few minutes, or ask the owner to reset your password.",
    );
  }

  if (admin.status !== "ACTIVE") {
    await recordAudit({
      actorType: "SYSTEM",
      action: "ADMIN_LOGIN_REFUSED",
      entityType: "Admin",
      entityId: admin._id,
      summary: `A suspended admin tried to sign in (${admin.email})`,
      ...(req ? { req } : {}),
    });
    throw new AppError(403, "ACCOUNT_SUSPENDED", "This account is suspended. Ask the owner to restore it.");
  }

  if (!(await verifyPassword(input.password, admin.passwordHash))) {
    admin.failedLogins += 1;
    if (admin.failedLogins >= MAX_FAILED_LOGINS) {
      admin.lockedUntil = new Date(Date.now() + LOCK_MINUTES * 60_000);
      admin.failedLogins = 0;
    }
    await admin.save();

    await recordAudit({
      actorType: "SYSTEM",
      action: admin.lockedUntil ? "ADMIN_ACCOUNT_LOCKED" : "ADMIN_LOGIN_FAILED",
      entityType: "Admin",
      entityId: admin._id,
      summary: admin.lockedUntil
        ? `${admin.email} was locked after ${MAX_FAILED_LOGINS} failed attempts`
        : `A failed dashboard sign-in for ${admin.email}`,
      ...(req ? { req } : {}),
    });

    throw new AppError(401, "INVALID_CREDENTIALS", WRONG);
  }

  admin.failedLogins = 0;
  admin.lockedUntil = null;
  admin.lastLoginAt = new Date();
  await admin.save();

  await recordAudit({
    actorType: "ADMIN",
    actor: admin._id,
    actorName: `${admin.firstName} ${admin.lastName}`,
    action: "ADMIN_SIGNED_IN",
    entityType: "Admin",
    entityId: admin._id,
    summary: `${admin.email} signed in to the dashboard`,
    ...(req ? { req } : {}),
  });

  return admin;
}

/**
 * Changing a password clears `mustChangePassword` and bumps `tokenVersion`, so a temporary password stops
 * working everywhere the moment a real one is chosen.
 */
export async function changeAdminPassword(
  adminId: string,
  input: AdminChangePasswordInput,
  req?: Request,
): Promise<AdminDoc> {
  const admin = await Admin.findById(adminId).exec();
  if (!admin) {
    throw new AppError(401, "UNAUTHENTICATED", "Please sign in to the dashboard.");
  }

  if (!(await verifyPassword(input.currentPassword, admin.passwordHash))) {
    throw AppError.badRequest("That is not your current password.", [
      { path: "currentPassword", message: "That is not your current password" },
    ]);
  }

  if (await verifyPassword(input.newPassword, admin.passwordHash)) {
    throw AppError.badRequest("Choose a password you have not used here before.", [
      { path: "newPassword", message: "This is your current password" },
    ]);
  }

  admin.passwordHash = await hashPassword(input.newPassword);
  admin.mustChangePassword = false;
  admin.tokenVersion += 1;
  await admin.save();

  await recordAudit({
    actorType: "ADMIN",
    actor: admin._id,
    actorName: `${admin.firstName} ${admin.lastName}`,
    action: "ADMIN_PASSWORD_CHANGED",
    entityType: "Admin",
    entityId: admin._id,
    summary: "Changed their dashboard password; other sessions were signed out",
    ...(req ? { req } : {}),
  });

  return admin;
}

export async function updateAdminProfile(
  adminId: string,
  input: AdminProfileInput,
  req?: Request,
): Promise<AdminDoc> {
  const admin = await Admin.findById(adminId).exec();
  if (!admin) {
    throw new AppError(401, "UNAUTHENTICATED", "Please sign in to the dashboard.");
  }

  const before = { firstName: admin.firstName, lastName: admin.lastName, phone: admin.phone };
  admin.firstName = input.firstName;
  admin.lastName = input.lastName;
  admin.phone = input.phone ?? "";
  await admin.save();

  await recordAudit({
    actorType: "ADMIN",
    actor: admin._id,
    actorName: `${admin.firstName} ${admin.lastName}`,
    action: "ADMIN_PROFILE_UPDATED",
    entityType: "Admin",
    entityId: admin._id,
    summary: "Updated their own profile",
    before,
    after: { firstName: admin.firstName, lastName: admin.lastName, phone: admin.phone },
    ...(req ? { req } : {}),
  });

  return admin;
}
