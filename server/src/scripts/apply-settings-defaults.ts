/**
 * `pnpm settings:apply-defaults` — bring an already-seeded database up to the owner's real store details
 * (ADR-017) without touching anything else.
 *
 * Re-seeding would have worked on a laptop and been a disaster anywhere real: it would take the catalogue,
 * the customers and every order with it. This script writes exactly the fields the owner supplied, to the one
 * `Setting` document, and leaves products, customers, orders and the settings the owner has since tuned —
 * delivery fees, thresholds, the invoice note — alone.
 *
 * It is safe to run repeatedly: a second run reports that there is nothing to do.
 */

import { connectDatabase, disconnectDatabase } from "../db.js";
import { Setting, type SettingDoc } from "../models/index.js";
import { OWNER_SUPPLIED_FIELDS, STORE_SETTINGS } from "../seed/data/store-settings.js";

type OwnerField = (typeof OWNER_SUPPLIED_FIELDS)[number];

function describe(value: unknown): string {
  if (Array.isArray(value)) {
    return value.map((entry) => JSON.stringify(entry)).join(", ") || "(none)";
  }
  if (value !== null && typeof value === "object") {
    return Object.values(value as Record<string, unknown>).join(" · ");
  }
  return String(value ?? "(empty)");
}

export async function applySettingsDefaults(): Promise<{ changed: OwnerField[] }> {
  const setting = await Setting.findOne().exec();
  if (!setting) {
    throw new Error("There is no Setting document yet — run `pnpm seed` first.");
  }

  const changed: OwnerField[] = [];

  for (const field of OWNER_SUPPLIED_FIELDS) {
    const wanted = STORE_SETTINGS[field];
    const current = setting.get(field) as unknown;

    // Mongoose subdocuments do not compare usefully, so both sides go through JSON.
    const currentJson = JSON.stringify(
      current && typeof current === "object" && "toObject" in (current as object)
        ? (current as { toObject: () => unknown }).toObject()
        : current,
    );
    const wantedJson = JSON.stringify(wanted);

    if (currentJson !== wantedJson) {
      console.log(`  ${field}`);
      console.log(`    was  ${describe(current)}`);
      console.log(`    now  ${describe(wanted)}`);
      setting.set(field, wanted as SettingDoc[OwnerField]);
      changed.push(field);
    }
  }

  if (changed.length > 0) {
    await setting.save();
  }
  return { changed };
}

async function main(): Promise<void> {
  await connectDatabase();
  console.log("\n  Applying the owner's store details…\n");

  const { changed } = await applySettingsDefaults();

  console.log(
    changed.length === 0
      ? "\n  Nothing to change — the settings already match.\n"
      : `\n  Updated ${changed.length} field(s). Products, customers and orders were not touched.\n`,
  );

  await disconnectDatabase();
}

// Only run when invoked directly, so the tests can import the function.
if (process.argv[1]?.includes("apply-settings-defaults")) {
  main().catch((error: unknown) => {
    console.error(error instanceof Error ? error.message : error);
    process.exit(1);
  });
}
