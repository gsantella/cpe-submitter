import { sqliteTable, integer, text, primaryKey } from "drizzle-orm/sqlite-core";
import { membersTable } from "./members";
import { eventsTable } from "./events";

export const eventAttendeesTable = sqliteTable(
  "event_attendees",
  {
    eventId: integer("event_id")
      .notNull()
      .references(() => eventsTable.id, { onDelete: "cascade" }),
    memberId: integer("member_id")
      .notNull()
      .references(() => membersTable.id, { onDelete: "cascade" }),
    checkedInAt: text("checked_in_at").notNull().$defaultFn(() => new Date().toISOString()),
  },
  (table) => [primaryKey({ columns: [table.eventId, table.memberId] })],
);

export type EventAttendee = typeof eventAttendeesTable.$inferSelect;
