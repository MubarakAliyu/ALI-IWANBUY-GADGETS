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

export type CustomerTokenPayload = { sub: string; v: number };

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
