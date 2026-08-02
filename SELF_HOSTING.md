# Self-Hosting Guide

Run your own instance of the ISC2 CPE Tracker on any server with Docker installed. Caddy handles HTTPS automatically — no certificate management required.

> **Pre-built image available.**  
> A ready-to-run Docker image is published to GitHub Container Registry on every release:
> ```
> ghcr.io/gsantella/cpe-submitter:latest
> ```
> No Git, Node, pnpm, or build toolchain required — just Docker.

## Prerequisites

- A server with Docker and Docker Compose installed ([docs.docker.com](https://docs.docker.com/get-docker/))
- A domain name pointing at your server's public IP address (A record)
- Ports 80 and 443 open in your firewall

## Setup (4 steps)

### 1. Download the two config files

You do not need to clone the full repository. Download only the two files Docker Compose needs:

```bash
curl -O https://raw.githubusercontent.com/gsantella/cpe-submitter/main/docker-compose.yml
curl -O https://raw.githubusercontent.com/gsantella/cpe-submitter/main/Caddyfile
```

### 2. Create your `.env` file

Create a `.env` file in the same directory with these two required values:

```env
DOMAIN=cpe.yourchapter.org          # your real domain
SESSION_SECRET=<output of: openssl rand -hex 32>
```

Generate a secure `SESSION_SECRET` with:

```bash
openssl rand -hex 32
```

### 3. Point your DNS

Add an **A record** for your domain pointing to your server's public IP address. Caddy will automatically obtain a Let's Encrypt TLS certificate once DNS propagates (usually within a few minutes).

### 4. Start the stack

```bash
docker compose up -d
```

Docker will pull the pre-built image from GHCR automatically — no build step needed.

That's it. Visit `https://your-domain.com` — you'll land on the app over HTTPS.

On first visit, go to **Chapter → Sign-In Protection** to set up a username and password.

---

## Data persistence

The SQLite database is stored in a Docker named volume (`db_data`). It survives container restarts, image rebuilds, and `docker compose down`. Your data is only lost if you explicitly run `docker volume rm`.

To back up the database:

```bash
docker run --rm \
  -v cpe-submitter_db_data:/data \
  -v $(pwd):/backup \
  node:20-slim \
  cp /data/cpe-tracker.db /backup/cpe-tracker-backup.db
```

---

## Updating

Pull the latest pre-built image and restart:

```bash
docker compose pull
docker compose up -d
```

The database volume is untouched during updates.

### Developers building from source

If you are running a local build (with `build: .` in docker-compose.yml instead of `image:`):

```bash
git pull
docker compose build
docker compose up -d
```

---

## Configuration reference

| Variable | Required | Description |
|---|---|---|
| `DOMAIN` | ✅ | Public domain name (e.g. `cpe.yourchapter.org`) |
| `SESSION_SECRET` | ✅ | Long random string for signing cookies — generate with `openssl rand -hex 32` |
| `AUTH_USERNAME` | Optional | Pre-configure the sign-in username via env var (cannot be changed from the UI if set) |
| `AUTH_PASSWORD` | Optional | Pre-configure the sign-in password via env var |

---

## Troubleshooting

**Certificate not issued** — Check that your domain's A record resolves to the correct IP (`dig +short your-domain.com`) and that ports 80/443 are open. Caddy logs: `docker compose logs caddy`.

**App not starting** — Check `docker compose logs app`. The most common cause is a missing `SESSION_SECRET`.

**Database errors** — The `/data` volume must be writable. Confirm with `docker compose exec app ls -la /data`.
