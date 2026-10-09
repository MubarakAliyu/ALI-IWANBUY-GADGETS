/**
 * Seed product images (ADR-006). Only eleven approved lifestyle photos exist, and none of them is a catalogue
 * shot, so every seeded product gets a generated placeholder instead: a flat device silhouette in the brand
 * greys on `grey-50`, with the brand and model under it. They are obviously placeholders, so the owner can see
 * at a glance which products still need a real photo.
 *
 * Each product gets both the `.svg` that was drawn and a `.webp` rasterised from it — the webp is what the
 * catalogue points at, so `next/image` can size and optimise it like any other photo.
 */

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";

export const SILHOUETTES = [
  "phone",
  "tablet",
  "laptop",
  "watch",
  "earbuds",
  "headphones",
  "speaker",
  "charger",
  "power-bank",
  "case",
  "memory",
] as const;
export type Silhouette = (typeof SILHOUETTES)[number];

const SIZE = 1000;
const OUTLINE = "#C3CAD1";
const FILL = "#DFE4E8";
const SCREEN = "#F1F4F6";
const BACKGROUND = "#F8FAFB";
const TITLE_COLOUR = "#1E2A35";
const LABEL_COLOUR = "#646F7A";
const FONT_STACK = "Montserrat, 'Segoe UI', Helvetica, Arial, sans-serif";

/** The drawing for each silhouette, centred in a 1000×1000 canvas above the caption. */
const SHAPES: Record<Silhouette, string> = {
  phone: `
    <rect x="390" y="150" width="220" height="430" rx="30" fill="${FILL}" stroke="${OUTLINE}" stroke-width="8"/>
    <rect x="410" y="185" width="180" height="360" rx="16" fill="${SCREEN}"/>
    <rect x="465" y="162" width="70" height="10" rx="5" fill="${OUTLINE}"/>
    <circle cx="500" cy="562" r="8" fill="${OUTLINE}"/>`,
  tablet: `
    <rect x="330" y="160" width="340" height="440" rx="26" fill="${FILL}" stroke="${OUTLINE}" stroke-width="8"/>
    <rect x="356" y="196" width="288" height="368" rx="12" fill="${SCREEN}"/>
    <circle cx="500" cy="582" r="9" fill="${OUTLINE}"/>`,
  laptop: `
    <rect x="300" y="200" width="400" height="265" rx="18" fill="${FILL}" stroke="${OUTLINE}" stroke-width="8"/>
    <rect x="322" y="222" width="356" height="221" rx="8" fill="${SCREEN}"/>
    <path d="M250 480 H750 L790 540 H210 Z" fill="${FILL}" stroke="${OUTLINE}" stroke-width="8" stroke-linejoin="round"/>
    <rect x="430" y="496" width="140" height="12" rx="6" fill="${OUTLINE}"/>`,
  watch: `
    <rect x="420" y="130" width="160" height="90" rx="26" fill="${OUTLINE}"/>
    <rect x="420" y="520" width="160" height="90" rx="26" fill="${OUTLINE}"/>
    <rect x="392" y="215" width="216" height="310" rx="54" fill="${FILL}" stroke="${OUTLINE}" stroke-width="8"/>
    <rect x="420" y="245" width="160" height="250" rx="36" fill="${SCREEN}"/>
    <rect x="608" y="320" width="16" height="54" rx="8" fill="${OUTLINE}"/>`,
  earbuds: `
    <path d="M400 230 a70 70 0 0 1 70 70 v120 a46 46 0 0 1 -92 0 v-120 a70 70 0 0 1 22 -50z" fill="${FILL}" stroke="${OUTLINE}" stroke-width="8"/>
    <path d="M600 230 a70 70 0 0 1 70 70 v120 a46 46 0 0 1 -92 0 v-120 a70 70 0 0 1 22 -50z" fill="${FILL}" stroke="${OUTLINE}" stroke-width="8"/>
    <rect x="370" y="470" width="260" height="130" rx="34" fill="${SCREEN}" stroke="${OUTLINE}" stroke-width="8"/>`,
  headphones: `
    <path d="M300 440 v-60 a200 200 0 0 1 400 0 v60" fill="none" stroke="${OUTLINE}" stroke-width="26" stroke-linecap="round"/>
    <rect x="258" y="420" width="96" height="180" rx="40" fill="${FILL}" stroke="${OUTLINE}" stroke-width="8"/>
    <rect x="646" y="420" width="96" height="180" rx="40" fill="${FILL}" stroke="${OUTLINE}" stroke-width="8"/>`,
  speaker: `
    <rect x="300" y="250" width="400" height="300" rx="150" fill="${FILL}" stroke="${OUTLINE}" stroke-width="8"/>
    <circle cx="430" cy="400" r="74" fill="${SCREEN}" stroke="${OUTLINE}" stroke-width="8"/>
    <circle cx="610" cy="400" r="44" fill="${SCREEN}" stroke="${OUTLINE}" stroke-width="8"/>`,
  charger: `
    <rect x="370" y="250" width="260" height="260" rx="48" fill="${FILL}" stroke="${OUTLINE}" stroke-width="8"/>
    <rect x="452" y="186" width="26" height="70" rx="10" fill="${OUTLINE}"/>
    <rect x="522" y="186" width="26" height="70" rx="10" fill="${OUTLINE}"/>
    <rect x="462" y="510" width="76" height="22" rx="10" fill="${OUTLINE}"/>
    <path d="M500 560 c0 60 -120 60 -120 0" fill="none" stroke="${OUTLINE}" stroke-width="14" stroke-linecap="round"/>`,
  "power-bank": `
    <rect x="370" y="190" width="260" height="400" rx="40" fill="${FILL}" stroke="${OUTLINE}" stroke-width="8"/>
    <rect x="410" y="240" width="180" height="26" rx="13" fill="${SCREEN}"/>
    <rect x="410" y="300" width="180" height="26" rx="13" fill="${SCREEN}"/>
    <rect x="432" y="520" width="136" height="24" rx="12" fill="${OUTLINE}"/>`,
  case: `
    <rect x="370" y="160" width="260" height="440" rx="44" fill="${FILL}" stroke="${OUTLINE}" stroke-width="8"/>
    <rect x="404" y="200" width="100" height="100" rx="26" fill="${SCREEN}" stroke="${OUTLINE}" stroke-width="8"/>
    <circle cx="438" cy="234" r="14" fill="${OUTLINE}"/>
    <circle cx="474" cy="268" r="14" fill="${OUTLINE}"/>`,
  memory: `
    <path d="M380 200 h180 l60 60 v340 a20 20 0 0 1 -20 20 h-220 a20 20 0 0 1 -20 -20 v-380 a20 20 0 0 1 20 -20z" fill="${FILL}" stroke="${OUTLINE}" stroke-width="8"/>
    <rect x="412" y="250" width="26" height="90" rx="8" fill="${SCREEN}"/>
    <rect x="456" y="250" width="26" height="90" rx="8" fill="${SCREEN}"/>
    <rect x="500" y="250" width="26" height="90" rx="8" fill="${SCREEN}"/>`,
};

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/** Break a product name onto at most two lines so a long model name still fits the canvas. */
function wrap(name: string, perLine = 24): string[] {
  if (name.length <= perLine) {
    return [name];
  }
  const words = name.split(" ");
  const lines: string[] = [];
  let current = "";
  for (const word of words) {
    if (current && `${current} ${word}`.length > perLine) {
      lines.push(current);
      current = word;
    } else {
      current = current ? `${current} ${word}` : word;
    }
  }
  if (current) {
    lines.push(current);
  }
  return lines.slice(0, 2);
}

