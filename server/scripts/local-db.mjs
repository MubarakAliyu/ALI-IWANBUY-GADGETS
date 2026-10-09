/**
 * `pnpm db:local` — a real MongoDB replica set with nothing to install (Batch 1 Part B).
 *
 * `mongodb-memory-server` downloads a mongod binary once and runs it as a single-node replica set, which is
 * what transactions need (ADR-005). The data directory is `server/.local/mongo`, so the catalogue survives a
 * restart; delete that folder for a clean slate. Stop the set with Ctrl-C.
 */

import { mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { MongoMemoryReplSet } from "mongodb-memory-server";

const PORT = 27027;
const REPLICA_SET = "aibrs";

const serverDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dbPath = path.join(serverDir, ".local", "mongo");
mkdirSync(dbPath, { recursive: true });

const replicaSet = await MongoMemoryReplSet.create({
  replSet: { count: 1, name: REPLICA_SET, storageEngine: "wiredTiger" },
  instanceOpts: [{ port: PORT, dbPath, storageEngine: "wiredTiger" }],
});

const uri = `mongodb://127.0.0.1:${PORT}/aib_store?replicaSet=${REPLICA_SET}&directConnection=true`;

console.log("");
console.log("  MongoDB replica set running (Ctrl-C to stop)");
console.log(`  data   ${dbPath}`);
console.log("");
console.log("  Put this in server/.env:");
console.log(`  MONGODB_URI=${uri}`);
console.log("");

let stopping = false;
async function stop() {
  if (stopping) {
    return;
  }
  stopping = true;
  console.log("\n  Stopping MongoDB…");
  await replicaSet.stop();
  process.exit(0);
}

process.on("SIGINT", () => void stop());
process.on("SIGTERM", () => void stop());
