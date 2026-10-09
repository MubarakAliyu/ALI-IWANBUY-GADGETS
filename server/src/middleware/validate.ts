import type { NextFunction, Request, Response } from "express";
import type { ZodType } from "zod";
import { AppError } from "../lib/app-error.js";
import { zodFields } from "./error.js";

/**
 * Validation happens once, at the edge, against a schema from `@aib/shared` — so the client and the server
 * agree by construction (overview §6.3). The parsed value is handed to the controller through `res.locals`,
 * which keeps the typed result and the untyped Express request apart.
 */

export function validateBody<T>(schema: ZodType<T>) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      next(AppError.badRequest("Some fields are not valid.", zodFields(parsed.error)));
      return;
    }
    res.locals.validated = parsed.data;
    next();
  };
}

/** The validated body, typed. Call it only in a handler that sits behind `validateBody`. */
export function validated<T>(res: Response): T {
  return res.locals.validated as T;
}
