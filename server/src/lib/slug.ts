/**
 * Slugs for categories, brands and products: lower-case, ASCII, dash-separated. They appear in URLs, so they
 * are generated once and then stored — renaming a product never silently changes its address.
 */

const MAX_SLUG_LENGTH = 140;

export function slugify(input: string): string {
  return input
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/\+/g, "-plus")
    .replace(/&/g, "-and-")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, MAX_SLUG_LENGTH)
    .replace(/-$/, "");
}

/**
 * `slugify` plus a numeric suffix when the slug is already taken — `iphone-13-pro-max`, then
 * `iphone-13-pro-max-2`. `taken` answers whether a candidate already exists.
 */
export async function uniqueSlug(
  input: string,
  taken: (candidate: string) => Promise<boolean>,
): Promise<string> {
  const base = slugify(input) || "item";
  if (!(await taken(base))) {
    return base;
  }
  for (let suffix = 2; suffix < 1000; suffix += 1) {
    const candidate = `${base.slice(0, MAX_SLUG_LENGTH - 5)}-${suffix}`;
    if (!(await taken(candidate))) {
      return candidate;
    }
  }
  throw new Error(`Could not find a free slug for "${input}".`);
}
