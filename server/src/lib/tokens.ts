/**
 * Sessions (overview §6.4). Two realms that never share a cookie or a key: customers on `aib_c`, admins on
 * `aib_a` from Batch 3. A token carries the account id and the `tokenVersion` it was issued against; every
 * authenticated request re-reads the account and compares them, so a password change or a suspension ends
 * every other session at once.
 */

import type { CookieOptions, Response } from "express";
import jwt from "jsonwebtoken";
import { env, isProduction } from "../config/env.js";

export const CUSTOMER_COOKIE = "aib_c";
export const ADMIN_COOKIE = "aib_a";

const CUSTOMER_SESSION_DAYS = 7;
/** An admin session is short and slides: every request renews it, eight hours of inactivity ends it. */
const ADMIN_SESSION_HOURS = 8;

export type CustomerTokenPayload = { sub: string; v: number };
export type AdminTokenPayload = { sub: string; v: number };

/**
 * The admin realm has its own signing key. Until Batch 3 it was optional, so a deployment that never used
 * admin could run without it; now it is required the moment the admin router is mounted.
 */
function adminSecret(): string {
  if (!env.ADMIN_JWT_SECRET) {
    throw new Error("ADMIN_JWT_SECRET is not set — the admin dashboard cannot issue sessions without it.");
  }
  return env.ADMIN_JWT_SECRET;
}

function cookieOptions(maxAgeMs: number): CookieOptions {
  return {
    httpOnly: true,
    sameSite: "lax",
    secure: isProduction,
    path: "/",
    maxAge: maxAgeMs,
  };
}

export function signCustomerToken(customerId: string, tokenVersion: number): string {
  return jwt.sign(
    { sub: customerId, v: tokenVersion } satisfies CustomerTokenPayload,
    env.CUSTOMER_JWT_SECRET,
    {
      expiresIn: `${CUSTOMER_SESSION_DAYS}d`,
    },
  );
}

/** The payload of a valid, unexpired customer token, or `null` for anything else. */
export function readCustomerToken(token: string | undefined): CustomerTokenPayload | null {
  if (!token) {
    return null;
  }
  try {
    const payload = jwt.verify(token, env.CUSTOMER_JWT_SECRET);
    if (typeof payload === "string" || typeof payload.sub !== "string" || typeof payload.v !== "number") {
      return null;
    }
    return { sub: payload.sub, v: payload.v };
  } catch {
    return null;
  }
}

export function setCustomerCookie(res: Response, customerId: string, tokenVersion: number): void {
  const token = signCustomerToken(customerId, tokenVersion);
  res.cookie(CUSTOMER_COOKIE, token, cookieOptions(CUSTOMER_SESSION_DAYS * 24 * 60 * 60 * 1000));
}

export function clearCustomerCookie(res: Response): void {
  res.clearCookie(CUSTOMER_COOKIE, { ...cookieOptions(0), maxAge: undefined });
}

export function signAdminToken(adminId: string, tokenVersion: number): string {
  return jwt.sign({ sub: adminId, v: tokenVersion } satisfies AdminTokenPayload, adminSecret(), {
    expiresIn: `${ADMIN_SESSION_HOURS}h`,
  });
}

export function readAdminToken(token: string | undefined): AdminTokenPayload | null {
  if (!token) {
    return null;
  }
  try {
    const payload = jwt.verify(token, adminSecret());
    if (typeof payload === "string" || typeof payload.sub !== "string" || typeof payload.v !== "number") {
      return null;
    }
    return { sub: payload.sub, v: payload.v };
  } catch {
    return null;
  }
}

/** Issued on sign-in and re-issued on every authenticated request, so the eight hours slide. */
export function setAdminCookie(res: Response, adminId: string, tokenVersion: number): void {
  res.cookie(
    ADMIN_COOKIE,
    signAdminToken(adminId, tokenVersion),
    cookieOptions(ADMIN_SESSION_HOURS * 60 * 60 * 1000),
  );
}

export function clearAdminCookie(res: Response): void {
  res.clearCookie(ADMIN_COOKIE, { ...cookieOptions(0), maxAge: undefined });
}
