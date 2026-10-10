/**
 * Processing an uploaded photograph (overview §10 A-5).
 *
 * Whatever the shop uploads — a 4MB photo straight off a phone, a screenshot, a PNG with transparency — comes
 * out as three WebP files at 400, 800 and 1400 wide. The storefront's `next/image` picks the one it needs, so
 * a customer on 4G in Birnin Kebbi downloads 400px, not four megabytes.
 *
 * The original is deliberately not kept: it is the one file nothing ever serves, and keeping it would double
 * the storage bill for nothing.
 */

import sharp from "sharp";
import { AppError } from "./app-error.js";
import { safeFilename, storage, type StoredFile } from "./storage.js";

/** The widths the storefront asks for. The largest is also what a product page shows zoomed. */
export const IMAGE_WIDTHS = [400, 800, 1400] as const;

export const MAX_UPLOAD_BYTES = 8 * 1024 * 1024;
export const MAX_IMAGES_PER_PRODUCT = 6;

const ACCEPTED = new Set(["image/jpeg", "image/png", "image/webp", "image/avif"]);

export type ProcessedImage = {
  /** The 800px version — what `ProductImage.url` points at. */
  url: string;
  /** Every rendition, so all of them can be removed when the image is. */
  keys: string[];
  width: number;
  height: number;
};

/**
 * Turn one uploaded file into its three renditions. Anything that is not an image sharp can read is refused
 * here rather than being stored and failing to render later.
 */
export async function processProductImage(
  file: { buffer: Buffer; mimetype: string; originalname: string },
  folder = "products",
): Promise<ProcessedImage> {
  if (!ACCEPTED.has(file.mimetype)) {
    throw AppError.badRequest("Upload a JPEG, PNG or WebP image.");
  }
  if (file.buffer.byteLength > MAX_UPLOAD_BYTES) {
    throw AppError.badRequest("That image is too large. Keep it under 8MB.");
  }

  let metadata: Awaited<ReturnType<ReturnType<typeof sharp>["metadata"]>>;
  try {
    metadata = await sharp(file.buffer).metadata();
  } catch {
    throw AppError.badRequest("We could not read that image. Try saving it again as a JPEG.");
  }
  if (!metadata.width || !metadata.height) {
    throw AppError.badRequest("That file does not look like an image.");
  }

  const base = safeFilename(file.originalname).replace(/\.[^.]+$/, "");
  const stored: StoredFile[] = [];

  for (const width of IMAGE_WIDTHS) {
    const body = await sharp(file.buffer)
      .rotate() // Honour the EXIF orientation a phone camera writes, then drop it.
      .resize({ width, withoutEnlargement: true, fit: "inside" })
      .webp({ quality: 82 })
      .toBuffer();

    stored.push(await storage.put(folder, `${base}-${width}.webp`, body, "image/webp"));
  }

  // The middle rendition is the one the catalogue stores; `next/image` finds the others by width.
  const middle = stored[1] ?? stored[0];
  if (!middle) {
    throw new AppError(500, "UPLOAD_FAILED", "The image could not be stored. Please try again.");
  }

  return {
    url: middle.url,
    keys: stored.map((file) => file.key),
    width: Math.min(metadata.width, 800),
    height: Math.round((Math.min(metadata.width, 800) / metadata.width) * metadata.height),
  };
}

/**
 * The keys behind a stored URL. An image is stored once as `…-800.webp`, so its siblings are the same name at
 * the other widths — which is how removing one image removes all three.
 */
export function keysForUrl(url: string): string[] {
  const match = /^\/uploads\/(.+)-(\d+)\.webp$/.exec(url);
  if (!match) {
    return [];
  }
  return IMAGE_WIDTHS.map((width) => `${match[1]}-${width}.webp`);
}
