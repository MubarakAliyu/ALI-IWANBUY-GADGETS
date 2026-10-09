/**
 * Helpers the account and order tests share: an agent that keeps its session cookie, and a shortcut for
 * creating a signed-in customer.
 */

import request from "supertest";
import type { Express } from "express";
import type TestAgent from "supertest/lib/agent.js";
import { Customer, Product } from "../src/models/index.js";

export type Agent = TestAgent<request.Test>;

export const PASSWORD = "Password123";

/** A supertest agent remembers cookies between calls, which is what a browser does. */
export function agentFor(app: Express): Agent {
  return request.agent(app);
}

export async function registerCustomer(
  app: Express,
  overrides: Partial<{ firstName: string; lastName: string; email: string; password: string }> = {},
): Promise<{ agent: Agent; email: string; id: string }> {
  const agent = agentFor(app);
  const email =
    overrides.email ?? `customer${Date.now()}${Math.random().toString(36).slice(2, 7)}@example.com`;
  const password = overrides.password ?? PASSWORD;

  const response = await agent.post("/api/v1/auth/register").send({
    firstName: overrides.firstName ?? "Amina",
    lastName: overrides.lastName ?? "Bello",
    email,
    password,
    confirmPassword: password,
    acceptTerms: true,
  });

  if (response.status !== 201) {
    throw new Error(
      `Could not register a test customer: ${response.status} ${JSON.stringify(response.body)}`,
    );
  }
  return { agent, email, id: response.body.customer.id as string };
}

/** A second browser signed in as the same customer — for the "other sessions are signed out" test. */
export async function signIn(app: Express, email: string, password = PASSWORD): Promise<Agent> {
  const agent = agentFor(app);
  const response = await agent.post("/api/v1/auth/login").send({ email, password });
  if (response.status !== 200) {
    throw new Error(`Could not sign in: ${response.status} ${JSON.stringify(response.body)}`);
  }
  return agent;
}

/** The first active variant of a fixture product, with the ids an order line needs. */
export async function lineFor(
  slug: string,
  qty = 1,
): Promise<{ productId: string; variantId: string; qty: number; priceKobo: number; stock: number }> {
  const product = await Product.findOne({ slug }).lean().exec();
  const variant = product?.variants[0];
  if (!product || !variant) {
    throw new Error(`Fixture product "${slug}" is missing.`);
  }
  return {
    productId: product._id.toString(),
    variantId: variant._id.toString(),
    qty,
    priceKobo: variant.priceKobo,
    stock: variant.stock,
  };
}

/** Set a variant's stock directly, for the races the order tests need to set up. */
export async function setStock(slug: string, stock: number): Promise<void> {
  const product = await Product.findOne({ slug }).select("variants").lean().exec();
  const variant = product?.variants[0];
  if (!product || !variant) {
    throw new Error(`Fixture product "${slug}" is missing.`);
  }
  const total = product.variants.reduce(
    (sum, candidate) => sum + (candidate._id.equals(variant._id) ? stock : candidate.stock),
    0,
  );
  await Product.updateOne(
    { _id: product._id, "variants._id": variant._id },
    { $set: { "variants.$.stock": stock, totalStock: total } },
  ).exec();
}

export async function stockOf(slug: string): Promise<number> {
  const product = await Product.findOne({ slug }).select("variants").lean().exec();
  return product?.variants[0]?.stock ?? -1;
}

export async function customerByEmail(email: string) {
  return Customer.findOne({ email }).lean().exec();
}
