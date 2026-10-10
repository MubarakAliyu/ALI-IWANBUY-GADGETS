/**
 * Admin sign-in, the permission matrix and the payment PIN (overview §3.2, §6.5).
 *
 * These are the tests that matter most on the admin side: a role that cannot do something must be refused by
 * the **server**, whatever the dashboard shows, and the PIN must actually stand in the way of money moving.
 */

import { beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";
import { Admin } from "../src/models/index.js";
import { ADMIN_PASSWORD, ADMIN_PIN, auditRows, clearAdmins, createAdmin, signedInAdmin } from "./admin-helpers.js";
import { clearDatabase, seedFixture, seedSettings } from "./fixtures.js";
import { agentFor } from "./helpers.js";

const app = createApp();

beforeEach(async () => {
  await clearDatabase();
  await clearAdmins();
  await seedFixture();
  await seedSettings();
});

describe("POST /admin/auth/login", () => {
  it("signs an admin in and reports what their role allows", async () => {
    const { email } = await createAdmin("MANAGER");
    const agent = agentFor(app);

    const response = await agent.post("/api/v1/admin/auth/login").send({ email, password: ADMIN_PASSWORD });

    expect(response.status).toBe(200);
    expect(response.body.admin.role).toBe("MANAGER");
    expect(response.body.mustChangePassword).toBe(false);

    const me = await agent.get("/api/v1/admin/auth/me");
    expect(me.status).toBe(200);
    expect(me.body.permissions).toContain("orders.fulfil");
    expect(me.body.permissions).not.toContain("admins.manage");
  });

  it("gives the same answer for a wrong password and an unknown email", async () => {
    const { email } = await createAdmin("OWNER");

    const wrong = await agentFor(app)
      .post("/api/v1/admin/auth/login")
      .send({ email, password: "NotThePassword1" });
    const unknown = await agentFor(app)
      .post("/api/v1/admin/auth/login")
      .send({ email: "nobody@aliiwanbuy.test", password: ADMIN_PASSWORD });

    expect(wrong.status).toBe(401);
    expect(unknown.status).toBe(401);
    expect(wrong.body.error.message).toBe(unknown.body.error.message);
  });

  it("refuses a suspended account", async () => {
    const { id, email } = await createAdmin("STAFF");
    await Admin.updateOne({ _id: id }, { $set: { status: "SUSPENDED" } }).exec();

    const response = await agentFor(app)
      .post("/api/v1/admin/auth/login")
      .send({ email, password: ADMIN_PASSWORD });

    expect(response.status).toBe(403);
  });

  it("locks the account after eight wrong passwords", async () => {
    const { email } = await createAdmin("MANAGER");
    const agent = agentFor(app);

    for (let attempt = 0; attempt < 8; attempt += 1) {
      await agent.post("/api/v1/admin/auth/login").send({ email, password: "Wrong12345" });
    }

    const locked = await agent.post("/api/v1/admin/auth/login").send({ email, password: ADMIN_PASSWORD });
    expect(locked.status).toBe(423);

    const admin = await Admin.findOne({ email }).lean().exec();
    expect(admin?.lockedUntil).toBeInstanceOf(Date);
  });

  it("will not let an admin with a temporary password reach anything else", async () => {
    const { agent } = await signedInAdmin(app, "MANAGER", { email: "temp@aliiwanbuy.test" });
    await Admin.updateOne({ email: "temp@aliiwanbuy.test" }, { $set: { mustChangePassword: true } }).exec();

    const orders = await agent.get("/api/v1/admin/orders");
    expect(orders.status).toBe(403);
    expect(orders.body.error.code).toBe("PASSWORD_CHANGE_REQUIRED");

    const changed = await agent.post("/api/v1/admin/auth/change-password").send({
      currentPassword: ADMIN_PASSWORD,
      newPassword: "ChosenByMe123",
      confirmPassword: "ChosenByMe123",
    });
    expect(changed.status).toBe(200);
  });
});

describe("requirePermission", () => {
  it("lets staff fulfil an order but not cancel one", async () => {
    const { agent } = await signedInAdmin(app, "STAFF", { pin: null });

    const list = await agent.get("/api/v1/admin/orders");
    expect(list.status).toBe(200);

    const cancel = await agent
      .post("/api/v1/admin/orders/AIB-ORD-202610-0001/cancel")
      .send({ reason: "Customer changed their mind" });
    expect(cancel.status).toBe(403);
    expect(cancel.body.error.code).toBe("FORBIDDEN");
  });

  it("keeps staff away from the money entirely", async () => {
    const { agent } = await signedInAdmin(app, "STAFF", { pin: null });

    for (const path of ["/api/v1/admin/payments", "/api/v1/admin/payments/awaiting", "/api/v1/admin/invoices"]) {
      expect((await agent.get(path)).status, path).toBe(403);
    }
  });

  it("reserves voiding an invoice for the owner", async () => {
    const manager = await signedInAdmin(app, "MANAGER");
    const refused = await manager.agent
      .post("/api/v1/admin/invoices/AIB-INV-202610-0001/void")
      .send({ reason: "Issued twice" });
    expect(refused.status).toBe(403);
  });

  it("writes an audit row every time a role is refused", async () => {
    const { agent, id } = await signedInAdmin(app, "STAFF", { pin: null });
    await agent.get("/api/v1/admin/payments");

    const rows = await auditRows("PERMISSION_DENIED");
    expect(rows).toHaveLength(1);
    expect(rows[0]?.actor?.toString()).toBe(id);
    expect(rows[0]?.summary).toContain("payments.view");
  });

  it("refuses everything when nobody is signed in", async () => {
    const response = await agentFor(app).get("/api/v1/admin/orders");
    expect(response.status).toBe(401);
  });
});

describe("the payment PIN", () => {
  it("refuses a trivial PIN", async () => {
    const { agent } = await signedInAdmin(app, "MANAGER", { pin: null });

    const response = await agent
      .post("/api/v1/admin/me/pin")
      .send({ pin: "1234", confirmPin: "1234", password: ADMIN_PASSWORD });

    expect(response.status).toBe(400);
    expect(JSON.stringify(response.body)).toMatch(/easy to guess|not allowed|too simple/i);
  });

  it("sets a first PIN against the password, then needs the old PIN to change it", async () => {
    const { agent } = await signedInAdmin(app, "MANAGER", { pin: null });

    const first = await agent
      .post("/api/v1/admin/me/pin")
      .send({ pin: "7351", confirmPin: "7351", password: ADMIN_PASSWORD });
    expect(first.status).toBe(200);

    const withoutProof = await agent.post("/api/v1/admin/me/pin").send({ pin: "9182", confirmPin: "9182" });
    expect(withoutProof.status).toBe(400);

    const withOldPin = await agent
      .post("/api/v1/admin/me/pin")
      .send({ pin: "9182", confirmPin: "9182", currentPin: "7351" });
    expect(withOldPin.status).toBe(200);
  });

  it("locks the PIN for fifteen minutes after five wrong tries", async () => {
    const { agent, id } = await signedInAdmin(app, "OWNER");

    // The order number does not exist; the PIN is checked first, which is the point.
    for (let attempt = 0; attempt < 5; attempt += 1) {
      await agent
        .post("/api/v1/admin/orders/AIB-ORD-202610-9999/confirm-payment")
        .send({ amountKobo: 1_000, reference: "x", pin: "1357" });
    }

    const locked = await agent
      .post("/api/v1/admin/orders/AIB-ORD-202610-9999/confirm-payment")
      .send({ amountKobo: 1_000, reference: "x", pin: ADMIN_PIN });

    expect(locked.status).toBe(423);
    expect(locked.body.error.message).toMatch(/minute/i);

    const admin = await Admin.findById(id).lean().exec();
    expect(admin?.pinLockedUntil).toBeInstanceOf(Date);
    expect(await auditRows("PIN_LOCKED")).toHaveLength(1);
  });
});
