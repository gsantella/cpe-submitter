import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

// Single-row settings table (always id = 1)
export const settingsTable = sqliteTable("settings", {
  id: integer("id").primaryKey({ autoIncrement: false }),
  chapterName: text("chapter_name").notNull().default(""),
});
