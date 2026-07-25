# ISC2 CPE Tracker

A self-hosted app for tracking member CPE credits and event attendance. Runs entirely locally with no external database required.

## Prerequisites

- Node.js 20+
- [pnpm](https://pnpm.io/installation) (`npm install -g pnpm`)

## Getting started

### 1. Install dependencies

```bash
pnpm install
```

### 2. Create the database

This creates (or updates) `data/cpe-tracker.db` with the required tables:

```bash
pnpm --filter @workspace/db run push
```

### 3. Start the app

```bash
pnpm dev
```

This starts both the API server and the frontend. Open [http://localhost:5173](http://localhost:5173) in your browser (or whichever port is shown in the terminal).

## Project structure

```
artifacts/
  api-server/   Express API (members, events, check-in, export)
  cpe-tracker/  React frontend
lib/
  db/           Drizzle ORM schema + SQLite connection
data/
  cpe-tracker.db  SQLite database file (auto-created on first run)
```

## Database location

The database file is stored at `data/cpe-tracker.db` relative to the project root and is created automatically when you run `pnpm --filter @workspace/db run push`.
