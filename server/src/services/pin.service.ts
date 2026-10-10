/**
 * The payment PIN (overview §6.5, CLAUDE.md non-negotiable).
 *
 * Being signed in is not enough to move money. Confirming a payment, cancelling an order that has been paid
 * for, and issuing a refund all ask the acting admin for a four-to-six digit PIN that only they know. It is
 * bcrypt-hashed like a password, separate from the password, and never stored anywhere on the client — it
 * travels in the body of the one request that needs it and is forgotten.
 *
 * Five wrong attempts lock it for fifteen minutes, because a four-digit secret is only safe if guessing it is
 * slow. Every attempt, every lock and every change is audited.
 */

import { isTrivialPin, type SetPinInput } from "@aib/shared";
import type { Request } from "express";
import { AppError } from "../lib/app-error.js";
import { hashPassword, verifyPassword } from "../lib/password.js";
import { Admin, type AdminDoc } from "../models/index.js";
import { recordAudit } from "./audit.service.js";

const MAX_PIN_FAILURES = 5;
const LOCK_MINUTES = 15;

function minutesRemaining(until: Date): number {
  return Math.max(1, Math.ceil((until.getTime() - Date.now()) / 60_000));
}

async function loadAdmin(adminId: string): Promise<AdminDoc & { save: () => Promise<unknown> }> {
  const admin = await Admin.findById(adminId).exec();
  if (!admin) {
    throw new AppError(401, "UNAUTHENTICATED", "Please sign in to the dashboard.");
  }
  return admin as AdminDoc & { save: () => Promise<unknown> };
}

/**
 * Check a PIN, counting failures. Returns nothing on success and throws on anything else, so a caller cannot
 * forget to check the result.
 */
export async function verifyPin(adminId: string, pin: string, req?: Request): Promise<void> {
  const admin = await loadAdmin(adminId);

  if (!admin.pinHash) {
    throw new AppError(
      403,
      "PIN_NOT_SET",
      "Set your payment PIN in account settings before confirming payments.",
    );
  }

  if (admin.pinLockedUntil && admin.pinLockedUntil > new Date()) {
    throw new AppError(
      423,
      "PIN_LOCKED",
      `Your PIN is locked for another ${minutesRemaining(admin.pinLockedUntil)} minute(s) after too many wrong attempts.`,
    );
  }

  if (await verifyPassword(pin, admin.pinHash)) {
    if (admin.pinFailed !== 0 || admin.pinLockedUntil !== null) {
      admin.pinFailed = 0;
      admin.pinLockedUntil = null;
      await admin.save();
    }
    return;
  }

  admin.pinFailed += 1;
  const locked = admin.pinFailed >= MAX_PIN_FAILURES;
  if (locked) {
    admin.pinLockedUntil = new Date(Date.now() + LOCK_MINUTES * 60_000);
    admin.pinFailed = 0;
  }
  await admin.save();

  await recordAudit({
    actorType: "ADMIN",
    actor: admin._id,
    actorName: `${admin.firstName} ${admin.lastName}`,
    action: locked ? "PIN_LOCKED" : "PIN_FAILED",
    entityType: "Admin",
    entityId: admin._id,
    summary: locked
      ? `PIN locked for ${LOCK_MINUTES} minutes after ${MAX_PIN_FAILURES} wrong attempts`
      : "A wrong PIN was entered",
    ...(req ? { req } : {}),
  });

  if (locked) {
    throw new AppError(
      423,
      "PIN_LOCKED",
      `That PIN is wrong. Your PIN is now locked for ${LOCK_MINUTES} minutes.`,
    );
  }

  // 401, not 400: the PIN is a second sign-in, so a wrong one is an authentication failure. The field detail
  // is still there, so the modal can mark the input as well as show the message.
  throw new AppError(401, "PIN_INCORRECT", "That PIN is not correct.", [
    { path: "pin", message: "Incorrect PIN" },
  ]);
}

/**
 * Set a PIN, or change one. Setting the first PIN is authorised by the account password; changing an existing
 * one needs the current PIN (or the password, for an admin who has forgotten it but is still signed in).
 */
export async function setPin(adminId: string, input: SetPinInput, req?: Request): Promise<void> {
  const admin = await loadAdmin(adminId);
  const hadPin = admin.pinHash !== null;

  if (isTrivialPin(input.pin)) {
    throw AppError.badRequest("That PIN is too easy to guess — choose another.", [
      { path: "pin", message: "Too easy to guess" },
    ]);
  }

  if (hadPin) {
    const byPin = input.currentPin ? await verifyPassword(input.currentPin, admin.pinHash as string) : false;
    const byPassword = input.password ? await verifyPassword(input.password, admin.passwordHash) : false;

    if (!byPin && !byPassword) {
      throw AppError.badRequest("Enter your current PIN or your password to change it.", [
        { path: "currentPin", message: "Incorrect PIN" },
      ]);
    }
  } else if (!input.password || !(await verifyPassword(input.password, admin.passwordHash))) {
    throw AppError.badRequest("Enter your password to set a PIN.", [
      { path: "password", message: "Incorrect password" },
    ]);
  }

  admin.pinHash = await hashPassword(input.pin);
  admin.pinFailed = 0;
  admin.pinLockedUntil = null;
  await admin.save();

  await recordAudit({
    actorType: "ADMIN",
    actor: admin._id,
    actorName: `${admin.firstName} ${admin.lastName}`,
    action: hadPin ? "PIN_CHANGED" : "PIN_SET",
    entityType: "Admin",
    entityId: admin._id,
    summary: hadPin ? "Changed their payment PIN" : "Set their payment PIN",
    ...(req ? { req } : {}),
  });
}

/**
 * The owner clearing someone else's PIN — for an admin who has forgotten theirs. It is cleared, not chosen:
 * nobody, including the owner, ever knows another admin's PIN.
 */
export async function resetPin(targetAdminId: string, actor: { id: string; name: string }, req?: Request): Promise<void> {
  const admin = await loadAdmin(targetAdminId);

  admin.pinHash = null;
  admin.pinFailed = 0;
  admin.pinLockedUntil = null;
  await admin.save();

  await recordAudit({
    actorType: "ADMIN",
    actor: actor.id,
    actorName: actor.name,
    action: "PIN_RESET",
    entityType: "Admin",
    entityId: admin._id,
    summary: `Cleared the payment PIN for ${admin.email}; they must set a new one`,
    ...(req ? { req } : {}),
  });
}
