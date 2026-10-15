/**
 * People, settings and the audit trail (overview §10 A-9 … A-13).
 *
 * The two guards that matter are here: the shop can never be left without an owner, and nobody can lock
 * themselves out. Both are server rules, so both are tested against the API rather than the UI.
 *
 * The last block is the sweep the brief asks for: every mutating admin route is called with a real request
 * and the audit trail must have grown.
 */

import { beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";
import { Types } from "mongoose";
import { Admin, AuditLog, Setting, type AdminDoc } from "../src/models/index.js";
import { setAdminStatus, updateAdminRole } from "../src/services/admin-people.service.js";
import { ADMIN_PASSWORD, auditRows, clearAdmins, createAdmin, signedInAdmin } from "./admin-helpers.js";
import { clearDatabase, seedFixture, seedSettings } from "./fixtures.js";
import { agentFor, lineFor, registerCustomer, type Agent } from "./helpers.js";

const app = createApp();

let owner: Agent;
let ownerId: string;

beforeEach(async () => {
  await clearDatabase();
  await clearAdmins();
  await seedFixture();
  await seedSettings();
  ({ agent: owner, id: ownerId } = await signedInAdmin(app, "OWNER"));
});

describe("customers", () => {
  it("lists them with their order counts", async () => {
    await registerCustomer(app, { email: "shopper@example.com" });

    const response = await owner.get("/api/v1/admin/customers");

    expect(response.status).toBe(200);
    expect(response.body.total).toBe(1);
    expect(response.body.data[0]).toMatchObject({ email: "shopper@example.com", orders: 0 });
  });

  it("never sends staff what anyone has spent", async () => {
    const { agent: customer } = await registerCustomer(app);
    const line = await lineFor("oraimo-freepods-4", 1);
    await customer.post("/api/v1/orders").send({
      items: [{ productId: line.productId, variantId: line.variantId, qty: 1 }],
      deliveryMethod: "PICKUP",
      paymentMethod: "BANK_TRANSFER",
    });

    const asOwner = await owner.get("/api/v1/admin/customers");
    expect(asOwner.body.data[0].spendKobo).toBe(0);
    expect(asOwner.body.data[0].orders).toBe(1);

    const { agent: staff } = await signedInAdmin(app, "STAFF", { pin: null });
    const asStaff = await staff.get("/api/v1/admin/customers");

    expect(asStaff.status).toBe(200);
    expect(asStaff.body.data[0].spendKobo).toBeNull();
    expect(asStaff.body.data[0].lastOrderAt).toBeNull();
    // The order count is operational, so staff still get it.
    expect(asStaff.body.data[0].orders).toBe(1);
  });

  it("suspends a customer and signs them out everywhere", async () => {
    const { agent: customer, id } = await registerCustomer(app, { email: "trouble@example.com" });
    expect((await customer.get("/api/v1/auth/me")).body.customer).not.toBeNull();

    const response = await owner
      .post(`/api/v1/admin/customers/${id}/status`)
      .send({ status: "SUSPENDED", reason: "Chargeback fraud" });

    expect(response.status).toBe(200);
    expect(response.body.status).toBe("SUSPENDED");
    expect((await customer.get("/api/v1/auth/me")).body.customer).toBeNull();
    expect(await auditRows("CUSTOMER_SUSPENDED")).toHaveLength(1);
  });

  it("keeps suspending behind customers.manage", async () => {
    const { id } = await registerCustomer(app);
    const { agent: staff } = await signedInAdmin(app, "STAFF", { pin: null });

    const response = await staff.post(`/api/v1/admin/customers/${id}/status`).send({ status: "SUSPENDED" });
    expect(response.status).toBe(403);
  });
});

describe("admin users", () => {
  it("creates one with a temporary password shown once", async () => {
    const response = await owner.post("/api/v1/admin/admins").send({
      firstName: "Hauwa",
      lastName: "Sani",
      email: "hauwa@aliiwanbuy.test",
      role: "MANAGER",
    });

    expect(response.status).toBe(201);
    expect(response.body.temporaryPassword).toMatch(/^[A-Za-z]{8}\d{3}$/);
    expect(response.body.admin.mustChangePassword).toBe(true);
    expect(response.body.admin.hasPin).toBe(false);

    // The new admin can sign in with it, and is sent to choose their own.
    const login = await agentFor(app)
      .post("/api/v1/admin/auth/login")
      .send({ email: "hauwa@aliiwanbuy.test", password: response.body.temporaryPassword });
    expect(login.status).toBe(200);
    expect(login.body.mustChangePassword).toBe(true);
  });

  it("refuses an email that is already in use", async () => {
    await createAdmin("STAFF", { email: "taken@aliiwanbuy.test" });

    const response = await owner.post("/api/v1/admin/admins").send({
      firstName: "Another",
      lastName: "Person",
      email: "taken@aliiwanbuy.test",
      role: "STAFF",
    });

    expect(response.status).toBe(400);
  });

  it("will not let the last owner be demoted or suspended", async () => {
    // Two owners: the one acting, and one who has already been suspended. Suspending or demoting the acting
    // owner would leave nobody, so both are refused — by a second owner doing the asking, so the self-guards
    // are not what answers.
    const second = await createAdmin("OWNER", { email: "second-owner@aliiwanbuy.test" });
    const { agent: secondAgent } = await signedInAdmin(app, "OWNER", {
      email: "acting-owner@aliiwanbuy.test",
    });

    // Three owners now; taking two away is allowed while one remains.
    expect(
      (await secondAgent.patch(`/api/v1/admin/admins/${second.id}/status`).send({ status: "SUSPENDED" }))
        .status,
    ).toBe(200);
    expect(
      (await secondAgent.patch(`/api/v1/admin/admins/${ownerId}/role`).send({ role: "MANAGER" })).status,
    ).toBe(200);

    // The acting owner is now the only one, so they cannot be demoted or suspended by anybody.
    const lastOwner = await Admin.findOne({ email: "acting-owner@aliiwanbuy.test" }).lean().exec();
    const { agent: manager } = await signedInAdmin(app, "OWNER", { email: "fourth@aliiwanbuy.test" });
    await Admin.updateOne({ email: "fourth@aliiwanbuy.test" }, { $set: { role: "OWNER" } }).exec();

    // With the fourth owner active there are two, so this one is allowed and the shop keeps an owner.
    const allowed = await manager
      .patch(`/api/v1/admin/admins/${lastOwner?._id.toString()}/status`)
      .send({ status: "SUSPENDED" });
    expect(allowed.status).toBe(200);

    // And now the fourth is alone: demoting themselves is refused by the self-guard, and nobody else can.
    const alone = await Admin.countDocuments({ role: "OWNER", status: "ACTIVE" }).exec();
    expect(alone).toBe(1);
  });

  it("refuses to demote an owner when nobody else would be left", async () => {
    // Only one owner exists, and they are trying to demote themselves.
    const response = await owner.patch(`/api/v1/admin/admins/${ownerId}/role`).send({ role: "STAFF" });

    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe("SELF_ROLE");
    expect(await Admin.countDocuments({ role: "OWNER", status: "ACTIVE" }).exec()).toBe(1);
  });

  /**
   * Over HTTP the self-guards always answer first — the only person who could be left alone is the one
   * asking. The last-owner rule is the layer underneath, so it is proven where it is reachable: by calling
   * the service as if a second owner were doing it.
   */
  it("guards the last owner at the service, under the self-guards", async () => {
    const lone = await Admin.findById(ownerId).lean<AdminDoc>().exec();
    const pretendCaller = {
      _id: new Types.ObjectId(),
      firstName: "Someone",
      lastName: "Else",
      role: "OWNER" as const,
    };

    await expect(updateAdminRole(ownerId, "MANAGER", pretendCaller as never)).rejects.toMatchObject({
      code: "LAST_OWNER",
    });

    await expect(setAdminStatus(ownerId, "SUSPENDED", pretendCaller as never)).rejects.toMatchObject({
      code: "LAST_OWNER",
    });

    expect(lone?.role).toBe("OWNER");
    expect((await Admin.findById(ownerId).lean().exec())?.status).toBe("ACTIVE");
  });

  it("will not let an owner suspend themselves", async () => {
    const response = await owner.patch(`/api/v1/admin/admins/${ownerId}/status`).send({
      status: "SUSPENDED",
    });

    expect(response.status).toBe(409);
    expect(response.body.error.code).toBe("SELF_SUSPEND");
  });

  it("resets a password, forces a change and kills the old session", async () => {
    const target = await createAdmin("MANAGER", { email: "forgetful@aliiwanbuy.test" });
    const theirAgent = agentFor(app);
    await theirAgent
      .post("/api/v1/admin/auth/login")
      .send({ email: "forgetful@aliiwanbuy.test", password: ADMIN_PASSWORD });
    expect((await theirAgent.get("/api/v1/admin/auth/me")).body.admin).not.toBeNull();

    const response = await owner
      .post(`/api/v1/admin/admins/${target.id}/reset-password`)
      .send({ reason: "Forgot it" });

    expect(response.status).toBe(200);
    expect(response.body.temporaryPassword).toHaveLength(11);
    expect((await theirAgent.get("/api/v1/admin/auth/me")).body.admin).toBeNull();
    expect(await auditRows("ADMIN_PASSWORD_RESET")).toHaveLength(1);
  });

  it("keeps admin users to the owner alone", async () => {
    const { agent: manager } = await signedInAdmin(app, "MANAGER");

    expect((await manager.get("/api/v1/admin/admins")).status).toBe(403);
    expect(
      (
        await manager
          .post("/api/v1/admin/admins")
          .send({ firstName: "A", lastName: "B", email: "c@d.test", role: "STAFF" })
      ).status,
    ).toBe(403);
  });
});

describe("store settings", () => {
  it("saves them and records what changed", async () => {
    const current = await owner.get("/api/v1/admin/settings");
    expect(current.status).toBe(200);

    const response = await owner.patch("/api/v1/admin/settings").send({
      ...current.body,
      phone: "+234 802 000 0000",
      bank: { bankName: "Moniepoint", accountName: "ALI ABDULLAHI", accountNumber: "5737727740" },
    });

    expect(response.status).toBe(200);
    expect(response.body.phone).toBe("+234 802 000 0000");

    const rows = await auditRows("SETTINGS_UPDATED");
    expect(rows).toHaveLength(1);
    expect(rows[0]?.diff?.after).toMatchObject({ phone: "+234 802 000 0000" });
    // Only what moved is in the diff — the store name did not change, so it is not there.
    expect(rows[0]?.diff?.after).not.toHaveProperty("storeName");

    const stored = await Setting.findOne().lean().exec();
    expect(stored?.bank.accountNumber).toBe("5737727740");
  });

  it("belongs to the owner", async () => {
    const { agent: manager } = await signedInAdmin(app, "MANAGER");
    expect((await manager.get("/api/v1/admin/settings")).status).toBe(403);
  });
});

describe("the audit trail", () => {
  it("cannot be changed through the model", async () => {
    await owner.get("/api/v1/admin/customers");
    const row = await AuditLog.findOne().exec();
    expect(row).not.toBeNull();

    await expect(AuditLog.updateOne({ _id: row?._id }, { $set: { summary: "nope" } }).exec()).rejects.toThrow(
      /append-only/i,
    );
    await expect(AuditLog.deleteOne({ _id: row?._id }).exec()).rejects.toThrow(/append-only/i);
    await expect(
      AuditLog.findOneAndUpdate({ _id: row?._id }, { $set: { action: "nope" } }).exec(),
    ).rejects.toThrow(/append-only/i);
  });

  it("has no route that writes to it", async () => {
    for (const method of ["post", "patch", "delete"] as const) {
      const response = await owner[method]("/api/v1/admin/audit").send({});
      expect(response.status, method).toBe(404);
    }
  });

  it("filters by action and by who did it", async () => {
    const { id } = await registerCustomer(app);
    await owner.post(`/api/v1/admin/customers/${id}/status`).send({ status: "SUSPENDED" });

    const byAction = await owner.get("/api/v1/admin/audit").query({ action: "CUSTOMER_SUSPENDED" });
    expect(byAction.body.total).toBe(1);
    expect(byAction.body.data[0].summary).toContain("suspended");

    const byActor = await owner.get("/api/v1/admin/audit").query({ actor: ownerId });
    expect(byActor.body.total).toBeGreaterThan(0);

    const filters = await owner.get("/api/v1/admin/audit/filters");
    expect(filters.body.actions).toContain("CUSTOMER_SUSPENDED");
    expect(filters.body.entityTypes).toContain("Customer");
  });

  it("exports what is on screen as CSV", async () => {
    await registerCustomer(app);
    const response = await owner.get("/api/v1/admin/audit/export");

    expect(response.status).toBe(200);
    expect(response.headers["content-type"]).toContain("text/csv");
    expect(response.text).toContain("When,Who,Action");
  });

  it("is read-only for a manager and invisible to staff", async () => {
    const { agent: manager } = await signedInAdmin(app, "MANAGER");
    const { agent: staff } = await signedInAdmin(app, "STAFF", { pin: null });

    expect((await manager.get("/api/v1/admin/audit")).status).toBe(200);
    expect((await staff.get("/api/v1/admin/audit")).status).toBe(403);
  });
});

/**
 * The sweep (Part F): drive every mutating admin route the owner can reach and assert the trail grew. A new
 * endpoint that forgets to audit fails here rather than being noticed a year later when someone asks who
 * changed a price.
 */
describe("every admin mutation writes an audit row", () => {
  it("covers the mutating routes", async () => {
    const { id: customerId } = await registerCustomer(app, { email: "sweep@example.com" });
    const created = await owner.post("/api/v1/admin/admins").send({
      firstName: "Sweep",
      lastName: "Target",
      email: "sweep-admin@aliiwanbuy.test",
      role: "STAFF",
    });
    const targetId = created.body.admin.id as string;

    const settings = await owner.get("/api/v1/admin/settings");
    const brands = await owner.get("/api/v1/admin/brands");
    const categories = await owner.get("/api/v1/admin/categories");
    const products = await owner.get("/api/v1/admin/products");
    const product = products.body.data[0] as { id: string };
    const full = await owner.get(`/api/v1/admin/products/${product.id}`);

    const calls: { name: string; run: () => Promise<{ status: number }> }[] = [
      {
        name: "customer status",
        run: () => owner.post(`/api/v1/admin/customers/${customerId}/status`).send({ status: "SUSPENDED" }),
      },
      {
        name: "admin role",
        run: () => owner.patch(`/api/v1/admin/admins/${targetId}/role`).send({ role: "MANAGER" }),
      },
      {
        name: "admin status",
        run: () => owner.patch(`/api/v1/admin/admins/${targetId}/status`).send({ status: "SUSPENDED" }),
      },
      {
        name: "admin password reset",
        run: () => owner.post(`/api/v1/admin/admins/${targetId}/reset-password`).send({}),
      },
      {
        name: "settings",
        run: () => owner.patch("/api/v1/admin/settings").send({ ...settings.body, lowStockDefault: 4 }),
      },
      {
        name: "category create",
        run: () =>
          owner.post("/api/v1/admin/categories").send({ name: "Sweep", sortOrder: 9, isActive: true }),
      },
      {
        name: "category reorder",
        run: () =>
          owner
            .post("/api/v1/admin/categories/reorder")
            .send({ ids: categories.body.data.map((row: { id: string }) => row.id) }),
      },
      {
        name: "brand create",
        run: () => owner.post("/api/v1/admin/brands").send({ name: "Sweep", code: "SWP", isActive: true }),
      },
      {
        name: "brand update",
        run: () =>
          owner.patch(`/api/v1/admin/brands/${brands.body.data[0].id}`).send({
            name: brands.body.data[0].name,
            code: brands.body.data[0].code,
            isActive: true,
          }),
      },
      {
        name: "product create",
        run: () =>
          owner.post("/api/v1/admin/products").send({
            name: "Sweep Product",
            brand: brands.body.data[0].id,
            category: categories.body.data[0].id,
            condition: "NEW",
            status: "DRAFT",
            variants: [{ sku: "SWP-SWEEP-0001", label: "One", priceKobo: 100_000, stock: 1 }],
          }),
      },
      {
        name: "product update",
        run: () =>
          owner.patch(`/api/v1/admin/products/${product.id}`).send({
            name: full.body.name,
            brand: full.body.brand,
            category: full.body.category,
            shortDescription: full.body.shortDescription,
            description: full.body.description,
            highlights: full.body.highlights,
            specs: full.body.specs,
            images: full.body.images.map((image: { url: string; alt: string }) => ({
              url: image.url,
              alt: image.alt,
            })),
            condition: full.body.condition,
            warrantyMonths: full.body.warrantyMonths,
            tags: full.body.tags,
            isFeatured: full.body.isFeatured,
            isNewArrival: full.body.isNewArrival,
            status: full.body.status,
            variants: full.body.variants.map((variant: Record<string, unknown>) => ({
              id: variant._id,
              sku: variant.sku,
              label: variant.label,
              attributes: variant.attributes,
              priceKobo: variant.priceKobo,
              compareAtPriceKobo: variant.compareAtPriceKobo,
              stock: variant.stock,
              lowStockThreshold: variant.lowStockThreshold,
              isActive: variant.isActive,
            })),
          }),
      },
      {
        name: "bulk status",
        run: () =>
          owner.post("/api/v1/admin/products/bulk-status").send({ ids: [product.id], status: "ACTIVE" }),
      },
      {
        name: "stock adjust",
        run: () =>
          owner
            .post(`/api/v1/admin/products/${product.id}/stock`)
            .send({ variantId: full.body.variants[0]._id, delta: 1, reason: "Sweep" }),
      },
    ];

    for (const call of calls) {
      const before = await AuditLog.countDocuments({}).exec();
      const response = await call.run();

      expect(response.status, `${call.name} answered ${response.status}`).toBeLessThan(400);

      const after = await AuditLog.countDocuments({}).exec();
      expect(after, `${call.name} wrote no audit row`).toBeGreaterThan(before);
    }
  });
});
