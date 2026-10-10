import { beforeEach, describe, expect, it } from "vitest";
import { applySettingsDefaults } from "../src/scripts/apply-settings-defaults.js";
import { STORE_SETTINGS } from "../src/seed/data/store-settings.js";
import { Product, Setting } from "../src/models/index.js";
import { clearDatabase, seedFixture, seedSettings } from "./fixtures.js";

/**
 * The migration that brings a database seeded before the owner's details arrived up to date (ADR-017). What
 * matters is as much what it leaves alone as what it changes.
 */
describe("settings:apply-defaults", () => {
  beforeEach(async () => {
    await clearDatabase();
    await seedFixture();
    await seedSettings();
  });

  it("writes the owner's details over the placeholders", async () => {
    const { changed } = await applySettingsDefaults();

    expect(changed).toEqual(
      expect.arrayContaining(["registeredAddress", "shopAddress", "email", "bank", "openingHours"]),
    );

    const setting = await Setting.findOne().lean().exec();
    expect(setting?.shopAddress).toBe(STORE_SETTINGS.shopAddress);
    expect(setting?.email).toBe("iwanbuygadgets@gmail.com");
    expect(setting?.bank).toMatchObject({
      bankName: "Moniepoint",
      accountName: "ALI ABDULLAHI",
      accountNumber: "5737727740",
    });
    expect(setting?.openingHours).toHaveLength(2);
    expect(setting?.openingHours[0]).toMatchObject({ days: "Monday – Friday", opens: "8:00 am" });
  });

  it("changes nothing on a second run", async () => {
    await applySettingsDefaults();
    expect((await applySettingsDefaults()).changed).toEqual([]);
  });

  it("leaves the catalogue alone", async () => {
    const before = await Product.countDocuments();
    const iphone = await Product.findOne({ slug: "apple-iphone-15" }).lean().exec();

    await applySettingsDefaults();

    expect(await Product.countDocuments()).toBe(before);
    const after = await Product.findOne({ slug: "apple-iphone-15" }).lean().exec();
    expect(after?.variants[0]?.stock).toBe(iphone?.variants[0]?.stock);
    expect(after?.priceFromKobo).toBe(iphone?.priceFromKobo);
  });

  it("does not undo settings the owner has since tuned", async () => {
    // The owner raised the local delivery fee and the free-delivery threshold in admin.
    await Setting.updateOne(
      {},
      { $set: { "deliveryFees.localKobo": 250_000, freeDeliveryThresholdKobo: 80_000_000 } },
    ).exec();

    await applySettingsDefaults();

    const setting = await Setting.findOne().lean().exec();
    expect(setting?.deliveryFees.localKobo).toBe(250_000);
    expect(setting?.freeDeliveryThresholdKobo).toBe(80_000_000);
  });

  it("refuses to run against a database that has never been seeded", async () => {
    await Setting.deleteMany({}).exec();
    await expect(applySettingsDefaults()).rejects.toThrow("run `pnpm seed` first");
  });
});
