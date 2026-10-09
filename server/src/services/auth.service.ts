/**
 * Customer registration and sign-in (overview §6.4, §9 S-8).
 *
 * Two rules shape everything here. A sign-in failure never says which half was wrong, so an attacker cannot
 * use the form to discover whether an address has an account. And eight failures in a row lock the account for
 * half an hour, so guessing a password one request at a time stops being worthwhile.
 */

import type { Customer as CustomerDto, LoginInput, RegisterInput } from "@aib/shared";
import type { Request } from "express";
import { AppError } from "../lib/app-error.js";
import { hashPassword, verifyPassword } from "../lib/password.js";
import { companyBlock, loadSettings } from "../lib/settings.js";
import { sendMailSafely } from "../lib/mailer/index.js";
import { welcomeEmail } from "../lib/mailer/templates.js";
import { env } from "../config/env.js";
import { Customer, type CustomerDoc } from "../models/index.js";
import type { SignedInCustomer } from "../middleware/require-customer.js";
import { recordAudit } from "./audit.service.js";

const MAX_FAILED_LOGINS = 8;
const LOCK_MINUTES = 30;

/** What the client is told about the signed-in customer. Never the hash, never the token version. */
export function toCustomerDto(customer: SignedInCustomer): CustomerDto {
  return {
    id: customer._id.toString(),
    firstName: customer.firstName,
    lastName: customer.lastName,
    email: customer.email,
    phone: customer.phone ?? "",
    addresses: customer.addresses.map((address) => ({
      id: address._id.toString(),
      label: address.label,
      fullName: address.fullName,
      phone: address.phone,
      line1: address.line1,
      line2: address.line2,
      city: address.city,
      state: address.state as CustomerDto["addresses"][number]["state"],
      landmark: address.landmark,
      isDefault: address.isDefault,
    })),
    wishlistProductIds: customer.wishlist.map((id) => id.toString()),
    wishlistCount: customer.wishlist.length,
    createdAt: customer.createdAt.toISOString(),
  };
}

export type AuthResult = { customer: CustomerDoc; dto: CustomerDto };

export async function register(input: RegisterInput, req?: Request): Promise<AuthResult> {
  const existing = await Customer.findOne({ email: input.email }).select("_id").lean().exec();
  if (existing) {
    throw new AppError(409, "EMAIL_TAKEN", "An account with this email already exists — sign in instead.", [
      { path: "email", message: "This email is already registered" },
    ]);
  }

  const customer = await Customer.create({
    firstName: input.firstName,
    lastName: input.lastName,
    email: input.email,
    passwordHash: await hashPassword(input.password),
    lastLoginAt: new Date(),
  });

  await recordAudit({
    actorType: "CUSTOMER",
    actor: customer._id,
    actorName: `${customer.firstName} ${customer.lastName}`,
    action: "CUSTOMER_REGISTERED",
    entityType: "Customer",
    entityId: customer._id,
    summary: `${customer.email} created an account`,
    ...(req ? { req } : {}),
  });

  const settings = await loadSettings();
  await sendMailSafely(
    welcomeEmail({
      to: customer.email,
      firstName: customer.firstName,
      shopUrl: `${env.CLIENT_ORIGIN}/shop`,
      company: companyBlock(settings),
    }),
  );

  return { customer, dto: toCustomerDto(customer) };
}

const WRONG = "Email or password is incorrect.";

export async function login(input: LoginInput, req?: Request): Promise<AuthResult> {
  const customer = await Customer.findOne({ email: input.email }).exec();

  if (!customer) {
    // Still hash something, so a missing account does not answer faster than a wrong password.
    await verifyPassword(
      input.password,
      "$2b$12$invalidinvalidinvalidinvalidinvalidinvalidinvalidinvalidinv",
    );
    await recordAudit({
      actorType: "SYSTEM",
      action: "LOGIN_FAILED",
      entityType: "Customer",
      summary: `Sign-in attempted for an unknown address (${input.email})`,
      ...(req ? { req } : {}),
    });
    throw new AppError(401, "INVALID_CREDENTIALS", WRONG);
  }

  if (customer.lockedUntil && customer.lockedUntil > new Date()) {
    throw new AppError(
      423,
      "ACCOUNT_LOCKED",
      "Too many failed attempts. Please try again in a few minutes, or reset your password.",
    );
  }

  if (customer.status !== "ACTIVE") {
    await recordAudit({
      actorType: "SYSTEM",
      action: "LOGIN_REFUSED",
      entityType: "Customer",
      entityId: customer._id,
      summary: `A suspended account tried to sign in (${customer.email})`,
      ...(req ? { req } : {}),
    });
    throw new AppError(403, "ACCOUNT_SUSPENDED", "This account is suspended. Please call the shop.");
  }

  if (!(await verifyPassword(input.password, customer.passwordHash))) {
    customer.failedLogins += 1;
    if (customer.failedLogins >= MAX_FAILED_LOGINS) {
      customer.lockedUntil = new Date(Date.now() + LOCK_MINUTES * 60_000);
      customer.failedLogins = 0;
    }
    await customer.save();

    await recordAudit({
      actorType: "SYSTEM",
      action: customer.lockedUntil ? "ACCOUNT_LOCKED" : "LOGIN_FAILED",
      entityType: "Customer",
      entityId: customer._id,
      summary: customer.lockedUntil
        ? `${customer.email} was locked after ${MAX_FAILED_LOGINS} failed attempts`
        : `A failed sign-in for ${customer.email}`,
      ...(req ? { req } : {}),
    });

    throw new AppError(401, "INVALID_CREDENTIALS", WRONG);
  }

  customer.failedLogins = 0;
  customer.lockedUntil = null;
  customer.lastLoginAt = new Date();
  await customer.save();

  await recordAudit({
    actorType: "CUSTOMER",
    actor: customer._id,
    actorName: `${customer.firstName} ${customer.lastName}`,
    action: "CUSTOMER_SIGNED_IN",
    entityType: "Customer",
    entityId: customer._id,
    summary: `${customer.email} signed in`,
    ...(req ? { req } : {}),
  });

  return { customer, dto: toCustomerDto(customer) };
}
