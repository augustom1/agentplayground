# VPS Master Stack — Deployment Guide

One command turns a fresh VPS into a full production platform:
agents, automation, AI, website hosting, and database — all containerized, all HTTPS.

---

## What you get

| URL | Service | Purpose |
|-----|---------|---------|
| `https://app.DOMAIN` | Agent Dashboard | Your main product |
| `https://n8n.DOMAIN` | n8n | Visual workflow automation |
| `https://files.DOMAIN` | FileBrowser | File management UI |
| `https://manage.DOMAIN` | Portainer | Docker management UI |
| `https://DOMAIN` | Nginx | Your company website + client sites |

**Infrastructure (internal only):**
- PostgreSQL + pgvector — shared database server, one DB per service
- Redis — cache and queues
- Traefik — reverse proxy, automatic HTTPS via Let's Encrypt
- Cron — recurring task executor for the Dashboard

---

## VPS Requirements

| Resource | Minimum | Recommended |
|----------|---------|-------------|
| RAM | 8 GB | 16 GB |
| CPU | 4 vCPU | 8 vCPU |
| Storage | 60 GB | 120 GB |
| OS | Ubuntu 22.04 | Ubuntu 22.04/24.04 |

> **Ollama note:** Without a GPU, LLMs run on CPU — usable but slow.
> `llama3.2:3b` works well on CPU. For GPU support, uncomment the `deploy:` block
> in `docker-compose.yml` and use a GPU-enabled VPS (Hetzner CCX, Lambda Labs, etc.)

---

## One-Command Setup

```bash
# 1. SSH into your VPS
ssh root@YOUR_VPS_IP

# 2. Clone your repo
git clone https://github.com/YOUR_USERNAME/YOUR_REPO.git /opt/vps
cd /opt/vps

# 3. Run setup (interactive — prompts for domain, passwords, API keys)
bash setup.sh
```

`setup.sh` will:
- Install Docker if not present
- Prompt for your domain, email, passwords
- Auto-generate all secrets (AUTH_SECRET, CRON_SECRET, N8N_ENCRYPTION_KEY, etc.)
- Create Nginx configs and placeholder pages
- Start the full stack
- Offer to pull an Ollama LLM model

---

## DNS Setup (do this before or during setup)

At your domain registrar, create two A records:

| Type | Name | Value |
|------|------|-------|
| A | `@` | `YOUR_VPS_IP` |
| A | `*` | `YOUR_VPS_IP` |

The wildcard `*` record covers all subdomains automatically (`app.`, `n8n.`, `files.`, etc.)
SSL certificates are issued automatically by Traefik via Let's Encrypt.

---

## Manual Setup (without setup.sh)

```bash
# 1. Install Docker
curl -fsSL https://get.docker.com | sh

# 2. Configure environment
cp .env.example .env.local
nano .env.local   # fill in DOMAIN, ACME_EMAIL, passwords, API keys

# 3. Start the stack
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
```

---

## Adding Client Websites

```bash
# Creates webroot/clientname/, sites/clientname.conf, reloads Nginx
./add-site.sh client.mycompany.com

# Then upload HTML/CSS/JS files to:
# webroot/client_mycompany_com/
```

For external domains (e.g. `theclientsdomain.com`), add a Traefik router label to
the `nginx` service in `docker-compose.prod.yml`:

```yaml
- traefik.http.routers.clientsite.rule=Host(`theclientsdomain.com`)
- traefik.http.routers.clientsite.entrypoints=websecure
- traefik.http.routers.clientsite.tls.certresolver=le
- traefik.http.services.clientsite.loadbalancer.server.port=80
```

Then: `docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d`

---

## Adding New Services

Every new service follows the same pattern:

**1. Add to `docker-compose.yml`:**
```yaml
myservice:
  image: someimage:latest
  container_name: vps-myservice
  restart: unless-stopped
  environment:
    - DATABASE_URL=postgresql://postgres:${POSTGRES_PASSWORD}@postgres:5432/myservice
  depends_on:
    postgres:
      condition: service_healthy
```

**2. Add its database to `scripts/init-db.sh`:**
```sql
SELECT 'CREATE DATABASE myservice'
WHERE NOT EXISTS (SELECT FROM pg_database WHERE datname = 'myservice')\gexec
```

