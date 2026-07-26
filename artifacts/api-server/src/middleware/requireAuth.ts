import { Request, Response, NextFunction } from "express";
import { db, settingsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

/** Returns true if any auth credentials are configured (env vars or DB). */
async function authEnabled(): Promise<boolean> {
  if (process.env.AUTH_USERNAME && process.env.AUTH_PASSWORD) return true;
  const [row] = await db.select().from(settingsTable).where(eq(settingsTable.id, 1));
  return Boolean(row?.authUsername && row?.authPasswordHash);
}

/**
 * Auth guard middleware.
 * - If no credentials are configured anywhere → auth disabled, pass through.
 * - Auth routes (/auth/*) are always public.
 * - All other API routes require a valid session.
 */
export async function requireAuth(req: Request, res: Response, next: NextFunction): Promise<void> {
  if (req.path.startsWith("/auth/")) return next();

  if (!(await authEnabled())) return next();

  if ((req.session as any).authenticated) return next();

  res.status(401).json({ error: "Unauthorized" });
}
