/**
 * SKUs (overview §10, A-5): `{BRAND3}-{MODEL4}-{ATTR}-{SEQ}`, e.g. `APL-13PM-256GRP-0007`. The brand code is
 * stored on the brand, the model code is derived from the product name, the attribute code from the variant's
 * attributes, and the sequence makes the whole thing unique. Admin can override the result.
 */

export const SKU_MAX_LENGTH = 32;
const SKU_PATTERN = /^[A-Z0-9]+(?:-[A-Z0-9]+)*$/;
const VOWELS = new Set(["A", "E", "I", "O", "U"]);

function alnum(text: string): string {
  return text.toUpperCase().replace(/[^A-Z0-9]/g, "");
}

/** Tidy a hand-typed SKU: upper-case, spaces and underscores to dashes, no doubled or trailing dashes. */
export function normaliseSku(input: string): string {
  return input
    .trim()
    .toUpperCase()
    .replace(/[\s_]+/g, "-")
    .replace(/[^A-Z0-9-]/g, "")
    .replace(/-{2,}/g, "-")
    .replace(/^-|-$/g, "");
}

export function isValidSku(sku: string): boolean {
  return sku.length > 0 && sku.length <= SKU_MAX_LENGTH && SKU_PATTERN.test(sku);
}

/**
 * A three-letter code for a brand: its first letter, then the consonants that follow, then any other letters —
 * Apple → APL, Oraimo → ORM, Anker → ANK. The owner can change it.
 */
export function suggestBrandCode(name: string): string {
  const letters = alnum(name).replace(/[0-9]/g, "");
  if (letters.length === 0) {
    return "XXX";
  }
  const first = letters[0] as string;
  const picked = [first];
  for (const letter of letters.slice(1)) {
    if (picked.length === 3) {
      break;
    }
    if (!VOWELS.has(letter)) {
      picked.push(letter);
    }
  }
  for (const letter of letters.slice(1)) {
    if (picked.length === 3) {
      break;
    }
    if (!picked.includes(letter)) {
      picked.push(letter);
    }
  }
  return picked.join("").padEnd(3, "X").slice(0, 3);
}

/** The model part: the significant characters of the product name after the brand, e.g. "13 Pro Max" → 13PM. */
export function suggestModelCode(productName: string, brandName: string): string {
  const withoutBrand = productName.replace(new RegExp(brandName, "ig"), " ").trim();
  const words = (withoutBrand || productName).split(/\s+/).filter(Boolean);
  const code = words
    .map((word) => {
      const cleaned = alnum(word);
      return /^\d/.test(cleaned) ? cleaned : cleaned.slice(0, 1);
    })
    .join("");
  return (code || alnum(productName)).slice(0, 6) || "MODEL";
}

/** The attribute part: storage and colour, shortened — "256GB" + "Graphite" → 256GRP. */
export function attributeCode(attributes: {
  storage?: string | null;
  colour?: string | null;
  ram?: string | null;
}): string {
  const storage = attributes.storage ? alnum(attributes.storage).replace(/GB$|TB$/, "") : "";
  const ram = attributes.ram ? `R${alnum(attributes.ram).replace(/GB$/, "")}` : "";
  const colour = attributes.colour ? alnum(attributes.colour).slice(0, 3) : "";
  return `${storage}${ram}${colour}`.slice(0, 8);
}

/** Assemble a SKU; `sequence` is the running number that makes it unique. */
export function buildSku(parts: {
  brandCode: string;
  modelCode: string;
  attributes: { storage?: string | null; colour?: string | null; ram?: string | null };
  sequence: number;
}): string {
  const attr = attributeCode(parts.attributes);
  const segments = [parts.brandCode, parts.modelCode, attr, String(parts.sequence).padStart(4, "0")].filter(
    Boolean,
  );
  return normaliseSku(segments.join("-")).slice(0, SKU_MAX_LENGTH);
}
