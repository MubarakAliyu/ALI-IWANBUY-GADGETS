/**
 * The demo accounts' passwords and PINs.
 *
 * In development and in tests these are the obvious hard-coded values: the accounts exist to be handed round
 * a classroom, and a password nobody can remember is no use in a demo.
 *
 * **In production they must come from the environment.** The repository is public, so a password committed to
 * it is a password anyone can read — and `pnpm seed` against a live database creates accounts that can confirm
 * payments. If any of the four variables is missing the seed refuses and names it; weak values are refused
 * too, because "set it in the environment" is not an improvement if what gets set is `1234`.
 */

import { isTrivialPin, PIN_MAX_LENGTH, PIN_MIN_LENGTH } from "@aib/shared";
import { env } from "../config/env.js";

/** The minimum a demo password may be. Shorter than the app asks of a real admin would be a bad example. */
export const MIN_DEMO_PASSWORD_LENGTH = 10;

export type DemoCredentials = {
  adminPassword: string;
  customerPassword: string;
  ownerPin: string;
  managerPin: string;
};

/** Development and test only. Never reachable with `NODE_ENV=production`. */
const DEVELOPMENT_DEFAULTS: DemoCredentials = {
  adminPassword: "Owner12345",
  customerPassword: "Customer123",
  ownerPin: "8426",
  managerPin: "5193",
};

const SOURCE: Record<keyof DemoCredentials, string> = {
  adminPassword: "DEMO_ADMIN_PASSWORD",
  customerPassword: "DEMO_CUSTOMER_PASSWORD",
  ownerPin: "DEMO_OWNER_PIN",
  managerPin: "DEMO_MANAGER_PIN",
};

function fail(lines: string[]): never {
  throw new Error(
    [
      "The demo seed cannot run against production with the credentials it has.",
      "",
      ...lines,
      "",
      "Set them on the command line for this one run — they are not deploy settings, and nothing should",
      "store them. `docs/DEPLOYMENT.md` § Hosting, step 7 has the exact command for bash and PowerShell.",
    ].join("\n"),
  );
}

function checkPassword(value: string, variable: string, problems: string[]): void {
  if (value.length < MIN_DEMO_PASSWORD_LENGTH) {
    problems.push(`  • ${variable} is too short — use at least ${MIN_DEMO_PASSWORD_LENGTH} characters.`);
  }
}

function checkPin(value: string, variable: string, problems: string[]): void {
  if (!new RegExp(`^\\d{${PIN_MIN_LENGTH},${PIN_MAX_LENGTH}}$`).test(value)) {
    problems.push(`  • ${variable} must be ${PIN_MIN_LENGTH}–${PIN_MAX_LENGTH} digits.`);
    return;
  }
  if (isTrivialPin(value)) {
    problems.push(`  • ${variable} is too easy to guess — not a run, a repeat, or a date.`);
  }
}

/**
 * What the seed should use. Outside production this is the development set; in production every value comes
 * from the environment and is checked before a single document is written.
 */
export function resolveDemoCredentials(): DemoCredentials {
  if (env.NODE_ENV !== "production") {
    return DEVELOPMENT_DEFAULTS;
  }

  const read = Object.fromEntries(
    (Object.keys(SOURCE) as (keyof DemoCredentials)[]).map((key) => [
      key,
      (process.env[SOURCE[key]] ?? "").trim(),
    ]),
  ) as DemoCredentials;

  const missing = (Object.keys(SOURCE) as (keyof DemoCredentials)[]).filter((key) => read[key] === "");
  if (missing.length > 0) {
    fail(["These environment variables are not set:", ...missing.map((key) => `  • ${SOURCE[key]}`)]);
  }

  const problems: string[] = [];
  checkPassword(read.adminPassword, SOURCE.adminPassword, problems);
  checkPassword(read.customerPassword, SOURCE.customerPassword, problems);
  checkPin(read.ownerPin, SOURCE.ownerPin, problems);
  checkPin(read.managerPin, SOURCE.managerPin, problems);

  if (problems.length > 0) {
    fail(problems);
  }

  return read;
}
