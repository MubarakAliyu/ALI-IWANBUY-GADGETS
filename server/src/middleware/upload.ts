/**
 * Receiving an uploaded image (overview §10 A-5).
 *
 * Files are held in memory, never written in the shape they arrived in: sharp re-encodes every upload to
 * WebP, which also means a file pretending to be a JPEG is caught when sharp fails to read it rather than
 * being stored and served.
 */

import multer from "multer";
import type { NextFunction, Request, Response } from "express";
import { AppError } from "../lib/app-error.js";
import { MAX_UPLOAD_BYTES } from "../lib/images.js";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: MAX_UPLOAD_BYTES, files: 1 },
});

/** One file, under the field name `image`, with multer's own errors turned into the project's shape. */
export function uploadImage(req: Request, res: Response, next: NextFunction): void {
  upload.single("image")(req, res, (error: unknown) => {
    if (!error) {
      next();
      return;
    }
    if (error instanceof multer.MulterError) {
      next(
        AppError.badRequest(
          error.code === "LIMIT_FILE_SIZE"
            ? "That image is too large. Keep it under 8MB."
            : "We could not read that upload. Choose one image and try again.",
        ),
      );
      return;
    }
    next(error);
  });
}
