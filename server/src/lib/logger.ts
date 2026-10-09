/**
 * Request and application logging (overview §12). Pretty in development, JSON lines in production, silent in
 * tests so a failing assertion is not buried in request logs.
 */

import { pino } from "pino";
import { env, isProduction, isTest } from "../config/env.js";

export const logger = pino({
  level: isTest ? "silent" : env.LOG_LEVEL,
  ...(isProduction || isTest
    ? {}
    : {
        transport: {
          target: "pino-pretty",
          options: { colorize: true, translateTime: "HH:MM:ss", ignore: "pid,hostname" },
        },
      }),
});
