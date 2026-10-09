/**
 * The Express application, built by a factory so tests can mount it without opening a port (overview §6.1).
 * `index.ts` is the only place that connects to MongoDB and listens.
 */

import path from "node:path";
import cookieParser from "cookie-parser";
import cors from "cors";
import express, { type Express, type Request, type Response } from "express";
import helmet from "helmet";
import mongoose from "mongoose";
import { pinoHttp } from "pino-http";
import { env, isTest } from "./config/env.js";
import { logger } from "./lib/logger.js";
import { errorHandler, notFoundHandler } from "./middleware/error.js";
import { sanitiseRequest } from "./middleware/sanitise.js";
import { apiRouter } from "./routes/index.js";

const JSON_BODY_LIMIT = "1mb";

export function createApp(): Express {
  const app = express();

  // "simple" keeps query values flat strings, so `?slug[$ne]=` cannot become a Mongo operator (overview §12).
  app.set("query parser", "simple");
  app.set("trust proxy", 1);
  app.disable("x-powered-by");

  app.use(
    helmet({
      // Images are served from this origin to a Next.js app on another port during development.
      crossOriginResourcePolicy: { policy: "cross-origin" },
    }),
  );
  app.use(cors({ origin: env.CLIENT_ORIGIN, credentials: true }));
  app.use(express.json({ limit: JSON_BODY_LIMIT }));
  app.use(express.urlencoded({ extended: false, limit: JSON_BODY_LIMIT }));
  app.use(cookieParser());
  app.use(sanitiseRequest);

  if (!isTest) {
    app.use(pinoHttp({ logger, autoLogging: { ignore: (req) => req.url === "/api/health" } }));
  }

  app.use(
    "/uploads",
    express.static(path.resolve(process.cwd(), env.UPLOAD_DIR), {
      maxAge: "7d",
      fallthrough: true,
      index: false,
    }),
  );

  app.get("/api/health", (_req: Request, res: Response) => {
    const states: Record<number, string> = { 0: "down", 1: "up", 2: "connecting", 3: "disconnecting" };
    const db = states[mongoose.connection.readyState] ?? "down";
    res.status(db === "up" ? 200 : 503).json({ ok: db === "up", db });
  });

  app.use("/api/v1", apiRouter);

  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
