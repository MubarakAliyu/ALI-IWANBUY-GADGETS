/**
 * Customers and admin users (overview §10 A-9, A-10).
 *
 * Two rules do most of the work here:
 *
 *   • **STAFF never see what anyone has spent.** The aggregation that computes it is not run for them and the
 *     fields come back null — a figure that was never sent cannot be read out of the response.
 *   • **The last OWNER is protected, and nobody can suspend themselves.** Both are checked on the server,
 *     because the dashboard hiding a button is not what stops it.
 */

import {
  ADMIN_ROLE_LABEL,
  type AdminCustomerQuery,
  type AdminCustomerRow,
  type AdminRole,
  type CreateAdminInput,
} from "@aib/shared";
import type { Request } from "express";
import { randomInt } from "node:crypto";
import type { FilterQuery, Types } from "mongoose";
import { AppError } from "../lib/app-error.js";
import { sendMailSafely } from "../lib/mailer/index.js";
import { adminInviteEmail } from "../lib/mailer/templates.js";
import { paginate, skipFor, type Paginated } from "../lib/pagination.js";
import { hashPassword } from "../lib/password.js";
import { companyBlock, loadSettings } from "../lib/settings.js";
import { env } from "../config/env.js";
import { Admin, Customer, Order, type AdminDoc, type CustomerDoc } from "../models/index.js";
import type { SignedInAdmin } from "../middleware/require-admin.js";
import { toAdminDto } from "./admin-auth.service.js";
import { recordAudit } from "./audit.service.js";

// ── Customers ───────────────────────────────────────────────────────────────────────────────────────

