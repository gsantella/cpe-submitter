import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const eventsTable = sqliteTable("events", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  name: text("name").notNull(),
  date: text("date").notNull(), // YYYY-MM-DD
  groupType: text("group_type").notNull(), // "Group A" | "Group B"
  cpeCredits: real("cpe_credits").notNull(),
  description: text("description").notNull(),
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
});

export const insertEventSchema = createInsertSchema(eventsTable).omit({ id: true, createdAt: true });
export type InsertEvent = z.infer<typeof insertEventSchema>;
export type Event = typeof eventsTable.$inferSelect;
