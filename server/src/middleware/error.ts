import type { NextFunction, Request, Response } from "express";
import { ZodError } from "zod";
import { isProduction } from "../config/env.js";
import { AppError, type FieldError } from "../lib/app-error.js";
import { logger } from "../lib/logger.js";

/** Every response the API refuses with looks the same (overview §11). */
export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({
    error: { code: "NOT_FOUND", message: `No route for ${req.method} ${req.path}` },
  });
}

export function errorHandler(error: unknown, _req: Request, res: Response, next: NextFunction): void {
  if (res.headersSent) {
    next(error);
    return;
  }

  if (error instanceof AppError) {
    res.status(error.status).json({
      error: {
        code: error.code,
        message: error.message,
        ...(error.fields ? { fields: error.fields } : {}),
      },
    });
    return;
  }

  if (error instanceof ZodError) {
    res.status(400).json({
      error: { code: "VALIDATION_FAILED", message: "Some fields are not valid.", fields: zodFields(error) },
    });
    return;
  }

  if (isCastError(error)) {
    res.status(400).json({ error: { code: "BAD_REQUEST", message: `"${error.value}" is not a valid id.` } });
    return;
  }

  logger.error({ err: error }, "Unhandled error");
  res.status(500).json({
    error: {
      code: "INTERNAL",
      message: isProduction
        ? "Something went wrong. Please try again."
        : error instanceof Error
          ? error.message
          : "Unknown error",
    },
  });
}

export function zodFields(error: ZodError): FieldError[] {
  return error.issues.map((issue) => ({ path: issue.path.join("."), message: issue.message }));
}

function isCastError(error: unknown): error is { name: string; value: unknown } {
  return typeof error === "object" && error !== null && (error as { name?: string }).name === "CastError";
}
