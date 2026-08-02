# ── Stage 1: Install all workspace dependencies ────────────────────────────
# node:24-slim (Debian/glibc) is required — pnpm 11 needs Node 22+, and the
# pnpm workspace excludes musl platform variants so Alpine cannot be used.
FROM node:24-slim AS deps

RUN apt-get update && \
    apt-get install -y python3 make g++ && \
    rm -rf /var/lib/apt/lists/*

RUN corepack enable pnpm
WORKDIR /workspace

# Copy workspace manifests first for layer caching
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml ./
COPY lib/api-client-react/package.json lib/api-client-react/
COPY lib/api-spec/package.json           lib/api-spec/
COPY lib/api-zod/package.json            lib/api-zod/
COPY lib/db/package.json                 lib/db/
COPY artifacts/api-server/package.json   artifacts/api-server/
COPY artifacts/cpe-tracker/package.json  artifacts/cpe-tracker/
COPY artifacts/mockup-sandbox/package.json artifacts/mockup-sandbox/
COPY scripts/package.json                scripts/

RUN pnpm install --frozen-lockfile


# ── Stage 2: Build the React frontend ─────────────────────────────────────
FROM deps AS frontend-build

COPY lib/ lib/
COPY artifacts/cpe-tracker/ artifacts/cpe-tracker/

# BASE_PATH=/ so the app is served at the domain root (not a sub-path)
ENV BASE_PATH=/

RUN pnpm --filter @workspace/cpe-tracker build


# ── Stage 3: Build the Express API server ─────────────────────────────────
FROM deps AS api-build

COPY lib/ lib/
COPY artifacts/api-server/ artifacts/api-server/

RUN pnpm --filter @workspace/api-server build


# ── Stage 4: Compile better-sqlite3 for production ────────────────────────
# Compiled separately so the production image needs no build tools.
FROM node:24-slim AS sqlite-build

RUN apt-get update && \
    apt-get install -y python3 make g++ && \
    rm -rf /var/lib/apt/lists/*

WORKDIR /sqlite
RUN npm install better-sqlite3@11


# ── Stage 5: Production image ──────────────────────────────────────────────
FROM node:24-slim AS production
WORKDIR /app

ENV NODE_ENV=production
ENV PORT=3000
# Override with DATABASE_PATH=/data/cpe-tracker.db (set in docker-compose.yml)
ENV DATABASE_PATH=/data/cpe-tracker.db

# API server bundle + pino worker files
COPY --from=api-build /workspace/artifacts/api-server/dist/ ./dist/

# Native SQLite module (compiled on same OS/arch as this image)
COPY --from=sqlite-build /sqlite/node_modules/ ./node_modules/

# Built React frontend (served as static files by Express)
COPY --from=frontend-build /workspace/artifacts/cpe-tracker/dist/public/ ./public/

EXPOSE 3000

# SQLite database lives here — mount a named volume to persist across restarts
VOLUME ["/data"]

CMD ["node", "--enable-source-maps", "dist/index.mjs"]
