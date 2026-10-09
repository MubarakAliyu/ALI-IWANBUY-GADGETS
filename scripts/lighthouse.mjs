/**
 * `pnpm lighthouse` — the Part E performance and accessibility check.
 *
 * It audits the home page and a product page of a running **production** build on a simulated mobile 4G
 * connection, prints the four category scores and writes the full reports to `.lighthouse/`. It exits
 * non-zero if performance or accessibility falls below 90, which is the target in the overview (G5).
 *
 * Run it against a production server, not `next dev`:
 *   pnpm build && pnpm --filter @aib/client start   (plus the API and database)
 *   pnpm lighthouse
 */

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import * as chromeLauncher from "chrome-launcher";
import lighthouse from "lighthouse";

const BASE_URL = process.env.LIGHTHOUSE_BASE_URL ?? "http://localhost:3000";
const TARGETS = [
  { name: "home", url: "/" },
  { name: "product", url: "/product/apple-iphone-15" },
];
const THRESHOLDS = { performance: 90, accessibility: 90 };
/** Lighthouse varies by several points run to run on a busy machine, so each page is measured three times. */
const RUNS = Number(process.env.LIGHTHOUSE_RUNS ?? 3);

function median(values) {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)] ?? 0;
}

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outDir = path.join(root, ".lighthouse");
await mkdir(outDir, { recursive: true });

const chrome = await chromeLauncher.launch({
  chromeFlags: ["--headless=new", "--no-sandbox", "--disable-gpu"],
});

let failed = false;
const summary = [];

try {
  for (const target of TARGETS) {
    const url = `${BASE_URL}${target.url}`;
    const runs = [];

    for (let run = 0; run < RUNS; run += 1) {
      const result = await lighthouse(
        url,
        { port: chrome.port, output: "html", logLevel: "error" },
        undefined,
      );
      if (!result) {
        throw new Error(`Lighthouse returned nothing for ${url}`);
      }
      runs.push(
        Object.fromEntries(
          Object.entries(result.lhr.categories).map(([key, category]) => [
            key,
            Math.round((category.score ?? 0) * 100),
          ]),
        ),
      );
      // Keep the last report; they are equivalent and one file per page is enough to read.
      await writeFile(path.join(outDir, `${target.name}.html`), String(result.report), "utf8");
    }

    const scores = Object.fromEntries(
      Object.keys(runs[0] ?? {}).map((key) => [key, median(runs.map((run) => run[key] ?? 0))]),
    );

    summary.push({ page: target.name, url: target.url, ...scores });

    for (const [category, minimum] of Object.entries(THRESHOLDS)) {
      if ((scores[category] ?? 0) < minimum) {
        failed = true;
        console.error(`  ${target.name}: ${category} ${scores[category]} is below ${minimum}`);
      }
    }
  }
} finally {
  await chrome.kill();
}

console.log("");
console.log(`  Median of ${RUNS} runs per page.`);
console.table(summary);
console.log(`\n  Reports written to .lighthouse/\n`);

if (failed) {
  process.exit(1);
}
