import mongoose from "mongoose";
import { env } from "./config/env.js";
import { logger } from "./lib/logger.js";

/**
 * One connection for the process. Transactions need a replica set (ADR-005): MongoDB Atlas in production,
 * `pnpm db:local` in development, `MongoMemoryReplSet` in tests.
 */
export async function connectDatabase(uri: string = env.MONGODB_URI): Promise<typeof mongoose> {
  mongoose.set("strictQuery", true);
  const connection = await mongoose.connect(uri, {
    dbName: env.MONGODB_DB_NAME,
    serverSelectionTimeoutMS: 10_000,
  });
  logger.info({ db: connection.connection.name }, "Connected to MongoDB");
  return connection;
}

export async function disconnectDatabase(): Promise<void> {
  await mongoose.disconnect();
}
