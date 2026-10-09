/**
 * The brand colours as values, mirroring the `@theme` block in `globals.css`.
 *
 * Components never read from here — they compose the Tailwind utilities those tokens generate. This module
 * exists for the two places that need a literal colour: the browser theme colour in the document metadata,
 * and the style guide's swatches. Keeping them here means `globals.css` and this file are the only two places
 * in the app where a hex colour is written down.
 */

export const BRAND_COLOURS = {
  "brand-primary": "#156FBF",
  "brand-navy": "#1E2A35",
  "brand-grey": "#88939E",
  "text-muted": "#646F7A",
  "primary-50": "#EAF2FA",
  "primary-700": "#0D4475",
  "grey-100": "#F1F4F6",
  "grey-200": "#DFE4E8",
  success: "#16A34A",
  warning: "#D97706",
  danger: "#DC2626",
} as const;

export type BrandColour = keyof typeof BRAND_COLOURS;

/** The colour a mobile browser tints its chrome with. */
export const THEME_COLOUR = BRAND_COLOURS["brand-primary"];
