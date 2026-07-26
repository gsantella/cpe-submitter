import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

// Single-row settings table (always id = 1)
export const settingsTable = sqliteTable("settings", {
  id: integer("id").primaryKey({ autoIncrement: false }),
  chapterName: text("chapter_name").notNull().default(""),
  // Auth credentials — both null means auth is disabled
  authUsername: text("auth_username"),
  authPasswordHash: text("auth_password_hash"),
});
