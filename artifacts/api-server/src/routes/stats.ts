import { Router, type IRouter } from "express";
import { count, eq, sql } from "drizzle-orm";
import { db, membersTable, eventsTable, eventAttendeesTable } from "@workspace/db";
import { GetDashboardStatsResponse } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/stats", async (_req, res): Promise<void> => {
  const [totalMembersResult] = await db.select({ count: count() }).from(membersTable);
  const [totalEventsResult] = await db.select({ count: count() }).from(eventsTable);

  const groupCounts = await db
    .select({ groupType: eventsTable.groupType, count: count() })
    .from(eventsTable)
    .groupBy(eventsTable.groupType);

  const groupACount = groupCounts.find((g) => g.groupType === "Group A")?.count ?? 0;
  const groupBCount = groupCounts.find((g) => g.groupType === "Group B")?.count ?? 0;

  // Get 5 most recent events with attendee counts
  const recentEventsRaw = await db
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
    .orderBy(sql`${eventsTable.date} desc`)
    .limit(5);

  const stats = {
    totalMembers: totalMembersResult.count,
    totalEvents: totalEventsResult.count,
    groupACount: Number(groupACount),
    groupBCount: Number(groupBCount),
    recentEvents: recentEventsRaw.map((e) => ({
      ...e,
      attendeeCount: Number(e.attendeeCount),
      createdAt: e.createdAt instanceof Date ? e.createdAt.toISOString() : e.createdAt,
    })),
  };

  res.json(GetDashboardStatsResponse.parse(stats));
});

export default router;
