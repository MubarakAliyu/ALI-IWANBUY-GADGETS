/**
 * Where uploaded files live (overview §6.7, Batch 3 Part H.1).
 *
 * One interface with a provider behind it, so the choice between a folder on this machine and a CDN is made
 * once, in configuration, and nothing that stores a file has to know which it got. `local` writes under
 * `server/uploads` and is the development default; the production provider joins it in Part H without any
 * caller changing.
 */

import { mkdir, unlink, writeFile } from "node:fs/promises";
import path from "node:path";
import { randomBytes } from "node:crypto";
import { env } from "../config/env.js";
import { logger } from "./logger.js";

export type StoredFile = {
  /** The path the browser asks for, always beginning `/uploads/` so the Next.js rewrite finds it. */
  url: string;
  /** What `remove` needs to delete it again. */
  key: string;
};

export type StorageProvider = {
  readonly kind: "local";
  /** `folder` groups files — "products", "brands", "categories". */
  put(folder: string, filename: string, body: Buffer, contentType: string): Promise<StoredFile>;
  remove(key: string): Promise<void>;
};

const ROOT = path.resolve(process.cwd(), env.UPLOAD_DIR);

/** A name that cannot collide and cannot escape its folder, keeping the caller's extension. */
export function safeFilename(original: string): string {
  const extension = path.extname(original).toLowerCase().replace(/[^.a-z0-9]/g, "") || ".bin";
  return `${Date.now().toString(36)}-${randomBytes(6).toString("hex")}${extension}`;
}

const localProvider: StorageProvider = {
  kind: "local",

  async put(folder, filename, body) {
    const safeFolder = folder.replace(/[^a-z0-9-]/gi, "");
    const directory = path.join(ROOT, safeFolder);
    await mkdir(directory, { recursive: true });
    await writeFile(path.join(directory, filename), body);

    return { url: `/uploads/${safeFolder}/${filename}`, key: `${safeFolder}/${filename}` };
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

export const storage: StorageProvider = localProvider;
