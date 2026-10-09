/**
 * Customer authentication (overview §6.4).
 *
 * The cookie is only half the check: every request re-reads the account and compares the `tokenVersion` the
 * token was signed with. A password change or a suspension bumps that number, so every other session stops
 * working on its next request rather than when the token happens to expire.
 */

import type { NextFunction, Request, Response } from "express";
import { AppError } from "../lib/app-error.js";
import { CUSTOMER_COOKIE, clearCustomerCookie, readCustomerToken } from "../lib/tokens.js";
import { Customer, type CustomerDoc } from "../models/index.js";
import { recordAudit } from "../services/audit.service.js";

export type SignedInCustomer = Pick<
  CustomerDoc,
  | "_id"
  | "firstName"
  | "lastName"
  | "email"
  | "phone"
  | "addresses"
  | "wishlist"
  | "status"
  | "tokenVersion"
  | "createdAt"
>;

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface Request {
      customer?: SignedInCustomer;
    }
  }
}

/** The signed-in customer, or `null`. Never throws — used by `GET /auth/me` and by optional-auth routes. */
export async function readCustomer(req: Request): Promise<SignedInCustomer | null> {
  const payload = readCustomerToken(req.cookies?.[CUSTOMER_COOKIE] as string | undefined);
  if (!payload) {
    return null;
  }

  const customer = await Customer.findById(payload.sub)
    .select("firstName lastName email phone addresses wishlist status tokenVersion createdAt")
    .lean<SignedInCustomer>()
    .exec();

  if (!customer || customer.status !== "ACTIVE" || customer.tokenVersion !== payload.v) {
    return null;
  }
  return customer;
}

/** Attaches the signed-in customer if there is one, and carries on either way. */
export async function withCustomer(req: Request, _res: Response, next: NextFunction): Promise<void> {
  const customer = await readCustomer(req);
  if (customer) {
    req.customer = customer;
  }
  next();
}

/** Refuses the request unless a customer is signed in. */
export async function requireCustomer(req: Request, res: Response, next: NextFunction): Promise<void> {
  const customer = await readCustomer(req);
  if (!customer) {
    // A cookie that no longer identifies anyone is cleared, so the browser stops sending it.
    if (req.cookies?.[CUSTOMER_COOKIE]) {
      clearCustomerCookie(res);
      await recordAudit({
        actorType: "SYSTEM",
        action: "SESSION_REJECTED",
        entityType: "Customer",
        summary: `A stale or revoked session was refused at ${req.method} ${req.path}`,
        req,
      });
    }
    next(new AppError(401, "UNAUTHENTICATED", "Please sign in to continue."));
    return;
  }

  req.customer = customer;
  next();
}

/** The signed-in customer inside a handler that sits behind `requireCustomer`. */
export function currentCustomer(req: Request): SignedInCustomer {
  if (!req.customer) {
    throw new AppError(401, "UNAUTHENTICATED", "Please sign in to continue.");
  }
  return req.customer;
}
