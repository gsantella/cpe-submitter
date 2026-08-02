import { defineConfig } from "drizzle-kit";
import { mkdirSync } from "fs";
import path from "path";

// Resolve data dir relative to workspace root (two levels up from lib/db)
const dataDir = path.join(__dirname, "../../data");
mkdirSync(dataDir, { recursive: true });
const dbPath = path.join(dataDir, "cpe-tracker.db");

export default defineConfig({
  schema: path.join(__dirname, "./src/schema/index.ts"),
  out: path.join(__dirname, "./migrations"),
  dialect: "sqlite",
  dbCredentials: {
    url: dbPath,
  },
});
