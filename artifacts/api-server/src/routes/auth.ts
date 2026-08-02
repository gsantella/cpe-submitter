import { Router, type IRouter } from "express";
import { timingSafeEqual } from "crypto";
import bcrypt from "bcryptjs";
import { db, settingsTable } from "@workspace/db";
import { eq } from "drizzle-orm";

const router: IRouter = Router();

const SALT_ROUNDS = 12;

function safeCompare(a: string, b: string): boolean {
  const aBuf = Buffer.from(a.padEnd(256));
  const bBuf = Buffer.from(b.padEnd(256));
  return timingSafeEqual(aBuf, bBuf) && a.length === b.length;
}

async function getSettings() {
  const [row] = await db.select().from(settingsTable).where(eq(settingsTable.id, 1));
  return row ?? null;
}

async function authEnabled(): Promise<boolean> {
  if (process.env.AUTH_USERNAME && process.env.AUTH_PASSWORD) return true;
  const row = await getSettings();
  return Boolean(row?.authUsername && row?.authPasswordHash);
}

/**
 * GET /api/auth/me
 * { enabled: false }                   — auth off, no login needed
 * { enabled: true, username: string }  — auth on, valid session
 * 401                                  — auth on, not logged in
 */
router.get("/auth/me", async (req, res): Promise<void> => {
  if (!(await authEnabled())) {
    res.json({ enabled: false });
    return;
  }
  if ((req.session as any).authenticated) {
    res.json({ enabled: true, username: (req.session as any).username as string });
    return;
  }
  res.status(401).json({ error: "Unauthorized" });
});

/** POST /api/auth/login — body: { username, password } */
router.post("/auth/login", async (req, res): Promise<void> => {
  if (!(await authEnabled())) {
    res.status(400).json({ error: "Auth is not enabled" });
    return;
  }

  const { username: rawUsername, password } = req.body as { username?: string; password?: string };
  if (typeof rawUsername !== "string" || typeof password !== "string") {
    res.status(400).json({ error: "username and password are required" });
    return;
  }
  const username = rawUsername.toLowerCase().trim();

  // Env-var override takes precedence (recovery / initial setup)
  if (process.env.AUTH_USERNAME && process.env.AUTH_PASSWORD) {
    if (safeCompare(username, process.env.AUTH_USERNAME.toLowerCase().trim()) && safeCompare(password, process.env.AUTH_PASSWORD)) {
      (req.session as any).authenticated = true;
      (req.session as any).username = username;
      res.json({ username });
      return;
    }
  } else {
    const row = await getSettings();
    if (row?.authUsername && row?.authPasswordHash) {
      if (
        safeCompare(username, row.authUsername.toLowerCase().trim()) &&
        (await bcrypt.compare(password, row.authPasswordHash))
      ) {
        (req.session as any).authenticated = true;
        (req.session as any).username = username;
        res.json({ username });
        return;
      }
    }
  }

  res.status(401).json({ error: "Invalid username or password" });
});

/** POST /api/auth/logout */
router.post("/auth/logout", (req, res): void => {
  req.session.destroy(() => res.json({ ok: true }));
});

/**
 * GET /api/auth/credentials
 * Returns current auth status without exposing the hash.
 */
router.get("/auth/credentials", async (req, res): Promise<void> => {
  const envEnabled = Boolean(process.env.AUTH_USERNAME && process.env.AUTH_PASSWORD);
  if (envEnabled) {
    res.json({ enabled: true, username: process.env.AUTH_USERNAME, managedByEnv: true });
    return;
  }
  const row = await getSettings();
  res.json({
    enabled: Boolean(row?.authUsername && row?.authPasswordHash),
    username: row?.authUsername ?? null,
    managedByEnv: false,
  });
});

/**
 * POST /api/auth/credentials — set or update credentials.
 *
 * First-time setup (auth disabled):
 *   body: { username, newPassword }
 *
 * Updating (auth enabled, must be logged in):
 *   body: { username, currentPassword, newPassword }
 */
router.post("/auth/credentials", async (req, res): Promise<void> => {
  const { username, currentPassword, newPassword } = req.body as {
    username?: string;
    currentPassword?: string;
    newPassword?: string;
  };

  if (typeof username !== "string" || !username.trim()) {
    res.status(400).json({ error: "username is required" });
    return;
  }
  if (typeof newPassword !== "string" || newPassword.length < 8) {
    res.status(400).json({ error: "newPassword must be at least 8 characters" });
    return;
  }

  const currentlyEnabled = await authEnabled();

  if (currentlyEnabled) {
    // Must be authenticated to change credentials
    if (!(req.session as any).authenticated) {
      res.status(401).json({ error: "Unauthorized" });
      return;
    }
    // Env-var managed — cannot update through the UI
    if (process.env.AUTH_USERNAME && process.env.AUTH_PASSWORD) {
      res.status(400).json({ error: "Credentials are managed via environment variables and cannot be changed here." });
      return;
    }
    // Verify current password
    const row = await getSettings();
    if (!row?.authPasswordHash || typeof currentPassword !== "string") {
      res.status(400).json({ error: "currentPassword is required to update credentials" });
      return;
    }
    if (!(await bcrypt.compare(currentPassword, row.authPasswordHash))) {
      res.status(401).json({ error: "Current password is incorrect" });
      return;
    }
  }

  const hash = await bcrypt.hash(newPassword, SALT_ROUNDS);

  const normalizedUsername = username.toLowerCase().trim();
  await db
    .insert(settingsTable)
    .values({ id: 1, chapterName: "", authUsername: normalizedUsername, authPasswordHash: hash })
    .onConflictDoUpdate({
      target: settingsTable.id,
      set: { authUsername: normalizedUsername, authPasswordHash: hash },
    });

  res.json({ ok: true });
});

/**
 * DELETE /api/auth/credentials — disable auth (clear credentials).
 * Must be authenticated.
 */
router.delete("/auth/credentials", async (req, res): Promise<void> => {
  if (!(req.session as any).authenticated) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  if (process.env.AUTH_USERNAME && process.env.AUTH_PASSWORD) {
    res.status(400).json({ error: "Credentials are managed via environment variables." });
    return;
  }
  await db
    .insert(settingsTable)
    .values({ id: 1, chapterName: "", authUsername: null, authPasswordHash: null })
    .onConflictDoUpdate({
      target: settingsTable.id,
      set: { authUsername: null, authPasswordHash: null },
    });

  req.session.destroy(() => res.json({ ok: true }));
});

export default router;
