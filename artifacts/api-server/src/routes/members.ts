import { Router, type IRouter } from "express";
import { and, eq, like, or } from "drizzle-orm";
import { db, membersTable } from "@workspace/db";
import {
  CreateMemberBody,
  CreateMemberResponse,
  DeleteMemberParams,
  GetMemberParams,
  GetMemberResponse,
  ListMembersQueryParams,
  ListMembersResponse,
  UpdateMemberBody,
  UpdateMemberParams,
  UpdateMemberResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

function serializeMember(m: { createdAt: Date | string; [k: string]: unknown }) {
  return { ...m, createdAt: m.createdAt instanceof Date ? m.createdAt.toISOString() : m.createdAt };
}

router.get("/members", async (req, res): Promise<void> => {
  const queryParams = ListMembersQueryParams.safeParse(req.query);

  let members;
  if (queryParams.success && queryParams.data.search) {
    const term = `%${queryParams.data.search}%`;
    members = await db
      .select()
      .from(membersTable)
      .where(
        or(
          like(membersTable.firstName, term),
          like(membersTable.lastName, term),
          like(membersTable.isc2Number, term),
        ),
      )
      .orderBy(membersTable.lastName, membersTable.firstName);
  } else {
    members = await db
      .select()
      .from(membersTable)
      .orderBy(membersTable.lastName, membersTable.firstName);
  }

  res.json(ListMembersResponse.parse(members.map(serializeMember)));
});

router.post("/members", async (req, res): Promise<void> => {
  const parsed = CreateMemberBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  // Check for duplicate ISC2 number
  const existing = await db
    .select()
    .from(membersTable)
    .where(eq(membersTable.isc2Number, parsed.data.isc2Number));
  if (existing.length > 0) {
    res.status(409).json({ error: "A member with this ISC2 number already exists" });
    return;
  }

  const [member] = await db
    .insert(membersTable)
    .values({
      firstName: parsed.data.firstName,
      lastName: parsed.data.lastName,
      isc2Number: parsed.data.isc2Number,
    })
    .returning();

  res.status(201).json(CreateMemberResponse.parse(serializeMember(member)));
});

router.get("/members/:id", async (req, res): Promise<void> => {
  const params = GetMemberParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [member] = await db
    .select()
    .from(membersTable)
    .where(eq(membersTable.id, params.data.id));

  if (!member) {
    res.status(404).json({ error: "Member not found" });
    return;
  }

  res.json(GetMemberResponse.parse(serializeMember(member)));
});

router.patch("/members/:id", async (req, res): Promise<void> => {
  const params = UpdateMemberParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const parsed = UpdateMemberBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }

  // Check for duplicate ISC2 number if changing it
  if (parsed.data.isc2Number) {
    const existing = await db
      .select()
      .from(membersTable)
      .where(
        and(
          eq(membersTable.isc2Number, parsed.data.isc2Number),
        ),
      );
    const conflict = existing.find((m) => m.id !== params.data.id);
    if (conflict) {
      res.status(409).json({ error: "A member with this ISC2 number already exists" });
      return;
    }
  }

  const updateData: Partial<typeof membersTable.$inferInsert> = {};
  if (parsed.data.firstName) updateData.firstName = parsed.data.firstName;
  if (parsed.data.lastName) updateData.lastName = parsed.data.lastName;
  if (parsed.data.isc2Number) updateData.isc2Number = parsed.data.isc2Number;

  const [member] = await db
    .update(membersTable)
    .set(updateData)
    .where(eq(membersTable.id, params.data.id))
    .returning();

  if (!member) {
    res.status(404).json({ error: "Member not found" });
    return;
  }

  res.json(UpdateMemberResponse.parse(serializeMember(member)));
});

router.delete("/members/:id", async (req, res): Promise<void> => {
  const params = DeleteMemberParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }

  const [member] = await db
    .delete(membersTable)
    .where(eq(membersTable.id, params.data.id))
    .returning();

  if (!member) {
    res.status(404).json({ error: "Member not found" });
    return;
  }

  res.sendStatus(204);
});

export default router;
