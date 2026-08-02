import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { mkdirSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import * as schema from "./schema";

// DATABASE_PATH env var overrides the default location.
// Set it in Docker to point at the named volume (e.g. /data/cpe-tracker.db).
// Falls back to data/ at the workspace root when running locally on Replit.
const dbPath = process.env.DATABASE_PATH ?? (() => {
  const __filename = fileURLToPath(import.meta.url);
  const __dirname = dirname(__filename);
  const dataDir = join(__dirname, "../../../data");
  return join(dataDir, "cpe-tracker.db");
})();

mkdirSync(dirname(dbPath), { recursive: true });

const sqlite = new Database(dbPath);
export const db = drizzle(sqlite, { schema });

export * from "./schema";
