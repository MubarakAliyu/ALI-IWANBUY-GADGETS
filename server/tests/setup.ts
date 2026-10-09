/**
 * Every server test runs against a real MongoDB replica set from `mongodb-memory-server` — the same shape as
 * production, so transactions and the atomic counters behave exactly as they will in Atlas (ADR-005).
 *
 * The placeholder URI below exists only so `config/env.ts` can parse at import time; the connection the tests
 * actually use is the replica set started in `beforeAll`.
 */

process.env.NODE_ENV = "test";
process.env.MONGODB_URI ??= "mongodb://127.0.0.1:27017/aib_test";
process.env.LOG_LEVEL = "silent";

import { MongoMemoryReplSet } from "mongodb-memory-server";
import mongoose from "mongoose";
import { afterAll, beforeAll } from "vitest";

let replicaSet: MongoMemoryReplSet | undefined;

beforeAll(async () => {
  replicaSet = await MongoMemoryReplSet.create({
    replSet: { count: 1, storageEngine: "wiredTiger" },
  });
  await mongoose.connect(replicaSet.getUri(), { dbName: "aib_test" });
});

afterAll(async () => {
  await mongoose.disconnect();
  await replicaSet?.stop();
});
