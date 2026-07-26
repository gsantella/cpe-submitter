import { Router, type IRouter } from "express";
import { eq } from "drizzle-orm";
import { db, settingsTable } from "@workspace/db";

const router: IRouter = Router();

async function getOrInitSettings() {
  const [row] = await db.select().from(settingsTable).where(eq(settingsTable.id, 1));
  if (row) return row;
  const [inserted] = await db
    .insert(settingsTable)
    .values({ id: 1, chapterName: "" })
    .returning();
  return inserted;
}

router.get("/settings", async (_req, res): Promise<void> => {
  const settings = await getOrInitSettings();
  res.json({ chapterName: settings.chapterName });
});

router.put("/settings", async (req, res): Promise<void> => {
  const { chapterName } = req.body;
  if (typeof chapterName !== "string") {
    res.status(400).json({ error: "chapterName must be a string" });
    return;
  }
  const trimmed = chapterName.trim();
  if (trimmed.length > 200) {
    res.status(400).json({ error: "Chapter name must be 200 characters or fewer" });
    return;
  }

  await db
    .insert(settingsTable)
    .values({ id: 1, chapterName: trimmed })
    .onConflictDoUpdate({ target: settingsTable.id, set: { chapterName: trimmed } });

  res.json({ chapterName: trimmed });
});

export default router;
