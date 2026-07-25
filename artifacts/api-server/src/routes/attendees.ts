import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db, eventsTable, membersTable, eventAttendeesTable } from "@workspace/db";
import {
  CheckInAttendeeBody,
  CheckInAttendeeParams,
  CheckInAttendeeResponse,
  ListEventAttendeesParams,
  ListEventAttendeesResponse,
  RemoveAttendeeParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

function serializeAttendee(a: { checkedInAt: Date | string; [k: string]: unknown }) {
  return { ...a, checkedInAt: a.checkedInAt instanceof Date ? a.checkedInAt.toISOString() : a.checkedInAt };
}

router.get("/events/:id/attendees", async (req, res): Promise<void> => {
  const params = ListEventAttendeesParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  // Verify event exists
  const [event] = await db.select().from(eventsTable).where(eq(eventsTable.id, params.data.id));
  if (!event) {
    res.status(404).json({ error: "Event not found" });
    return;
  }

  const attendees = await db
    .select({
      memberId: membersTable.id,
      firstName: membersTable.firstName,
      lastName: membersTable.lastName,
      isc2Number: membersTable.isc2Number,
      checkedInAt: eventAttendeesTable.checkedInAt,
    })
    .from(eventAttendeesTable)
    .innerJoin(membersTable, eq(eventAttendeesTable.memberId, membersTable.id))
    .where(eq(eventAttendeesTable.eventId, params.data.id))
    .orderBy(membersTable.lastName, membersTable.firstName);

  res.json(ListEventAttendeesResponse.parse(attendees.map(serializeAttendee)));
});

router.post("/events/:id/attendees", async (req, res): Promise<void> => {
  const params = CheckInAttendeeParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = CheckInAttendeeBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  // Verify event exists
  const [event] = await db.select().from(eventsTable).where(eq(eventsTable.id, params.data.id));
  if (!event) {
    res.status(404).json({ error: "Event not found" });
    return;
  }

  // Verify member exists
  const [member] = await db
    .select()
    .from(membersTable)
    .where(eq(membersTable.id, parsed.data.memberId));
  if (!member) {
    res.status(404).json({ error: "Member not found" });
    return;
  }

  // Check if already checked in
  const [existing] = await db
    .select()
    .from(eventAttendeesTable)
    .where(
      and(
        eq(eventAttendeesTable.eventId, params.data.id),
        eq(eventAttendeesTable.memberId, parsed.data.memberId),
      ),
    );
  if (existing) {
    res.status(409).json({ error: "Member is already checked in to this event" });
    return;
  }

  const [attendee] = await db
    .insert(eventAttendeesTable)
    .values({
      eventId: params.data.id,
      memberId: parsed.data.memberId,
    })
    .returning();

  res.status(201).json(
    CheckInAttendeeResponse.parse(
      serializeAttendee({
        memberId: member.id,
        firstName: member.firstName,
        lastName: member.lastName,
        isc2Number: member.isc2Number,
        checkedInAt: attendee.checkedInAt,
      }),
    ),
  );
});

router.delete("/events/:id/attendees/:memberId", async (req, res): Promise<void> => {
  const rawId = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;
  const rawMemberId = Array.isArray(req.params.memberId) ? req.params.memberId[0] : req.params.memberId;
  const params = RemoveAttendeeParams.safeParse({ id: rawId, memberId: rawMemberId });
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [deleted] = await db
    .delete(eventAttendeesTable)
    .where(
      and(
        eq(eventAttendeesTable.eventId, params.data.id),
        eq(eventAttendeesTable.memberId, params.data.memberId),
      ),
    )
    .returning();

  if (!deleted) {
    res.status(404).json({ error: "Attendee not found" });
    return;
  }

  res.sendStatus(204);
});

export default router;
