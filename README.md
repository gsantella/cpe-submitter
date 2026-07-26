# ISC2 CPE Tracker

A web app for ISC2 chapter officers to track member attendance at events and export ISC2-format CPE submission spreadsheets.

Built for the Penn Highlands Chapter.

---

## Features

- **Member directory** — add, search, and remove chapter members
- **Event management** — create events, check members in, track CPE credits
- **Excel export** — generates a pre-filled ISC2 CPE submission spreadsheet per event
- **Chapter settings** — stores the official chapter name written into every export

---

## Prerequisites

| Requirement | Version | Notes |
|---|---|---|
| Node.js | 18 or later | [nodejs.org](https://nodejs.org) |
| pnpm | 9 or later | `npm install -g pnpm` |
| C++ build tools | — | Required by `better-sqlite3` (see below) |

### C++ build tools (for `better-sqlite3`)

`better-sqlite3` compiles a native SQLite binding from C++ during `pnpm install`.

- **macOS** — install Xcode Command Line Tools: `xcode-select --install`
- **Linux** — install `build-essential` and `python3`: `sudo apt install build-essential python3`
- **Windows** — run `npm install -g windows-build-tools` in an admin PowerShell, or install Visual Studio Build Tools manually

---

## Getting started

```bash
# 1. Clone the repo
git clone https://github.com/gsantella/cpe-submitter.git
cd cpe-submitter

# 2. Install dependencies (this compiles better-sqlite3 — takes ~1–2 min on first run)
pnpm install

# 3. Create the SQLite database and apply the schema
pnpm --filter @workspace/db run push

# 4. Start both services
pnpm dev
```

The app will be available at **http://localhost:5173**.

---

## Running services individually

Open two terminals:

```bash
# Terminal 1 — API server (http://localhost:3001)
pnpm --filter @workspace/api-server run dev

# Terminal 2 — Frontend (http://localhost:5173)
pnpm --filter @workspace/cpe-tracker run dev
```

---

## Environment variables

Copy `.env.example` to `.env` and adjust if needed. Defaults work out of the box for local development.

| Variable | Default | Description |
|---|---|---|
| `PORT` | `3001` | Port the API server listens on |
| `API_URL` | `http://localhost:3001` | API server URL (used by the Vite dev proxy) |
| `BASE_PATH` | `/` | Frontend base path (set automatically on Replit) |

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
└── data/
    └── cpe-tracker.db     SQLite database (auto-created on first run)
```

---

## Database

The SQLite database is created automatically at `data/cpe-tracker.db` on first run. No database server required.

To reset the database: delete `data/cpe-tracker.db` and run `pnpm --filter @workspace/db run push` again.

---

## Regenerating the API client

If you change `lib/api-spec/openapi.yaml`, regenerate the client and validators:

```bash
cd lib/api-spec
pnpm exec orval
```
