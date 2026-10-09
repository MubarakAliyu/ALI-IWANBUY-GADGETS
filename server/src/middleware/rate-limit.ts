/**
 * Rate limits on the routes worth attacking (overview §6.4, §12).
 *
 * Production allows five sign-in or registration attempts a minute from one address, as the overview
 * specifies. Development allows considerably more, because everything — the developer, the browser and the
 * whole end-to-end suite, which registers a fresh customer per test — arrives from a single address, and one
 * shared budget would make the suite fail for a reason that has nothing to do with the code (ADR-014).
 *
 * The per-account lockout in `auth.service` is the other half of this, and it is the same in every
 * environment: eight failures against one account locks it for thirty minutes, wherever they come from.
 */

import rateLimit from "express-rate-limit";
import type { RequestHandler } from "express";
import { isProduction, isTest } from "../config/env.js";

export const AUTH_ATTEMPTS_PER_MINUTE = isProduction ? 5 : 100;
const ACCOUNT_REQUESTS_PER_MINUTE = isProduction ? 120 : 600;

const passthrough: RequestHandler = (_req, _res, next) => next();

function perMinute(limit: number, message: string): RequestHandler {
  return rateLimit({
    windowMs: 60_000,
    limit,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    message: { error: { code: "TOO_MANY_REQUESTS", message } },
  });
}

export const authRateLimit: RequestHandler = isTest
  ? passthrough
  : perMinute(AUTH_ATTEMPTS_PER_MINUTE, "Too many attempts. Please wait a minute and try again.");

export const accountRateLimit: RequestHandler = isTest
  ? passthrough
  : perMinute(ACCOUNT_REQUESTS_PER_MINUTE, "Too many requests. Please slow down.");
