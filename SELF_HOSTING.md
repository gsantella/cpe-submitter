# Self-Hosting Guide

Run your own instance of the ISC2 CPE Tracker on any server with Docker installed.

> **Pre-built image available.**  
> A ready-to-run Docker image is published to GitHub Container Registry on every release:
> ```
> ghcr.io/gsantella/cpe-submitter:latest
> ```
> No Git, Node, pnpm, or build toolchain required — just Docker.

---

## Which setup is right for you?

### Option A — Public server with HTTPS *(recommended for shared chapter use)*

Run the app on a VPS or cloud VM at a real domain name. Caddy automatically provisions a Let's Encrypt TLS certificate. Everyone on the chapter can reach it from any browser.

**Requirements:**
- A Linux server with a public IP address (VPS, DigitalOcean Droplet, EC2 instance, etc.)
- A domain name with an A record pointing at that IP
- Ports 80 and 443 open in the firewall

→ Follow the [Public server setup](#public-server-setup) instructions below.

---

### Option B — Local / Docker Desktop *(laptop, home network, internal LAN)*

Run the app on your own machine without a public domain. Caddy is not used — the app runs on `http://localhost:3000` over plain HTTP.

> **Why not HTTPS locally?** Caddy's automatic HTTPS works by asking Let's Encrypt to verify that you own the domain. Let's Encrypt does this by making an HTTP request to your server on port 80. If your machine is behind NAT (a home router, Docker Desktop, a corporate network), that request can never reach you — certificate issuance fails. For local use, plain HTTP on localhost is fine and simpler.

**Requirements:**
- Docker Desktop (Mac, Windows, or Linux)
- Nothing else — no domain, no open ports, no firewall changes

→ Follow the [Local setup](#local-setup) instructions below.

---

## Public server setup

### 1. Download the config files

You do not need to clone the full repository. Download only the files Docker Compose needs:

```bash
curl -O https://raw.githubusercontent.com/gsantella/cpe-submitter/main/docker-compose.yml
curl -O https://raw.githubusercontent.com/gsantella/cpe-submitter/main/Caddyfile
```

### 2. Create your `.env` file

```bash
# Download the template
curl -O https://raw.githubusercontent.com/gsantella/cpe-submitter/main/.env.example
cp .env.example .env
```

Open `.env` and fill in the two required values:

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

Docker pulls the pre-built image from GHCR automatically — no build step needed.

Visit `https://your-domain.com`. On first visit, go to **Chapter → Sign-In Protection** to set a username and password.

---

## Local setup

### 1. Download the local config files

```bash
curl -O https://raw.githubusercontent.com/gsantella/cpe-submitter/main/docker-compose.yml
curl -O https://raw.githubusercontent.com/gsantella/cpe-submitter/main/docker-compose.local.yml
```

### 2. Create your `.env` file

```bash
curl -O https://raw.githubusercontent.com/gsantella/cpe-submitter/main/.env.example
cp .env.example .env
```

Open `.env` and set only `SESSION_SECRET` (leave `DOMAIN` blank or set it to anything — it is not used in local mode):

```env
SESSION_SECRET=<output of: openssl rand -hex 32>
```

### 3. Start the stack

```bash
docker compose -f docker-compose.yml -f docker-compose.local.yml up -d
```

Open `http://localhost:3000`. On first visit, go to **Chapter → Sign-In Protection** to set a username and password.

> **Local mode uses HTTP.** Session cookies are marked `secure: false` automatically so they work over plain HTTP. Do not expose this setup to the internet — use Option A instead.

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

**Public server (pull pre-built image):**

```bash
docker compose pull
docker compose up -d
```

**Local setup:**

```bash
docker compose -f docker-compose.yml -f docker-compose.local.yml pull
docker compose -f docker-compose.yml -f docker-compose.local.yml up -d
```

The database volume is untouched during updates.

---

## Configuration reference

| Variable | Required | Description |
|---|---|---|
| `DOMAIN` | Public only | Public domain name (e.g. `cpe.yourchapter.org`) |
| `SESSION_SECRET` | ✅ Always | Long random string for signing cookies — generate with `openssl rand -hex 32` |
| `AUTH_USERNAME` | Optional | Pre-configure the sign-in username via env var (cannot be changed from the UI if set) |
| `AUTH_PASSWORD` | Optional | Pre-configure the sign-in password via env var |

---

## Troubleshooting

**Certificate not issued (public server)** — Check that your domain's A record resolves to the correct IP (`dig +short your-domain.com`) and that ports 80 and 443 are open in your firewall. View Caddy's logs with `docker compose logs caddy`. If you're on a private network or behind NAT, HTTPS cannot work — use the local setup instead.

**App not starting** — Check `docker compose logs app`. The most common cause is a missing `SESSION_SECRET`.

**Database errors** — The `/data` volume must be writable. Confirm with `docker compose exec app ls -la /data`.

**Cookies not working locally** — Make sure you used the local compose override (`-f docker-compose.local.yml`). Without it, cookies are marked `secure: true` and browsers will reject them over plain HTTP.
