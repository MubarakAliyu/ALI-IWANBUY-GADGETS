/**
 * Where uploaded files live (overview §6.7, Batch 3 Part H.1).
 *
 * One interface with a provider behind it, so the choice between a folder on this machine and a CDN is made
 * once, in configuration, and nothing that stores a file has to know which it got.
 *
 *   • `local` writes under `server/uploads` and is the development default.
 *   • `cloudinary` is for production, where the host's disk is wiped on every deploy and a product photo
 *     uploaded on Tuesday would be a broken image by Thursday.
 *
 * Both return the same `{ url, key }`, and the local URLs stay relative so the Next.js rewrite serves them
 * first-party; a Cloudinary URL is absolute, which is why `next.config.ts` lists its host.
 */

import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomBytes } from "node:crypto";
import { v2 as cloudinary } from "cloudinary";
import { env } from "../config/env.js";
import { logger } from "./logger.js";

export type StoredFile = {
  /** What the browser asks for: a `/uploads/…` path locally, an absolute CDN URL in production. */
  url: string;
  /** What `remove` needs to delete it again. */
  key: string;
};

export type StorageProvider = {
  readonly kind: "local" | "cloudinary";
  /** `folder` groups files — "products", "brands", "categories". */
  put(folder: string, filename: string, body: Buffer, contentType: string): Promise<StoredFile>;
  remove(key: string): Promise<void>;
};

const ROOT = path.resolve(process.cwd(), env.UPLOAD_DIR);

/** A name that cannot collide and cannot escape its folder, keeping the caller's extension. */
export function safeFilename(original: string): string {
  const extension =
    path
      .extname(original)
      .toLowerCase()
      .replace(/[^.a-z0-9]/g, "") || ".bin";
  return `${Date.now().toString(36)}-${randomBytes(6).toString("hex")}${extension}`;
}

function safeFolder(folder: string): string {
  return folder.replace(/[^a-z0-9-]/gi, "");
}

const localProvider: StorageProvider = {
  kind: "local",

  async put(folder, filename, body) {
    const directory = path.join(ROOT, safeFolder(folder));
    await mkdir(directory, { recursive: true });
    await writeFile(path.join(directory, filename), body);

    return { url: `/uploads/${safeFolder(folder)}/${filename}`, key: `${safeFolder(folder)}/${filename}` };
  },

  async remove(key) {
    // A key is only ever one this module produced, but it still never leaves the upload root.
    const target = path.resolve(ROOT, key);
    if (!target.startsWith(ROOT)) {
      throw new Error("Refusing to delete outside the upload directory.");
    }
    try {
      await unlink(target);
    } catch (error) {
      // A file that is already gone is the state we wanted; anything else is worth knowing about.
      if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
        logger.warn({ err: error, key }, "Could not remove an uploaded file");
      }
    }
  },
};

/**
 * Cloudinary. The images are already sized and encoded by `lib/images.ts` before they get here, so this
 * uploads them as they are (`resource_type: "raw"` is wrong for images; `"image"` keeps the CDN's own
 * delivery features available without transforming what we sent).
 */
function createCloudinaryProvider(): StorageProvider {
  // `CLOUDINARY_URL` is read from the environment by the SDK itself; this only confirms it is configured.
  cloudinary.config({ secure: true });

  return {
    kind: "cloudinary",

    async put(folder, filename, body) {
      const publicId = `aib/${safeFolder(folder)}/${filename.replace(/\.[^.]+$/, "")}`;

      const result = await new Promise<{ secure_url: string; public_id: string }>((resolve, reject) => {
        const stream = cloudinary.uploader.upload_stream(
          { public_id: publicId, resource_type: "image", overwrite: true, invalidate: true },
          (error, uploaded) => {
            if (error || !uploaded) {
              reject(error instanceof Error ? error : new Error("Cloudinary refused the upload."));
              return;
            }
            resolve({ secure_url: uploaded.secure_url, public_id: uploaded.public_id });
          },
        );
        stream.end(body);
      });

      return { url: result.secure_url, key: result.public_id };
    },

    async remove(key) {
      try {
        await cloudinary.uploader.destroy(key, { resource_type: "image", invalidate: true });
      } catch (error) {
        logger.warn({ err: error, key }, "Could not remove a Cloudinary asset");
      }
    },
  };
}

export const storage: StorageProvider =
  env.STORAGE_PROVIDER === "cloudinary" ? createCloudinaryProvider() : localProvider;
