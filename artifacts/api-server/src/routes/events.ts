import { Router, type IRouter } from "express";
import { eq, sql, count } from "drizzle-orm";
import { db, eventsTable, eventAttendeesTable } from "@workspace/db";
import {
  CreateEventBody,
  CreateEventResponse,
  DeleteEventParams,
  GetEventParams,
  GetEventResponse,
  ListEventsResponse,
  UpdateEventBody,
  UpdateEventParams,
  UpdateEventResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

function serializeEvent(e: { createdAt: Date | string; attendeeCount: number; [k: string]: unknown }) {
  return { ...e, createdAt: e.createdAt instanceof Date ? e.createdAt.toISOString() : e.createdAt };
}

function validateDescription(description: string): string | null {
  if (description.length > 100) return "Description must be 100 characters or fewer";
  if (/[,'""]/.test(description)) return "Description cannot contain commas or quotation marks";
  return null;
}

async function getEventWithCount(id: number) {
  const [row] = await db
    .select({
      id: eventsTable.id,
      name: eventsTable.name,
      date: eventsTable.date,
      groupType: eventsTable.groupType,
      cpeCredits: eventsTable.cpeCredits,
      description: eventsTable.description,
      createdAt: eventsTable.createdAt,
      attendeeCount: sql<number>`cast(count(${eventAttendeesTable.memberId}) as integer)`,
    })
    .from(eventsTable)
    .leftJoin(eventAttendeesTable, eq(eventsTable.id, eventAttendeesTable.eventId))
    .where(eq(eventsTable.id, id))
    .groupBy(eventsTable.id);
  return row;
}

router.get("/events", async (_req, res): Promise<void> => {
  const events = await db
    .select({
      id: eventsTable.id,
      name: eventsTable.name,
      date: eventsTable.date,
      groupType: eventsTable.groupType,
      cpeCredits: eventsTable.cpeCredits,
      description: eventsTable.description,
      createdAt: eventsTable.createdAt,
      attendeeCount: sql<number>`cast(count(${eventAttendeesTable.memberId}) as integer)`,
    })
    .from(eventsTable)
    .leftJoin(eventAttendeesTable, eq(eventsTable.id, eventAttendeesTable.eventId))
    .groupBy(eventsTable.id)
    .orderBy(sql`${eventsTable.date} desc`);

  res.json(ListEventsResponse.parse(events.map((e) => serializeEvent({ ...e, attendeeCount: Number(e.attendeeCount) }))));
});

router.post("/events", async (req, res): Promise<void> => {
  const parsed = CreateEventBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  const descError = validateDescription(parsed.data.description);
  if (descError) {
    res.status(400).json({ error: descError });
    return;
  }

  const [event] = await db
    .insert(eventsTable)
    .values({
      name: parsed.data.name,
      date: parsed.data.date,
      groupType: parsed.data.groupType,
      cpeCredits: parsed.data.cpeCredits,
      description: parsed.data.description,
    })
    .returning();

  const row = await getEventWithCount(event.id);
  res.status(201).json(CreateEventResponse.parse(serializeEvent({ ...row, attendeeCount: Number(row.attendeeCount) })));
});

router.get("/events/:id", async (req, res): Promise<void> => {
  const params = GetEventParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const row = await getEventWithCount(params.data.id);
  if (!row) {
    res.status(404).json({ error: "Event not found" });
    return;
  }

  res.json(GetEventResponse.parse(serializeEvent({ ...row, attendeeCount: Number(row.attendeeCount) })));
});

router.patch("/events/:id", async (req, res): Promise<void> => {
  const params = UpdateEventParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateEventBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  if (parsed.data.description !== undefined) {
    const descError = validateDescription(parsed.data.description);
    if (descError) {
      res.status(400).json({ error: descError });
      return;
    }
  }

  const updateData: Partial<typeof eventsTable.$inferInsert> = {};
  if (parsed.data.name !== undefined) updateData.name = parsed.data.name;
  if (parsed.data.date !== undefined) updateData.date = parsed.data.date;
  if (parsed.data.groupType !== undefined) updateData.groupType = parsed.data.groupType;
  if (parsed.data.cpeCredits !== undefined) updateData.cpeCredits = parsed.data.cpeCredits;
  if (parsed.data.description !== undefined) updateData.description = parsed.data.description;

  const [updated] = await db
    .update(eventsTable)
    .set(updateData)
    .where(eq(eventsTable.id, params.data.id))
    .returning();

  if (!updated) {
    res.status(404).json({ error: "Event not found" });
    return;
  }

  const row = await getEventWithCount(updated.id);
  res.json(UpdateEventResponse.parse(serializeEvent({ ...row, attendeeCount: Number(row.attendeeCount) })));
});

router.delete("/events/:id", async (req, res): Promise<void> => {
  const params = DeleteEventParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [deleted] = await db
    .delete(eventsTable)
    .where(eq(eventsTable.id, params.data.id))
    .returning();

  if (!deleted) {
    res.status(404).json({ error: "Event not found" });
    return;
  }

  res.sendStatus(204);
});

export default router;
