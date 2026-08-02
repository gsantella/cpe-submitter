---
name: Docker pnpm version pinning
description: Why pnpm must be pinned to v10 in the Dockerfile, not installed via corepack latest.
---

The pnpm lockfile was generated with pnpm v10 (lockfileVersion: '9.0'). Using `corepack enable pnpm` in Docker pulls pnpm v11, which has a different lockfile format and causes `pnpm install --frozen-lockfile` to fail with exit code 1.

**Rule:** Always pin pnpm in the Dockerfile with `npm install -g pnpm@10`. Do not use `corepack enable pnpm` without a version pin.

**Why:** pnpm major versions change the lockfile format. `--frozen-lockfile` strictly requires the format to match. corepack without a `packageManager` field in package.json defaults to latest, which may be a newer major.

**How to apply:** If pnpm is ever upgraded in the workspace (pnpm-lock.yaml regenerated with v11+), the Dockerfile pin must be bumped to match at the same time.
