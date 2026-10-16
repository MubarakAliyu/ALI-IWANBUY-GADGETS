/**
 * The demo seed's credentials (Batch 3 Part H.2).
 *
 * The repository is public and `pnpm seed` against a live database creates accounts that can confirm
 * payments, so in production the passwords and PINs must come from the environment. In development they stay
 * the obvious hard-coded values, because a demo password nobody can remember is no use in a classroom.
 *
 * `resolveDemoCredentials` reads `env.NODE_ENV`, which is parsed once at import. The tests therefore set the
 * variables and re-import the module with a fresh registry rather than trying to mutate a frozen value.
 */

import { afterEach, describe, expect, it, vi } from "vitest";

const PRODUCTION_ENV = {
  NODE_ENV: "production",
  MONGODB_URI: "mongodb://127.0.0.1:27017/aib_test",
  CUSTOMER_JWT_SECRET: "test-only-customer-signing-key-0001",
  ADMIN_JWT_SECRET: "test-only-admin-signing-key-000001",
};

/** Import the resolver with a given environment, isolated from every other test in this file. */
async function resolveWith(overrides: Record<string, string | undefined>) {
  vi.resetModules();

  const previous = { ...process.env };
  for (const [key, value] of Object.entries({ ...PRODUCTION_ENV, ...overrides })) {
    if (value === undefined) {
      delete process.env[key];
    } else {
      process.env[key] = value;
    }
  }

  try {
    const module = await import("../src/seed/demo-credentials.js");
    return module.resolveDemoCredentials();
  } finally {
    process.env = previous;
  }
}

const GOOD = {
  DEMO_ADMIN_PASSWORD: "A-Long-Enough-Secret-1",
  DEMO_CUSTOMER_PASSWORD: "Another-Long-One-2",
  DEMO_OWNER_PIN: "7351",
  DEMO_MANAGER_PIN: "9182",
};

afterEach(() => {
  vi.resetModules();
});

describe("in production", () => {
  it("refuses and names every variable that is missing", async () => {
    await expect(resolveWith({ ...GOOD, DEMO_OWNER_PIN: undefined })).rejects.toThrow(/DEMO_OWNER_PIN/);

    // With none of them set, all four are named rather than only the first.
    const error = await resolveWith({
      DEMO_ADMIN_PASSWORD: undefined,
      DEMO_CUSTOMER_PASSWORD: undefined,
      DEMO_OWNER_PIN: undefined,
      DEMO_MANAGER_PIN: undefined,
    }).catch((caught: unknown) => caught as Error);

    expect(error).toBeInstanceOf(Error);
    for (const name of Object.keys(GOOD)) {
      expect((error as Error).message).toContain(name);
    }
  });

  it("treats an empty or blank value as missing", async () => {
    await expect(resolveWith({ ...GOOD, DEMO_ADMIN_PASSWORD: "" })).rejects.toThrow(/DEMO_ADMIN_PASSWORD/);
    await expect(resolveWith({ ...GOOD, DEMO_CUSTOMER_PASSWORD: "   " })).rejects.toThrow(
      /DEMO_CUSTOMER_PASSWORD/,
    );
  });

  it("refuses a password under ten characters", async () => {
    await expect(resolveWith({ ...GOOD, DEMO_ADMIN_PASSWORD: "Short1!" })).rejects.toThrow(
      /DEMO_ADMIN_PASSWORD.*at least 10/s,
    );
    await expect(resolveWith({ ...GOOD, DEMO_CUSTOMER_PASSWORD: "Nine12345" })).rejects.toThrow(
      /DEMO_CUSTOMER_PASSWORD/,
    );
  });

  it("refuses a trivial PIN", async () => {
    for (const pin of ["1234", "0000", "1111", "4321", "123456"]) {
      await expect(resolveWith({ ...GOOD, DEMO_OWNER_PIN: pin })).rejects.toThrow(
        /DEMO_OWNER_PIN.*easy to guess/s,
      );
    }
  });

  it("refuses a PIN that is not four to six digits", async () => {
    for (const pin of ["123", "1234567", "12a4", "", "    "]) {
      await expect(resolveWith({ ...GOOD, DEMO_MANAGER_PIN: pin })).rejects.toThrow(/DEMO_MANAGER_PIN/);
    }
  });

  it("accepts values that pass, and uses exactly what was given", async () => {
    const credentials = await resolveWith(GOOD);

    expect(credentials).toEqual({
      adminPassword: GOOD.DEMO_ADMIN_PASSWORD,
      customerPassword: GOOD.DEMO_CUSTOMER_PASSWORD,
      ownerPin: GOOD.DEMO_OWNER_PIN,
      managerPin: GOOD.DEMO_MANAGER_PIN,
    });

    // Nothing hard-coded leaks through.
    expect(JSON.stringify(credentials)).not.toContain("Owner12345");
    expect(JSON.stringify(credentials)).not.toContain("8426");
  });

  it("says where to find the command rather than only what is wrong", async () => {
    const error = await resolveWith({ ...GOOD, DEMO_OWNER_PIN: undefined }).catch(
      (caught: unknown) => caught as Error,
    );
    expect((error as Error).message).toContain("DEPLOYMENT.md");
  });
});

describe("outside production", () => {
  it("uses the development defaults and ignores the environment", async () => {
    const credentials = await resolveWith({
      NODE_ENV: "development",
      // Set, and deliberately ignored: the defaults are what a local demo expects.
      DEMO_ADMIN_PASSWORD: "Something-Else-Entirely",
      DEMO_CUSTOMER_PASSWORD: undefined,
      DEMO_OWNER_PIN: undefined,
      DEMO_MANAGER_PIN: undefined,
    });

    expect(credentials).toEqual({
      adminPassword: "Owner12345",
      customerPassword: "Customer123",
      ownerPin: "8426",
      managerPin: "5193",
    });
  });

  it("needs nothing set at all", async () => {
    await expect(
      resolveWith({
        NODE_ENV: "development",
        DEMO_ADMIN_PASSWORD: undefined,
        DEMO_CUSTOMER_PASSWORD: undefined,
        DEMO_OWNER_PIN: undefined,
        DEMO_MANAGER_PIN: undefined,
      }),
    ).resolves.toMatchObject({ adminPassword: "Owner12345" });
  });
});
