# ISC2 CPE Tracker

A web app for ISC2 chapter officers to track member attendance at events and export ISC2-format CPE submission spreadsheets.

Built for the Penn Highlands Chapter.

---

## Self-hosting

The easiest way to run your own instance is with Docker — no Node.js, pnpm, or build toolchain required.

```bash
# Download the two config files
curl -O https://raw.githubusercontent.com/gsantella/cpe-submitter/main/docker-compose.yml
curl -O https://raw.githubusercontent.com/gsantella/cpe-submitter/main/Caddyfile

# Create your .env (fill in DOMAIN and SESSION_SECRET)
curl -O https://raw.githubusercontent.com/gsantella/cpe-submitter/main/.env.example
cp .env.example .env

# Start
docker compose up -d
```

A pre-built image is published automatically to GitHub Container Registry on every push to `main`:

```
ghcr.io/gsantella/cpe-submitter:latest
```

**→ See [SELF_HOSTING.md](SELF_HOSTING.md) for full instructions**, including the local/Docker Desktop setup (no public domain required).

---

## Features

- **Member directory** — add, search, and remove chapter members
- **Event management** — create events, check members in, track CPE credits
- **Excel export** — generates a pre-filled ISC2 CPE submission spreadsheet per event
- **Chapter settings** — stores the official chapter name written into every export

---

## Local development

### Prerequisites

| Requirement | Version | Notes |
|---|---|---|
| Node.js | 22 or later | [nodejs.org](https://nodejs.org) |
| pnpm | 10 | `npm install -g pnpm@10` |
| C++ build tools | — | Required by `better-sqlite3` (see below) |

#### C++ build tools (for `better-sqlite3`)

`better-sqlite3` compiles a native SQLite binding during `pnpm install`.

- **macOS** — `xcode-select --install`
- **Linux** — `sudo apt install build-essential python3`
- **Windows** — install Visual Studio Build Tools or run `npm install -g windows-build-tools` in an admin PowerShell

### Getting started

```bash
# 1. Clone the repo
git clone https://github.com/gsantella/cpe-submitter.git
cd cpe-submitter

# 2. Install dependencies (compiles better-sqlite3 — takes ~1–2 min on first run)
pnpm install

# 3. Create the SQLite database and apply the schema
pnpm --filter @workspace/db run push

# 4. Start both services
pnpm dev
```

The app will be available at **http://localhost:5173**.

### Running services individually

```bash
# Terminal 1 — API server (http://localhost:3001)
pnpm --filter @workspace/api-server run dev

# Terminal 2 — Frontend (http://localhost:5173)
pnpm --filter @workspace/cpe-tracker run dev
```

---

## Environment variables

| Variable | Default | Description |
|---|---|---|
| `PORT` | `3001` | Port the API server listens on |
| `API_URL` | `http://localhost:3001` | API server URL (used by the Vite dev proxy) |
| `BASE_PATH` | `/` | Frontend base path (set automatically on Replit) |
| `DATABASE_PATH` | `data/cpe-tracker.db` | Path to the SQLite database file |
| `SESSION_SECRET` | *(dev only)* | Required in production — sign session cookies |

---

## Project structure

```
├── artifacts/
│   ├── api-server/        Express API server
│   └── cpe-tracker/       React + Vite frontend
├── lib/
│   ├── db/                Drizzle ORM schema + SQLite config
│   ├── api-spec/          OpenAPI spec + Orval codegen config
│   ├── api-client-react/  Generated React Query hooks
│   └── api-zod/           Generated Zod validators
├── data/
│   └── cpe-tracker.db     SQLite database (auto-created on first run)
├── Dockerfile             Multi-stage Docker build
├── docker-compose.yml     Production stack (app + Caddy HTTPS)
├── docker-compose.local.yml  Local/Docker Desktop override (no domain needed)
└── SELF_HOSTING.md        Full self-hosting guide
```

---

## Database

The SQLite database is created automatically at `data/cpe-tracker.db` on first run. No database server required.

To reset: delete `data/cpe-tracker.db` and run `pnpm --filter @workspace/db run push` again.

---

## Regenerating the API client

If you change `lib/api-spec/openapi.yaml`, regenerate the client and validators:

```bash
cd lib/api-spec
pnpm exec orval
```
