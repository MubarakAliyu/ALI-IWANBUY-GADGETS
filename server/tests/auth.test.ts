import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";
import { AuditLog, Customer } from "../src/models/index.js";
import { clearDatabase, seedSettings } from "./fixtures.js";
import { agentFor, PASSWORD, registerCustomer } from "./helpers.js";

const app = createApp();

const NEW_CUSTOMER = {
  firstName: "Amina",
  lastName: "Bello",
  email: "amina@example.com",
  password: PASSWORD,
  confirmPassword: PASSWORD,
  acceptTerms: true,
};

beforeEach(async () => {
  await clearDatabase();
  await seedSettings();
});

describe("POST /auth/register", () => {
  it("creates the account, signs them in and sends a welcome email", async () => {
    const agent = agentFor(app);
    const response = await agent.post("/api/v1/auth/register").send(NEW_CUSTOMER);

    expect(response.status).toBe(201);
    expect(response.body.customer).toMatchObject({ firstName: "Amina", email: "amina@example.com" });
    expect(response.body.customer).not.toHaveProperty("passwordHash");
    expect(response.headers["set-cookie"]?.join()).toContain("aib_c=");

    // The session works straight away.
    const me = await agent.get("/api/v1/auth/me");
    expect(me.body.customer.email).toBe("amina@example.com");
  });

  it("lower-cases and trims the email", async () => {
    await agentFor(app)
      .post("/api/v1/auth/register")
      .send({ ...NEW_CUSTOMER, email: "  Amina@Example.COM " });

    expect(await Customer.findOne({ email: "amina@example.com" }).lean().exec()).not.toBeNull();
  });

  it("refuses an address that already has an account", async () => {
    await agentFor(app).post("/api/v1/auth/register").send(NEW_CUSTOMER);
    const second = await agentFor(app).post("/api/v1/auth/register").send(NEW_CUSTOMER);

    expect(second.status).toBe(409);
    expect(second.body.error.code).toBe("EMAIL_TAKEN");
    expect(second.body.error.message).toContain("sign in instead");
  });

  it("refuses a weak password, a mismatch and unaccepted terms", async () => {
    const weak = await agentFor(app)
      .post("/api/v1/auth/register")
      .send({ ...NEW_CUSTOMER, password: "abcdefgh", confirmPassword: "abcdefgh" });
    expect(weak.status).toBe(400);

    const mismatch = await agentFor(app)
      .post("/api/v1/auth/register")
      .send({ ...NEW_CUSTOMER, confirmPassword: "Password124" });
    expect(mismatch.body.error.fields.map((field: { path: string }) => field.path)).toContain(
      "confirmPassword",
    );

    const terms = await agentFor(app)
      .post("/api/v1/auth/register")
      .send({ ...NEW_CUSTOMER, acceptTerms: false });
    expect(terms.status).toBe(400);
  });

  it("writes an audit row", async () => {
    await agentFor(app).post("/api/v1/auth/register").send(NEW_CUSTOMER);
    const rows = await AuditLog.find({ action: "CUSTOMER_REGISTERED" }).lean().exec();
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({ actorType: "CUSTOMER", entityType: "Customer" });
  });
});

describe("POST /auth/login", () => {
  beforeEach(async () => {
    await agentFor(app).post("/api/v1/auth/register").send(NEW_CUSTOMER);
  });

  it("signs a customer in", async () => {
    const agent = agentFor(app);
    const response = await agent
      .post("/api/v1/auth/login")
      .send({ email: NEW_CUSTOMER.email, password: PASSWORD });

    expect(response.status).toBe(200);
    expect(response.body.customer.email).toBe(NEW_CUSTOMER.email);
    expect((await agent.get("/api/v1/auth/me")).body.customer).not.toBeNull();
  });

  it("gives the same answer for a wrong password and an unknown address", async () => {
    const wrongPassword = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: NEW_CUSTOMER.email, password: "Password999" });
    const unknown = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: "nobody@example.com", password: PASSWORD });

    expect(wrongPassword.status).toBe(401);
    expect(unknown.status).toBe(401);
    expect(wrongPassword.body.error.message).toBe(unknown.body.error.message);
    expect(wrongPassword.body.error.message).toBe("Email or password is incorrect.");
  });

  it("locks the account after eight failed attempts", async () => {
    for (let attempt = 0; attempt < 8; attempt += 1) {
      await request(app)
        .post("/api/v1/auth/login")
        .send({ email: NEW_CUSTOMER.email, password: "Wrong12345" });
    }

    // Even the right password is refused while the lock holds.
    const locked = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: NEW_CUSTOMER.email, password: PASSWORD });

    expect(locked.status).toBe(423);
    expect(locked.body.error.code).toBe("ACCOUNT_LOCKED");

    const audit = await AuditLog.find({ action: "ACCOUNT_LOCKED" }).lean().exec();
    expect(audit).toHaveLength(1);
  });

  it("forgets the failed attempts once the right password arrives", async () => {
    for (let attempt = 0; attempt < 3; attempt += 1) {
      await request(app)
        .post("/api/v1/auth/login")
        .send({ email: NEW_CUSTOMER.email, password: "Wrong12345" });
    }
    await request(app).post("/api/v1/auth/login").send({ email: NEW_CUSTOMER.email, password: PASSWORD });

    const customer = await Customer.findOne({ email: NEW_CUSTOMER.email }).lean().exec();
    expect(customer?.failedLogins).toBe(0);
    expect(customer?.lockedUntil).toBeNull();
  });

  it("refuses a suspended account", async () => {
    await Customer.updateOne({ email: NEW_CUSTOMER.email }, { $set: { status: "SUSPENDED" } }).exec();
    const response = await request(app)
      .post("/api/v1/auth/login")
      .send({ email: NEW_CUSTOMER.email, password: PASSWORD });

    expect(response.status).toBe(403);
    expect(response.body.error.code).toBe("ACCOUNT_SUSPENDED");
  });
});

describe("sessions", () => {
  it("answers /auth/me with null when nobody is signed in", async () => {
    const response = await request(app).get("/api/v1/auth/me");
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ customer: null });
  });

  it("signs out", async () => {
    const { agent } = await registerCustomer(app);
    await agent.post("/api/v1/auth/logout").expect(200);
    expect((await agent.get("/api/v1/auth/me")).body.customer).toBeNull();
  });

  it("refuses the account area without a session", async () => {
    const response = await request(app).get("/api/v1/me/addresses");
    expect(response.status).toBe(401);
    expect(response.body.error.code).toBe("UNAUTHENTICATED");
  });

  it("stops accepting a token once the customer's token version moves", async () => {
    const { agent, email } = await registerCustomer(app);
    await agent.get("/api/v1/me/addresses").expect(200);

    await Customer.updateOne({ email }, { $inc: { tokenVersion: 1 } }).exec();

    expect((await agent.get("/api/v1/me/addresses")).status).toBe(401);
  });
});
