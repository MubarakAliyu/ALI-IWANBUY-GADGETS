import type { StaticImageData } from "next/image";
import lockup from "@brand/logo/svg/logo-header.svg";
import horizontalWhite from "@brand/logo/svg/logo-new-a-1.svg";
import mark from "@brand/logo/svg/Logo.svg";
import markWhite from "@brand/logo/svg/Logo-3.svg";

/**
 * The single source of logo asset paths (overview §4.4). Every consumer — `<Logo />`, the header, the footer,
 * the style guide — reads from here, so when the re-issued identity lands in `brand/logo/svg/`, replacing it
 * is a file drop plus an edit to the imports above. No component changes, and nothing anywhere else may point
 * at a logo file directly.
 *
 * The entries are marked as placeholders because the "I WAN BUY GADGETS" mark is not yet cleared for use
 * (ADR-003); until then the approved AB mark and the current lockups stand in.
 */

export type LogoAsset = {
  src: StaticImageData;
  /** True until the final brand export replaces this file. The style guide labels placeholders as such. */
  placeholder: boolean;
  /**
   * Render as a white knockout with a CSS filter. Only for the interim knockout lockup, which has no white
   * export yet; a final white asset sets this to false.
   */
  knockout: boolean;
};

export const logoManifest = {
  /** Full stacked lockup for light backgrounds: the storefront header, auth pages and invoices. */
  primary: { src: lockup as StaticImageData, placeholder: true, knockout: false },
  /** The same lockup knocked out to white, for navy surfaces. */
  white: { src: lockup as StaticImageData, placeholder: true, knockout: true },
  /** The horizontal white lockup (647:100) for a bar capped at 64px — the footer and the admin sidebar head. */
  horizontalWhite: { src: horizontalWhite as StaticImageData, placeholder: true, knockout: false },
  /** The AB mark alone, for light backgrounds below the lockup's minimum width. */
  mark: { src: mark as StaticImageData, placeholder: true, knockout: false },
  /** The AB mark in white, for navy and blue surfaces — the hero and the footer. */
  markWhite: { src: markWhite as StaticImageData, placeholder: true, knockout: false },
} satisfies Record<string, LogoAsset>;

export type LogoVariant = keyof typeof logoManifest;

/** The Brand Guidelines' minimum width for the full lockup. Below it, use the mark alone. */
export const LOCKUP_MIN_WIDTH = 48;
