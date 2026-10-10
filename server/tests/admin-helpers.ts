/**
 * Helpers for the admin tests: create an account of a given role with a known password and PIN, then sign in
 * through the real login route so the tests exercise the same cookie and middleware the dashboard does.
 */

import type { AdminRole } from "@aib/shared";
import type { Express } from "express";
import { hashPassword } from "../src/lib/password.js";
import { Admin, AuditLog } from "../src/models/index.js";
import { agentFor, type Agent } from "./helpers.js";

export const ADMIN_PASSWORD = "Owner12345";
export const ADMIN_PIN = "8426";

export async function createAdmin(
  role: AdminRole,
  overrides: Partial<{ email: string; pin: string | null; mustChangePassword: boolean }> = {},
): Promise<{ id: string; email: string }> {
  const email = overrides.email ?? `${role.toLowerCase()}${Date.now()}@aliiwanbuy.test`;
  const pin = overrides.pin === undefined ? ADMIN_PIN : overrides.pin;

  const admin = await Admin.create({
    firstName: role === "OWNER" ? "Ali" : "Test",
    lastName: role === "OWNER" ? "Abdullahi" : role.toLowerCase(),
    email,
    role,
    passwordHash: await hashPassword(ADMIN_PASSWORD),
    mustChangePassword: overrides.mustChangePassword ?? false,
    pinHash: pin ? await hashPassword(pin) : null,
  });

  return { id: admin._id.toString(), email };
}

/** A signed-in admin of the given role. Returns the agent, the account id and its email. */
export async function signedInAdmin(
  app: Express,
  role: AdminRole,
  overrides: Partial<{ email: string; pin: string | null }> = {},
): Promise<{ agent: Agent; id: string; email: string }> {
  const { id, email } = await createAdmin(role, overrides);
  const agent = agentFor(app);

  const response = await agent
    .post("/api/v1/admin/auth/login")
    .send({ email, password: ADMIN_PASSWORD });
  if (response.status !== 200) {
    throw new Error(`Could not sign in an admin: ${response.status} ${JSON.stringify(response.body)}`);
  }

  return { agent, id, email };
}

export async function clearAdmins(): Promise<void> {
  await Admin.deleteMany({}).exec();
}

/** The audit rows written for one action, newest first — what the audit assertions read. */
export async function auditRows(action: string) {
  return AuditLog.find({ action }).sort({ createdAt: -1 }).lean().exec();
}
