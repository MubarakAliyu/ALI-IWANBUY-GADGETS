import { createApp } from "./app.js";
import { env } from "./config/env.js";
import { connectDatabase, disconnectDatabase } from "./db.js";
import { logger } from "./lib/logger.js";

async function start(): Promise<void> {
  await connectDatabase();

  const server = createApp().listen(env.PORT, () => {
    logger.info(`API listening on http://localhost:${env.PORT} (${env.NODE_ENV})`);
  });

  const shutdown = (signal: string) => {
    logger.info({ signal }, "Shutting down");
    server.close(() => {
      void disconnectDatabase().then(() => process.exit(0));
    });
  };

  process.on("SIGINT", () => shutdown("SIGINT"));
  process.on("SIGTERM", () => shutdown("SIGTERM"));
}

start().catch((error: unknown) => {
  logger.error({ err: error }, "Failed to start");
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
