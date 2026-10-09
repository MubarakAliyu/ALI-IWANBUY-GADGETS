/**
 * Customer sessions over HTTP (overview §11). The service decides everything; this layer only moves the
 * cookie and shapes the response.
 */

import type { LoginInput, RegisterInput } from "@aib/shared";
import type { Request, Response } from "express";
import { clearCustomerCookie, setCustomerCookie } from "../lib/tokens.js";
import { readCustomer } from "../middleware/require-customer.js";
import { validated } from "../middleware/validate.js";
import { login, register, toCustomerDto } from "../services/auth.service.js";
import { recordAudit } from "../services/audit.service.js";

export async function registerCustomer(req: Request, res: Response): Promise<void> {
  const { customer, dto } = await register(validated<RegisterInput>(res), req);
  setCustomerCookie(res, customer._id.toString(), customer.tokenVersion);
  res.status(201).json({ customer: dto });
}

export async function loginCustomer(req: Request, res: Response): Promise<void> {
  const { customer, dto } = await login(validated<LoginInput>(res), req);
  setCustomerCookie(res, customer._id.toString(), customer.tokenVersion);
  res.json({ customer: dto });
}

export async function logoutCustomer(req: Request, res: Response): Promise<void> {
  const customer = await readCustomer(req);
  clearCustomerCookie(res);

  if (customer) {
    await recordAudit({
      actorType: "CUSTOMER",
      actor: customer._id,
      actorName: `${customer.firstName} ${customer.lastName}`,
      action: "CUSTOMER_SIGNED_OUT",
      entityType: "Customer",
      entityId: customer._id,
      summary: `${customer.email} signed out`,
      req,
    });
  }

  res.json({ ok: true });
}

/** Answers for a signed-out visitor too, so the header can render either way without a 401 in the console. */
export async function me(req: Request, res: Response): Promise<void> {
  const customer = await readCustomer(req);
  res.json({ customer: customer ? toCustomerDto(customer) : null });
}
