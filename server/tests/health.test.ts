import request from "supertest";
import { describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";

const app = createApp();

describe("GET /api/health", () => {
  it("reports the database as up once connected", async () => {
    const response = await request(app).get("/api/health");
    expect(response.status).toBe(200);
    expect(response.body).toEqual({ ok: true, db: "up" });
  });
});

describe("unknown routes", () => {
  it("answer with the standard error shape", async () => {
    const response = await request(app).get("/api/v1/nope");
    expect(response.status).toBe(404);
    expect(response.body.error.code).toBe("NOT_FOUND");
    expect(response.body.error.message).toContain("/api/v1/nope");
  });
});

describe("request hardening", () => {
  it("strips Mongo operators from a request body", async () => {
    const response = await request(app)
      .post("/api/v1/cart/validate")
      .send({ items: [{ $where: "1", productId: "x", variantId: "y", qty: 1 }] });

    // The operator is gone before validation runs, so the body fails on its real fields instead.
    expect(response.status).toBe(400);
    expect(response.body.error.fields.map((field: { path: string }) => field.path)).toEqual(
      expect.arrayContaining(["items.0.productId"]),
    );
  });
});
