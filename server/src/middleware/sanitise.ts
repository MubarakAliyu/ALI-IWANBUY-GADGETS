import type { NextFunction, Request, Response } from "express";

/**
 * Mongo operator injection (overview §12): a body like `{ "slug": { "$ne": null } }` must never reach a query.
 * Keys starting with `$`, and keys containing a dot, are dropped from the request body and route parameters
 * in place — Express 5 exposes `req.query` through a getter, so query strings are instead kept flat by the
 * "simple" query parser set in `app.ts`.
 */
export function sanitiseRequest(req: Request, _res: Response, next: NextFunction): void {
  stripOperators(req.body);
  stripOperators(req.params);
  next();
}

function stripOperators(value: unknown, depth = 0): void {
  if (depth > 8 || value === null || typeof value !== "object") {
    return;
  }
  if (Array.isArray(value)) {
    for (const item of value) {
      stripOperators(item, depth + 1);
    }
    return;
  }
  for (const key of Object.keys(value as Record<string, unknown>)) {
    if (key.startsWith("$") || key.includes(".")) {
      delete (value as Record<string, unknown>)[key];
      continue;
    }
    stripOperators((value as Record<string, unknown>)[key], depth + 1);
  }
}
