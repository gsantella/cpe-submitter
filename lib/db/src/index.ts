import Database from "better-sqlite3";
import { drizzle } from "drizzle-orm/better-sqlite3";
import { migrate } from "drizzle-orm/better-sqlite3/migrator";
import { mkdirSync } from "fs";
import { dirname, join } from "path";
import { fileURLToPath } from "url";
import * as schema from "./schema";

// __dirname is not available in ES modules; derive it from import.meta.url.
// When bundled by esbuild (both dev and production), import.meta.url points to
// the compiled bundle file, so __dirname is the bundle's output directory.
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// DATABASE_PATH env var overrides the default location.
// Set it in Docker to point at the named volume (e.g. /data/cpe-tracker.db).
// Falls back to data/ at the workspace root when running locally on Replit.
const dbPath =
  process.env.DATABASE_PATH ?? join(__dirname, "../../../data/cpe-tracker.db");

mkdirSync(dirname(dbPath), { recursive: true });

const sqlite = new Database(dbPath);
export const db = drizzle(sqlite, { schema });

// Resolve the migrations folder.
//
// In production (Docker), MIGRATIONS_FOLDER=/app/migrations is set in the
// Dockerfile and that directory is copied from lib/db/migrations/.
//
// In dev on Replit, MIGRATIONS_FOLDER is not set.  This file is bundled into
// artifacts/api-server/dist/index.mjs, so __dirname is that dist/ directory.
// Three levels up lands at the monorepo root where lib/db/migrations/ lives.
const migrationsFolder =
  process.env.MIGRATIONS_FOLDER ??
  join(__dirname, "../../../lib/db/migrations");

// Apply any pending migrations synchronously before the server starts.
// This is a no-op when all migrations have already been applied.
migrate(db, { migrationsFolder });

export * from "./schema";