export async function listCustomers(
  query: AdminCustomerQuery,
  options: { includeSpend: boolean },
): Promise<Paginated<AdminCustomerRow>> {
  const filter: FilterQuery<CustomerDoc> = {};
  if (query.status) {
    filter.status = query.status;
  }

  const term = query.q?.trim();
  if (term) {
    const pattern = new RegExp(term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    filter.$or = [{ firstName: pattern }, { lastName: pattern }, { email: pattern }, { phone: pattern }];
  }

  const page = Math.max(1, query.page ?? 1);
  const limit = query.limit ?? 25;
  const direction = query.dir === "asc" ? 1 : -1;
  const sortField = query.sort === "name" ? "firstName" : "createdAt";

  const [customers, total] = await Promise.all([
    Customer.find(filter)
      .sort({ [sortField]: direction })
      .skip(skipFor(page, limit))
      .limit(limit)
      .select("firstName lastName email phone status createdAt")
      .lean()
      .exec(),
    Customer.countDocuments(filter).exec(),
  ]);

  const ids = customers.map((customer) => customer._id);

  // Order counts are operational and everyone sees them; the money is not.
  const counts = await Order.aggregate<{ _id: Types.ObjectId; orders: number; last: Date }>([
    { $match: { customer: { $in: ids } } },
    { $group: { _id: "$customer", orders: { $sum: 1 }, last: { $max: "$placedAt" } } },
  ]).exec();
  const byCustomer = new Map(counts.map((row) => [row._id.toString(), row]));

  const spend = options.includeSpend
    ? new Map(
        (
          await Order.aggregate<{ _id: Types.ObjectId; total: number }>([
            { $match: { customer: { $in: ids }, paymentStatus: "PAID" } },
            { $group: { _id: "$customer", total: { $sum: "$totalKobo" } } },
          ]).exec()
        ).map((row) => [row._id.toString(), row.total]),
      )
    : null;

  const rows = customers.map((customer): AdminCustomerRow => {
    const key = customer._id.toString();
    const activity = byCustomer.get(key);
    return {
      id: key,
      name: `${customer.firstName} ${customer.lastName}`,
      email: customer.email,
      phone: customer.phone,
      status: customer.status,
      orders: activity?.orders ?? 0,
      spendKobo: spend ? (spend.get(key) ?? 0) : null,
      lastOrderAt: options.includeSpend && activity?.last ? activity.last.toISOString() : null,
      createdAt: customer.createdAt.toISOString(),
    };
  });

  return paginate(rows, total, page, limit);
}

export async function setCustomerStatus(
  id: string,
  status: "ACTIVE" | "SUSPENDED",
  reason: string | undefined,
  admin: SignedInAdmin,
  req?: Request,
): Promise<AdminCustomerRow> {
  const customer = await Customer.findById(id).exec();
  if (!customer) {
    throw AppError.notFound("We cannot find that customer.");
  }

  const before = customer.status;
  customer.status = status;
  // Suspending signs them out of every browser they are signed in on.
  if (status === "SUSPENDED") {
    customer.tokenVersion += 1;
  }
  await customer.save();

  await recordAudit({
    actorType: "ADMIN",
    actor: admin._id,
    actorName: `${admin.firstName} ${admin.lastName}`,
    action: status === "SUSPENDED" ? "CUSTOMER_SUSPENDED" : "CUSTOMER_REACTIVATED",
    entityType: "Customer",
    entityId: customer._id,
    summary: `${customer.email} ${status === "SUSPENDED" ? "suspended" : "reactivated"}${reason ? ` — ${reason}` : ""}`,
    before: { status: before },
    after: { status, ...(reason ? { reason } : {}) },
    ...(req ? { req } : {}),
  });

  const [row] = (await listCustomers({ q: customer.email, limit: 1 }, { includeSpend: true })).data;
  if (!row) {
    throw new AppError(500, "UPDATE_FAILED", "The customer was updated but could not be read back.");
  }
  return row;
}

// ── Admin users ─────────────────────────────────────────────────────────────────────────────────────

/**
 * A temporary password the owner reads out once. Deliberately not a word anyone would choose: it exists to
 * be replaced at first sign-in, which `mustChangePassword` forces.
 */
function temporaryPassword(): string {
  const letters = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz";
  const digits = "23456789";
  const body = Array.from({ length: 8 }, () => letters[randomInt(letters.length)] as string).join("");
  const tail = Array.from({ length: 3 }, () => digits[randomInt(digits.length)] as string).join("");
  return `${body}${tail}`;
}

export async function listAdmins(): Promise<ReturnType<typeof toAdminDto>[]> {
  const admins = await Admin.find().sort({ role: 1, firstName: 1 }).lean<AdminDoc[]>().exec();
  return admins.map(toAdminDto);
}

export async function createAdmin(
  input: CreateAdminInput,
  owner: SignedInAdmin,
  req?: Request,
): Promise<{ admin: ReturnType<typeof toAdminDto>; temporaryPassword: string }> {
  const existing = await Admin.findOne({ email: input.email.toLowerCase() }).select("_id").lean().exec();
  if (existing) {
    throw AppError.badRequest("Someone already has that email address.", [
      { path: "email", message: "Already in use" },
    ]);
  }

  const password = temporaryPassword();
  const admin = await Admin.create({
    firstName: input.firstName,
    lastName: input.lastName,
    email: input.email.toLowerCase(),
    phone: input.phone ?? "",
    role: input.role,
    passwordHash: await hashPassword(password),
    mustChangePassword: true,
    createdBy: owner._id,
  });

  await recordAudit({
    actorType: "ADMIN",
    actor: owner._id,
    actorName: `${owner.firstName} ${owner.lastName}`,
    action: "ADMIN_CREATED",
    entityType: "Admin",
    entityId: admin._id,
    summary: `Created ${admin.email} as ${ADMIN_ROLE_LABEL[admin.role]}`,
    after: { email: admin.email, role: admin.role },
    ...(req ? { req } : {}),
  });

  // The invite says an account exists and where to sign in. The password is never in it — the owner hands
  // that over in person, which is the point of showing it once on screen.
  const settings = await loadSettings();
  await sendMailSafely(
    adminInviteEmail({
      to: admin.email,
      firstName: admin.firstName,
      role: ADMIN_ROLE_LABEL[admin.role],
      invitedBy: `${owner.firstName} ${owner.lastName}`,
      loginUrl: `${env.CLIENT_ORIGIN}/admin/login`,
      company: companyBlock(settings),
    }),
  );

  return { admin: toAdminDto(admin.toObject() as AdminDoc), temporaryPassword: password };
}

/**
 * The shop must never be left without an owner.
 *
 * It counts the active owners **other than** the one being changed: that is the number who would still be
 * owners afterwards, which is the question actually being asked. Counting everyone including the subject
 * would refuse demoting an already-suspended owner while an active one is standing right there.
 */
async function assertNotLastOwner(admin: AdminDoc, change: "role" | "suspend"): Promise<void> {
  if (admin.role !== "OWNER") {
    return;
  }
  const others = await Admin.countDocuments({
    role: "OWNER",
    status: "ACTIVE",
    _id: { $ne: admin._id },
  }).exec();

  if (others === 0) {
    throw new AppError(
      409,
      "LAST_OWNER",
      change === "role"
        ? "This is the only owner. Make someone else an owner first."
        : "This is the only owner. The shop cannot be left without one.",
    );
  }
}

export async function updateAdminRole(
  id: string,
  role: AdminRole,
  owner: SignedInAdmin,
  req?: Request,
): Promise<ReturnType<typeof toAdminDto>> {
  const admin = await Admin.findById(id).exec();
  if (!admin) {
    throw AppError.notFound("We cannot find that admin.");
  }
  if (admin._id.equals(owner._id)) {
    throw new AppError(409, "SELF_ROLE", "You cannot change your own role.");
  }
  if (admin.role === "OWNER" && role !== "OWNER") {
    await assertNotLastOwner(admin.toObject() as AdminDoc, "role");
  }

  const before = admin.role;
  admin.role = role;
  // What they may do has changed, so every session they have is re-issued against the new role.
  admin.tokenVersion += 1;
  await admin.save();

  await recordAudit({
    actorType: "ADMIN",
    actor: owner._id,
    actorName: `${owner.firstName} ${owner.lastName}`,
    action: "ADMIN_ROLE_CHANGED",
    entityType: "Admin",
    entityId: admin._id,
    summary: `${admin.email}: ${ADMIN_ROLE_LABEL[before]} → ${ADMIN_ROLE_LABEL[role]}`,
    before: { role: before },
    after: { role },
    ...(req ? { req } : {}),
  });

  return toAdminDto(admin.toObject() as AdminDoc);
}

export async function setAdminStatus(
  id: string,
  status: "ACTIVE" | "SUSPENDED",
  owner: SignedInAdmin,
  req?: Request,
): Promise<ReturnType<typeof toAdminDto>> {
  const admin = await Admin.findById(id).exec();
  if (!admin) {
    throw AppError.notFound("We cannot find that admin.");
  }
  if (admin._id.equals(owner._id)) {
    throw new AppError(409, "SELF_SUSPEND", "You cannot suspend your own account.");
  }
  if (status === "SUSPENDED") {
    await assertNotLastOwner(admin.toObject() as AdminDoc, "suspend");
  }

  const before = admin.status;
  admin.status = status;
  if (status === "SUSPENDED") {
    admin.tokenVersion += 1;
  }
  await admin.save();

  await recordAudit({
    actorType: "ADMIN",
    actor: owner._id,
    actorName: `${owner.firstName} ${owner.lastName}`,
    action: status === "SUSPENDED" ? "ADMIN_SUSPENDED" : "ADMIN_REACTIVATED",
    entityType: "Admin",
    entityId: admin._id,
    summary: `${admin.email} ${status === "SUSPENDED" ? "suspended" : "reactivated"}`,
    before: { status: before },
    after: { status },
    ...(req ? { req } : {}),
  });

  return toAdminDto(admin.toObject() as AdminDoc);
}

export async function resetAdminPassword(
  id: string,
  reason: string | undefined,
  owner: SignedInAdmin,
  req?: Request,
): Promise<{ admin: ReturnType<typeof toAdminDto>; temporaryPassword: string }> {
  const admin = await Admin.findById(id).exec();
  if (!admin) {
    throw AppError.notFound("We cannot find that admin.");
  }

  const password = temporaryPassword();
  admin.passwordHash = await hashPassword(password);
  admin.mustChangePassword = true;
  admin.failedLogins = 0;
  admin.lockedUntil = null;
  // Every session they had is dead: a reset is for when the old password may be known to someone else.
  admin.tokenVersion += 1;
  await admin.save();

  await recordAudit({
    actorType: "ADMIN",
    actor: owner._id,
    actorName: `${owner.firstName} ${owner.lastName}`,
    action: "ADMIN_PASSWORD_RESET",
    entityType: "Admin",
    entityId: admin._id,
    summary: `Reset the password for ${admin.email}${reason ? ` — ${reason}` : ""}`,
    after: { mustChangePassword: true, ...(reason ? { reason } : {}) },
    ...(req ? { req } : {}),
  });

  return { admin: toAdminDto(admin.toObject() as AdminDoc), temporaryPassword: password };
}
