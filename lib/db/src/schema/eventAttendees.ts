import { pgTable, integer, timestamp, primaryKey } from "drizzle-orm/pg-core";
import { membersTable } from "./members";
import { eventsTable } from "./events";

export const eventAttendeesTable = pgTable(
  "event_attendees",
  {
    eventId: integer("event_id")
      .notNull()
      .references(() => eventsTable.id, { onDelete: "cascade" }),
    memberId: integer("member_id")
      .notNull()
      .references(() => membersTable.id, { onDelete: "cascade" }),
    checkedInAt: timestamp("checked_in_at", { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [primaryKey({ columns: [table.eventId, table.memberId] })],
);

export type EventAttendee = typeof eventAttendeesTable.$inferSelect;
