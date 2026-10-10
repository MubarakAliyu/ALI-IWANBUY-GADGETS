/**
 * Writes `docs/DEMO-ACCOUNTS.md` as part of seeding, so the credentials in the file are always the ones the
 * database actually has. The file is for the lab demo and local development only — it is listed in
 * `.gitignore`, because a password in a repository is a password that escapes.
 */

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { formatLagosDate } from "../lib/dates.js";
import { DEMO_ADMIN_PASSWORD, DEMO_ADMINS, DEMO_CUSTOMER_PASSWORD } from "./demo.js";

export async function writeDemoAccounts(): Promise<string> {
  const docsDir = path.resolve(process.cwd(), "..", "docs");
  await mkdir(docsDir, { recursive: true });
  const file = path.join(docsDir, "DEMO-ACCOUNTS.md");

  const adminRows = DEMO_ADMINS.map(
    (admin) =>
      `| ${admin.role} | ${admin.firstName} ${admin.lastName} | \`${admin.email}\` | \`${DEMO_ADMIN_PASSWORD}\` | ${
        admin.pin ? `\`${admin.pin}\`` : "— (staff cannot confirm payments)"
      } |`,
  ).join("\n");

  const content = `# Demo accounts

Written by \`pnpm seed\` on ${formatLagosDate(new Date())}. These accounts exist for the lab demo and local
development. **They are not secrets and this file is not committed** — the real shop's passwords are chosen by
the owner and never written down here.

## Dashboard — <http://localhost:3000/admin/login>

| Role | Name | Email | Password | Payment PIN |
|---|---|---|---|---|
${adminRows}

The PIN is asked for again whenever money moves: confirming a payment, cancelling an order that has been paid
for, or issuing a refund. Staff have no PIN because their role cannot do any of those.

## Storefront — <http://localhost:3000/login>

| Name | Email | Password |
|---|---|---|
| Amina Bello | \`amina@example.com\` | \`${DEMO_CUSTOMER_PASSWORD}\` |
| Ibrahim Musa | \`ibrahim@example.com\` | \`${DEMO_CUSTOMER_PASSWORD}\` |
| Fatima Lawal | \`fatima@example.com\` | \`${DEMO_CUSTOMER_PASSWORD}\` |
| Chidi Okeke | \`chidi@example.com\` | \`${DEMO_CUSTOMER_PASSWORD}\` |
| Zainab Yusuf | \`zainab@example.com\` | \`${DEMO_CUSTOMER_PASSWORD}\` |
| Emeka Nwosu | \`emeka@example.com\` | \`${DEMO_CUSTOMER_PASSWORD}\` |

All six have order history behind them, so "My orders" is worth opening.

## Resetting

\`pnpm seed\` rebuilds the catalogue, these accounts and sixty days of order history from scratch. It refuses to
run against production unless \`ALLOW_DEMO_SEED=true\` is set.
`;

  await writeFile(file, content, "utf8");
  return file;
}
