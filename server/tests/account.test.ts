import { beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";
import { AuditLog, Customer, Product } from "../src/models/index.js";
import { clearDatabase, seedFixture, seedSettings } from "./fixtures.js";
import { PASSWORD, registerCustomer, signIn, type Agent } from "./helpers.js";

const app = createApp();

const ADDRESS = {
  label: "Home",
  fullName: "Amina Bello",
  phone: "08039254143",
  line1: "12 Ahmadu Bello Way",
  city: "Birnin Kebbi",
  state: "Kebbi",
};

let agent: Agent;
let email: string;

beforeEach(async () => {
  await clearDatabase();
  await seedFixture();
  await seedSettings();
  ({ agent, email } = await registerCustomer(app));
});

describe("the email address is immutable", () => {
  it("refuses a profile update that carries an email", async () => {
    const response = await agent
      .patch("/api/v1/me/profile")
      .send({ firstName: "Amina", lastName: "Bello", email: "new@example.com" });

    expect(response.status).toBe(400);
    expect(response.body.error.code).toBe("EMAIL_IMMUTABLE");
    expect((await Customer.findOne({ email }).lean().exec())?.email).toBe(email);
  });

  it("ignores an email in a direct model update", async () => {
    await Customer.updateOne(
      { email },
      { $set: { email: "sneaky@example.com", firstName: "Changed" } },
    ).exec();

    const customer = await Customer.findById((await Customer.findOne({ email }).lean().exec())?._id)
      .lean()
      .exec();
    expect(customer?.email).toBe(email);
    expect(customer?.firstName).toBe("Changed");
  });

  it("ignores an email passed to create-time save of an existing document", async () => {
    const customer = await Customer.findOne({ email }).exec();
    if (!customer) {
      throw new Error("The test customer is missing.");
    }
    customer.set("email", "another@example.com");
    await customer.save();

    expect((await Customer.findById(customer._id).lean().exec())?.email).toBe(email);
  });
});

describe("PATCH /me/profile", () => {
  it("updates the name and normalises the phone number", async () => {
    const response = await agent
      .patch("/api/v1/me/profile")
      .send({ firstName: "Aminat", lastName: "Bello-Yusuf", phone: "0803 925 4143" });

    expect(response.status).toBe(200);
    expect(response.body.customer).toMatchObject({
      firstName: "Aminat",
      lastName: "Bello-Yusuf",
      phone: "+2348039254143",
    });

    const audit = await AuditLog.findOne({ action: "CUSTOMER_PROFILE_UPDATED" }).lean().exec();
    expect(audit?.diff?.after).toMatchObject({ firstName: "Aminat" });
  });

  it("refuses a phone number that is not Nigerian", async () => {
    const response = await agent
      .patch("/api/v1/me/profile")
      .send({ firstName: "Amina", lastName: "Bello", phone: "+1 555 0100" });

    expect(response.status).toBe(400);
  });
});

describe("POST /me/password", () => {
  it("changes the password and signs other sessions out", async () => {
    // A second browser, signed in as the same customer.
    const other = await signIn(app, email);

    const response = await agent.post("/api/v1/me/password").send({
      currentPassword: PASSWORD,
      newPassword: "BrandNew123",
      confirmPassword: "BrandNew123",
    });

    expect(response.status).toBe(200);

    // This session survives…
    expect((await agent.get("/api/v1/me/addresses")).status).toBe(200);
    // …the other one does not.
    expect((await other.get("/api/v1/me/addresses")).status).toBe(401);

    // And the new password is the one that works.
    const reSignedIn = await agent.post("/api/v1/auth/login").send({ email, password: "BrandNew123" });
    expect(reSignedIn.status).toBe(200);
  });

  it("refuses the wrong current password and an unchanged one", async () => {
    const wrong = await agent.post("/api/v1/me/password").send({
      currentPassword: "NotMyPassword1",
      newPassword: "BrandNew123",
      confirmPassword: "BrandNew123",
    });
    expect(wrong.status).toBe(400);
    expect(wrong.body.error.code).toBe("WRONG_PASSWORD");

    const same = await agent.post("/api/v1/me/password").send({
      currentPassword: PASSWORD,
      newPassword: PASSWORD,
      confirmPassword: PASSWORD,
    });
    expect(same.body.error.code).toBe("PASSWORD_UNCHANGED");
  });
});

describe("addresses", () => {
  it("adds, updates, defaults and deletes", async () => {
    const added = await agent.post("/api/v1/me/addresses").send(ADDRESS);
    expect(added.status).toBe(201);
    expect(added.body.data).toHaveLength(1);
    // The first address a customer saves is their default.
    expect(added.body.data[0]).toMatchObject({ isDefault: true, phone: "+2348039254143" });

    const second = await agent
      .post("/api/v1/me/addresses")
      .send({ ...ADDRESS, label: "Shop", line1: "7 Olumbu Plaza" });
    expect(second.body.data).toHaveLength(2);
    expect(second.body.data[1].isDefault).toBe(false);

    const id = second.body.data[1].id as string;
    const updated = await agent.patch(`/api/v1/me/addresses/${id}`).send({ ...ADDRESS, city: "Kalgo" });
    expect(updated.body.data[1].city).toBe("Kalgo");

    const defaulted = await agent.post(`/api/v1/me/addresses/${id}/default`).send();
    expect(defaulted.body.data.find((address: { id: string }) => address.id === id).isDefault).toBe(true);
    expect(defaulted.body.data.filter((address: { isDefault: boolean }) => address.isDefault)).toHaveLength(
      1,
    );

    const deleted = await agent.delete(`/api/v1/me/addresses/${id}`);
    expect(deleted.body.data).toHaveLength(1);
    // Deleting the default promotes the one that is left.
    expect(deleted.body.data[0].isDefault).toBe(true);
  });

  it("stops at five addresses", async () => {
    for (let index = 0; index < 5; index += 1) {
      await agent.post("/api/v1/me/addresses").send({ ...ADDRESS, line1: `${index} Test Street` });
    }

    const sixth = await agent.post("/api/v1/me/addresses").send({ ...ADDRESS, line1: "6 Too Many Road" });
    expect(sixth.status).toBe(409);
    expect(sixth.body.error.code).toBe("TOO_MANY_ADDRESSES");
  });

  it("refuses a state that is not Nigerian and an address that is not theirs", async () => {
    const badState = await agent.post("/api/v1/me/addresses").send({ ...ADDRESS, state: "Lancashire" });
    expect(badState.status).toBe(400);

    const other = await registerCustomer(app);
    const theirs = await other.agent.post("/api/v1/me/addresses").send(ADDRESS);
    const stolen = await agent.delete(`/api/v1/me/addresses/${theirs.body.data[0].id}`);
    expect(stolen.status).toBe(404);
  });
});

describe("the wishlist", () => {
  it("adds, lists and removes", async () => {
    const products = await Product.find({ status: "ACTIVE" }).select("_id").lean().exec();
    const productId = products[0]?._id.toString() as string;

    const added = await agent.post(`/api/v1/me/wishlist/${productId}`).send();
    expect(added.body.count).toBe(1);

    // Saving the same product twice does not duplicate it.
    expect((await agent.post(`/api/v1/me/wishlist/${productId}`).send()).body.count).toBe(1);

    const list = await agent.get("/api/v1/me/wishlist");
    expect(list.body.data).toHaveLength(1);
    expect(list.body.data[0]).toMatchObject({ id: productId });

    const removed = await agent.delete(`/api/v1/me/wishlist/${productId}`).send();
    expect(removed.body.count).toBe(0);
    expect((await agent.get("/api/v1/me/wishlist")).body.data).toEqual([]);
  });

  it("refuses a product that is not on sale", async () => {
    const draft = await Product.findOne({ status: "DRAFT" }).select("_id").lean().exec();

    const response = await agent.post(`/api/v1/me/wishlist/${draft?._id.toString()}`).send();
    expect(response.status).toBe(404);
  });
});
