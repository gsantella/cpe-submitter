import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

export const membersTable = sqliteTable("members", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  firstName: text("first_name").notNull(),
  lastName: text("last_name").notNull(),
  isc2Number: text("isc2_number").notNull().unique(),
  createdAt: text("created_at").notNull().$defaultFn(() => new Date().toISOString()),
});

export const insertMemberSchema = createInsertSchema(membersTable).omit({ id: true, createdAt: true });
export type InsertMember = z.infer<typeof insertMemberSchema>;
export type Member = typeof membersTable.$inferSelect;
