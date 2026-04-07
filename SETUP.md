# Agent Playground — Domain Setup Guide

## Context

- **Domain**: `agentplayground.net` (purchased on GoDaddy, DNS managed there)
- **Cloudflare account**: logged in via GitHub in the browser — use browser tools to access it
- **Goal**: expose this Docker stack on the domain, laptop now, VPS later
- **Project directory**: `C:\Users\Augus\OneDrive\Escritorio\Agent Playground`

---

## The Stack (docker-compose.yml already exists)

| Service      | Internal port | Target subdomain                   |
|--------------|---------------|------------------------------------|
| dashboard    | 3000          | `agentplayground.net` + `www`      |
| n8n          | 5678          | `n8n.agentplayground.net`          |
| open-webui   | 8080          | `ai.agentplayground.net`           |
| portainer    | 9000          | `portainer.agentplayground.net`    |
| filebrowser  | 80            | `files.agentplayground.net`        |
| nginx        | 80            | `sites.agentplayground.net`        |

---

## What You Need To Do (in order)

### Step 1 — Add domain to Cloudflare
1. Open Cloudflare dashboard in the browser (already logged in via GitHub)
2. Add `agentplayground.net` as a new site → choose the **Free plan**
3. Cloudflare will scan existing GoDaddy DNS records — keep them as detected, delete the GoDaddy WebsiteBuilder A record if present
4. Cloudflare will give you **two nameserver addresses** (e.g. `xxx.ns.cloudflare.com`)

### Step 2 — Update nameservers on GoDaddy
1. Go to `https://dcc.godaddy.com/manage/agentplayground.net/dns`
2. Click **Nameservers** tab → change to **Custom nameservers**
3. Enter the two Cloudflare nameservers from Step 1
4. Save — propagation takes up to 24h but usually ~5 min

### Step 3 — Create Cloudflare Tunnel (for laptop)
1. In Cloudflare dashboard → **Zero Trust** → **Networks** → **Tunnels**
2. Create a tunnel named `agentplayground-local`
3. Choose **Docker** as the connector — Cloudflare will give you a `cloudflared` run command with a token like:
   ```
   cloudflared tunnel --no-autoupdate run --token <TOKEN>
   ```
4. Copy that `<TOKEN>` — it goes into `.env` as `CLOUDFLARE_TUNNEL_TOKEN`
5. Add these **Public Hostnames** inside the tunnel config, all pointing to the internal Traefik address `http://traefik:80`:

   | Subdomain              | Service (internal URL)         |
   |------------------------|-------------------------------|
   | `agentplayground.net`  | `http://dashboard:3000`       |
   | `www`                  | `http://dashboard:3000`       |
   | `n8n`                  | `http://n8n:5678`             |
   | `ai`                   | `http://open-webui:8080`      |
   | `portainer`            | `http://portainer:9000`       |
   | `files`                | `http://filebrowser:80`       |
   | `sites`                | `http://nginx:80`             |

   > All hostnames should use `agentplayground.net` as the domain.

### Step 4 — Create infrastructure files in the project

#### 4a. `docker-compose.prod.yml`
Production overlay that adds:
- **Traefik** container (reverse proxy, SSL via Let's Encrypt for VPS, or just routing for tunnel on laptop)
- Traefik labels on each service for subdomain routing
- Removes exposed host ports from services (Traefik handles ingress)
- Adds a shared `proxy` Docker network

#### 4b. `docker-compose.tunnel.yml`
Laptop overlay that adds:
- `cloudflared` container using `cloudflare/cloudflared:latest`
- Reads `CLOUDFLARE_TUNNEL_TOKEN` from env
- Connects to the `proxy` network so it can reach Traefik

#### 4c. `traefik/traefik.yml`
Static Traefik config:
- Docker provider (watch containers)
- Entrypoints: `web` (80) and `websecure` (443)
- HTTP → HTTPS redirect
- Let's Encrypt resolver using `ACME_EMAIL`

#### 4d. `traefik/dynamic/middlewares.yml`
- BasicAuth middleware (`auth`) for protecting portainer, filebrowser, traefik dashboard

#### 4e. `scripts/init-db.sh`
Already referenced in `docker-compose.yml` but missing. Creates:
- `agent_dashboard` database
- `n8n` database
- Enables `pgvector` extension on `agent_dashboard`

#### 4f. `.env.example`
Template with all required variables:
```
DOMAIN=agentplayground.net
ACME_EMAIL=
POSTGRES_PASSWORD=
POSTGRES_USER=postgres
POSTGRES_DB=agent_dashboard
REDIS_PASSWORD=
N8N_ENCRYPTION_KEY=
N8N_BASIC_AUTH_USER=admin
N8N_BASIC_AUTH_PASSWORD=
OPEN_WEBUI_SECRET=
CLOUDFLARE_TUNNEL_TOKEN=
TRAEFIK_BASIC_AUTH=   # htpasswd hash for dashboard/portainer/files
CRON_SECRET=
```

#### 4g. `Makefile`
Convenience commands:
```
make dev      # docker compose up (no HTTPS, local ports)
make prod     # docker compose + prod overlay (VPS)
make tunnel   # docker compose + prod + tunnel overlay (laptop)
make down
make logs
make ps
```

---

## Usage After Setup

**On laptop:**
```bash
cp .env.example .env   # fill in all values
make tunnel
```

**Migrating to VPS:**
1. `git clone` the repo on the VPS
2. Copy `.env` (or set secrets via CI/CD)
3. Point `agentplayground.net` A record to VPS IP in Cloudflare
4. Disable the tunnel in Cloudflare Zero Trust (or delete it)
5. `make prod`

---

## Tools Available to You

- **Browser tools** (`mcp__claude-in-chrome__*`) — Cloudflare and GoDaddy are accessible in the browser
- **File tools** — write all files directly to the project directory
- **Bash** — run Docker commands if needed

## Notes

- GoDaddy DNS currently has: default NS records, a WebsiteBuilder A record, `www` CNAME, `_domainconnect` CNAME, SOA, DMARC TXT
- The WebsiteBuilder A record must be removed/replaced once Cloudflare takes over
- Cloudflare Tunnel handles SSL on the laptop phase — no Let's Encrypt needed until VPS
- Traefik is still needed even on laptop as the internal router between tunnel and containers
