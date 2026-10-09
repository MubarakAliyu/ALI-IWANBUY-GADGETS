import Image from "next/image";
import { cn } from "@/lib/cn";
import { LOCKUP_MIN_WIDTH, logoManifest, type LogoVariant } from "./logo-manifest";

type LogoProps = {
  variant?: LogoVariant;
  /** Rendered width in px. The height follows the asset's own proportions — the logo is never stretched. */
  width?: number;
  /** Load eagerly, for a logo above the fold. */
  priority?: boolean;
  /** Decorative when the surrounding link or heading already names the shop. */
  decorative?: boolean;
  className?: string;
};

/**
 * The ALI_IWANBUY logo, from the approved vector files only (Brand Guidelines: never redraw, stretch,
 * recolour, rotate or add effects). `primary` on light surfaces, `white` and `markWhite` on navy and blue,
 * `horizontalWhite` for a wide bar, `mark` where the lockup would fall below its 48px minimum.
 */
export function Logo({
  variant = "primary",
  width = 160,
  priority = false,
  decorative = false,
  className,
}: LogoProps) {
  const asset = logoManifest[variant];
  const isMark = variant === "mark" || variant === "markWhite";
  const renderedWidth = isMark ? width : Math.max(width, LOCKUP_MIN_WIDTH);
  const renderedHeight = Math.round((renderedWidth * asset.src.height) / asset.src.width);

  return (
    <Image
      src={asset.src}
      alt={decorative ? "" : "ALI_IWANBUY Gadgets"}
      width={renderedWidth}
      height={renderedHeight}
      priority={priority}
      unoptimized
      aria-hidden={decorative || undefined}
      data-logo-variant={variant}
      className={cn("block h-auto max-w-none select-none", asset.knockout && "brightness-0 invert", className)}
      draggable={false}
    />
  );
}