**3. Add a subdomain in `docker-compose.prod.yml`:**
```yaml
myservice:
  ports: !reset []
  labels:
    - traefik.enable=true
    - traefik.docker.network=proxy
    - traefik.http.routers.myservice.rule=Host(`myservice.${DOMAIN}`)
    - traefik.http.routers.myservice.entrypoints=websecure
    - traefik.http.routers.myservice.tls.certresolver=le
    - traefik.http.services.myservice.loadbalancer.server.port=PORT
  networks:
    - default
    - proxy
```

**4. Restart:**
```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

---

## Shared Database

All services use one PostgreSQL server with separate databases:

```
postgres server (vps-postgres)
  ├── agent_dashboard   ← Dashboard app
  ├── n8n               ← n8n automation
  └── <your new apps>   ← add in init-db.sh
```

This means your AI agents and n8n workflows can query across all your data
using a single connection string, just switching the database name.

Connect from n8n or any service on the Docker network:
```
postgresql://postgres:PASSWORD@postgres:5432/agent_dashboard
```

---

## Updating the Stack

```bash
cd /opt/vps
git pull
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
```

Database migrations run automatically on dashboard restart — no manual step needed.

---

## Database Backups

```bash
# Manual backup of all databases
./backup-db.sh

# Schedule daily at 3am
(crontab -l 2>/dev/null; echo "0 3 * * * /opt/vps/backup-db.sh >> /var/log/vps-backup.log 2>&1") | crontab -

# Backup a specific database
./backup-db.sh agent_dashboard
```

Backups are stored as compressed `.sql.gz` files in `/opt/backups/`.
Files older than 7 days are deleted automatically.

---

## Common Commands

```bash
# View logs for a service
docker compose logs -f dashboard
docker compose logs -f n8n
docker compose logs -f ollama

# Check all container health
docker compose ps

# Restart a single service
docker compose restart dashboard

# Pull a new Ollama model
docker exec vps-ollama ollama pull llama3.1:8b

# List available Ollama models
docker exec vps-ollama ollama list

# Open a postgres shell (access all databases)
docker exec -it vps-postgres psql -U postgres

# Reload Nginx after adding a site
docker exec vps-nginx nginx -s reload
```

---

## Local Development (no HTTPS)

```bash
# Start without Traefik — ports exposed directly
docker compose up -d --build

# Access:
# Dashboard:  http://localhost:3000
# n8n:        http://localhost:5678
# FileBrowser:http://localhost:8083
# Portainer:  http://localhost:9000
```

---

## Architecture

```
Internet
  ↓ :80   → Traefik → redirect to HTTPS
  ↓ :443  → Traefik (TLS termination, Let's Encrypt certs)
              ├── app.DOMAIN    → Dashboard  :3000
              ├── n8n.DOMAIN    → n8n        :5678
              ├── files.DOMAIN  → FileBrowser:80
              ├── manage.DOMAIN → Portainer  :9000
              └── DOMAIN / www  → Nginx      :80
                                    ├── /var/www/main       (company site)
                                    └── /var/www/SITENAME   (client sites)

Internal network (not exposed to internet):
  PostgreSQL :5432  ← Dashboard, n8n, any new service
  Redis      :6379  ← available for queues/cache
  Ollama     :11434 ← Dashboard (chat + embeddings)
```

---

## Troubleshooting

| Issue | Fix |
|-------|-----|
| SSL cert not issued | Check DNS A record is set and matches `DOMAIN` in `.env.local` |
| 502 Bad Gateway | Service still starting — wait 30s, check `docker compose logs SERVICE` |
| Port 80/443 in use | Another process is running: `ss -tlnp \| grep ':80\|:443'` |
| Postgres won't start | Check `docker logs vps-postgres` — often a password/volume issue |
| n8n can't connect to DB | Confirm `n8n` database exists: `docker exec vps-postgres psql -U postgres -l` |
| Ollama model download stuck | Run manually: `docker exec vps-ollama ollama pull MODEL` |
| Nginx 404 on new site | Check `sites/SITE.conf` server_name matches hostname, reload nginx |
