import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { mkdirSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import * as schema from "./schema";

// Resolve data dir relative to this file's location (lib/db/src -> lib/db -> workspace root)
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const dataDir = join(__dirname, "../../../data");
mkdirSync(dataDir, { recursive: true });

const sqlite = new Database(join(dataDir, "cpe-tracker.db"));
export const db = drizzle(sqlite, { schema });

export * from "./schema";
