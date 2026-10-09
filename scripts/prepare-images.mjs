/**
 * `pnpm images:prepare` — turns the approved brand photos into web-sized WebP files.
 *
 * `brand/images/` holds the originals: multi-megabyte JPEGs with stock-library file names. They are never
 * shipped. This script writes two WebP sizes of each into `client/public/images/` under a short, meaningful
 * name — `<name>.webp` at 1600px for hero and banner use, `<name>-800.webp` at 800px for cards and tiles.
 *
 * The output is committed, so a clone builds without needing to run this; re-run it when a photo is replaced.
 */

import { mkdir, readdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sourceDir = path.join(root, "brand", "images");
const outputDir = path.join(root, "client", "public", "images");

/** Original file name (without extension) → the name the storefront uses. */
const NAMES = {
  "three-different-colored-cell-phones-are-lined-up-against-white-background": "phones",
  "moscow-russia-august-30-2021-samsung-officially-launches-latest-flagship-smartphone-samsung-galaxy-flip-3-with-foldable-display":
    "android-phones",
  "saratov-russia-10-june-2021-macbook-computer-iphone-airpods-watch-black-table-created-by-apple-inc":
    "apple-devices",
  "minimalist-display-modern-gadgets-including-headphone-speaker-smartphone": "gadgets",
  "headphones-with-minimalist-monochrome-background": "headphones",
  "wireless-earbuds-with-neon-cyberpunk-style-lighting": "earbuds",
  "white-phone-case-back-view-mock-up-gray-background-generate-by-ai": "phone-case",
  "white-phone-case-back-view-mock-up-gray-background-generate-by-ai (1)": "phone-case-alt",
  "tech-device-with-nature-background": "tech-nature",
  "technology-concept-with-futuristic-element": "tech-futuristic",
  "view-electronic-product-balancing-podium": "product-podium",
};

const WIDTHS = [
  { width: 1600, suffix: "" },
  { width: 800, suffix: "-800" },
];

await mkdir(outputDir, { recursive: true });

const files = (await readdir(sourceDir)).filter((file) => /\.(jpe?g|png)$/i.test(file));
let written = 0;
let skipped = 0;
const manifest = [];

for (const file of files) {
  const base = file.replace(/\.[^.]+$/, "");
  const name = NAMES[base];
  if (!name) {
    console.warn(`  skipped  ${file} — add it to NAMES in scripts/prepare-images.mjs to publish it`);
    skipped += 1;
    continue;
  }

  const source = path.join(sourceDir, file);
  const original = await stat(source);
  const entry = { name, source: file, originalBytes: original.size, sizes: {} };

  for (const { width, suffix } of WIDTHS) {
    const target = path.join(outputDir, `${name}${suffix}.webp`);
    const info = await sharp(source)
      .rotate()
      .resize({ width, withoutEnlargement: true })
      .webp({ quality: 78 })
      .toFile(target);
    entry.sizes[width] = { file: `${name}${suffix}.webp`, bytes: info.size, height: info.height };
    written += 1;
  }

  manifest.push(entry);
  const large = entry.sizes[1600];
  console.log(
    `  ${name.padEnd(16)} ${(original.size / 1024 / 1024).toFixed(1)}MB → ${(large.bytes / 1024).toFixed(0)}KB`,
  );
}

manifest.sort((a, b) => a.name.localeCompare(b.name));
await writeFile(path.join(outputDir, "manifest.json"), `${JSON.stringify(manifest, null, 2)}\n`, "utf8");

console.log(
  `\n  ${written} files written to client/public/images${skipped ? `, ${skipped} skipped` : ""}.\n`,
);