export function placeholderSvg(options: { brand: string; name: string; silhouette: Silhouette }): string {
  const lines = wrap(options.name);
  const title = lines
    .map(
      (line, index) =>
        `<text x="500" y="${790 + index * 54}" text-anchor="middle" font-family="${FONT_STACK}" font-size="42" font-weight="600" fill="${TITLE_COLOUR}">${escapeXml(line)}</text>`,
    )
    .join("\n    ");

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${SIZE}" height="${SIZE}" viewBox="0 0 ${SIZE} ${SIZE}" role="img">
  <rect width="${SIZE}" height="${SIZE}" fill="${BACKGROUND}"/>
  <g>${SHAPES[options.silhouette]}</g>
  <text x="500" y="712" text-anchor="middle" font-family="${FONT_STACK}" font-size="26" font-weight="600" letter-spacing="3" fill="${LABEL_COLOUR}">${escapeXml(options.brand.toUpperCase())}</text>
  ${title}
</svg>`;
}

/**
 * Write `<slug>.svg` and `<slug>.webp` into the seed image folder and return the public URL of the webp.
 */
export async function writePlaceholderImage(options: {
  directory: string;
  slug: string;
  brand: string;
  name: string;
  silhouette: Silhouette;
}): Promise<string> {
  await mkdir(options.directory, { recursive: true });
  const svg = placeholderSvg(options);
  await writeFile(path.join(options.directory, `${options.slug}.svg`), svg, "utf8");
  await sharp(Buffer.from(svg))
    .webp({ quality: 88 })
    .toFile(path.join(options.directory, `${options.slug}.webp`));
  return `/uploads/seed/${options.slug}.webp`;
}
