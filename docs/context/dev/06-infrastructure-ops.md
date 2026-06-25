# Infrastructure & Operations

> VPS details, Docker setup, deploy protocol, SSH commands, and monitoring.
> DevOps agents and coordinator use this when executing infrastructure tasks.

---

## VPS

| Property | Value |
|---|---|
| Provider | Hetzner |
| IP | 95.217.163.247 |
| OS | Ubuntu (Docker host) |
| App path | `/root/opt/vps/` |
| RAM | 16GB |
| SSH key | `~/.ssh/id_ed25519` |
| SSH user | `root` |

---

## Containers

| Container | Image | Role | Internal Port |
|---|---|---|---|
| `dashboard` | Next.js (built locally) | Main app | 3000 |
| `postgres` | pgvector/pgvector:pg16 | Database | 5432 |
| `redis` | redis:7-alpine | Session + SSE | 6379 |
| `ollama` | ollama/ollama | Local LLM server | 11434 |
| `traefik` | traefik:v3 | Reverse proxy + TLS | 80/443 |

Traefik handles all HTTPS — never expose 3000 or 11434 directly.

---

## Ollama Models on VPS

| Model | Size | Used For |
|---|---|---|
| `qwen2.5:3b` | ~2GB | Fast tasks, chatbots (GuardTech demo) |
| `qwen2.5:7b` | ~5GB | Overnight docs, protocol writing, local routing |
| `nomic-embed-text` | ~270MB | Brain embeddings (1536-dim vectors) |

RAM constraint: 16GB total. Ollama + Postgres + Next.js + Redis use ~8–10GB. Don't add models larger than 7B.

---

## Deploy Protocol

**Never `git pull` on VPS. Always scp.**

### Standard Deploy

```bash
# Copy changed file(s) to VPS
scp -i ~/.ssh/id_ed25519 <local-file> root@95.217.163.247:/root/opt/vps/<path>

# Rebuild + restart dashboard container
ssh -i ~/.ssh/id_ed25519 root@95.217.163.247 \
  "cd /root/opt/vps && docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build dashboard"
```

### Force No-Cache (After Deleting Directories)

```bash
ssh -i ~/.ssh/id_ed25519 root@95.217.163.247 \
  "cd /root/opt/vps && docker compose -f docker-compose.yml -f docker-compose.prod.yml build --no-cache dashboard && docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d dashboard"
```

### Schema Push (After Prisma Changes)

```bash
ssh -i ~/.ssh/id_ed25519 root@95.217.163.247 \
  "cd /root/opt/vps && docker compose exec dashboard npx prisma db push"
```

### Check Logs

```bash
ssh -i ~/.ssh/id_ed25519 root@95.217.163.247 \
  "docker logs dashboard --tail 100"
```

---

## Key Paths on VPS

```
/root/opt/vps/
├── docker-compose.yml          # Base compose
├── docker-compose.prod.yml     # Prod labels (Traefik)
├── .env.local                  # All secrets — never in repo
├── entrypoint.sh               # Builds DATABASE_URL + starts Next.js
├── sites/                      # Static site vhost configs
│   └── guardtech.conf          # GuardTech demo (remove after 2026-06-19)
└── webroot/                    # Static site files
    └── guardtech/              # GuardTech demo (remove after 2026-06-19)
```

---

## Environment Variables (All in `.env.local` on VPS)

| Var | Required | Notes |
|---|---|---|
| `DATABASE_URL` | ✅ | Auto-built by entrypoint.sh from parts |
| `AUTH_SECRET` | ✅ | NextAuth JWT signing key (≥32 chars) |
| `ANTHROPIC_API_KEY` | ✅ | Claude API |
| `NEXTAUTH_URL` | ✅ | `https://app.agentplayground.net` |
| `CRON_SECRET` | ✅ | Bearer token for cron endpoints |
| `VAULT_CONTEXT_ENABLED` | ⚠️ | `true` → Brain context injected into coordinator |
| `OLLAMA_BASE_URL` | ⚠️ | Default: `http://ollama:11434` |
| `TELEGRAM_BOT_TOKEN` | ⚠️ | Telegram integration |
| `TELEGRAM_GROUP_CHAT_ID` | ❌ Missing | Not set yet — Telegram group notifications broken |
| `TELEGRAM_OWNER_CHAT_ID` | ❌ Missing | Not set yet — Telegram DM to owner broken |
| `BRAVE_SEARCH_API_KEY` | ⚠️ | Web search; DuckDuckGo fallback if unset |
| `VPS_SSH_KEY` | ⚠️ | SSH key content for `vps_exec` tool |

---

## Monitoring Checklist (Weekly)

Run these checks weekly or when something seems off:

```bash
# Container status
docker compose -f docker-compose.yml -f docker-compose.prod.yml ps

# Resource usage
docker stats --no-stream

# Disk usage
docker system df
df -h

# Dashboard logs (look for unhandledRejection — means app is broken even if container shows Up)
docker logs dashboard --tail 200 | grep -i error

# Postgres size
docker compose exec postgres psql -U postgres -c "SELECT pg_size_pretty(pg_database_size('agentdb'));"

# Ollama loaded models
curl http://localhost:11434/api/tags
```

**Critical warning:** An `unhandledRejection` in `docker logs` means the app is in a broken state even if the container shows `Up`. Always check logs, not just container status.

---

## Subdomains & Routing

| Subdomain | Routes To | Notes |
|---|---|---|
| `app.agentplayground.net` | `dashboard:3000` | Main app |
| `guardtech.agentplayground.net` | Static files via nginx sidecar | Temp demo — remove 2026-06-19 |
| `mcp.agentplayground.net` | `dashboard:3000/api/mcp` | MCP endpoint for Claude Desktop |

All routing via Traefik labels in `docker-compose.prod.yml`.

---

## VPS Exec Tool

The `vps_exec` coordinator tool runs SSH commands on the VPS. Coordinator can use it for:
- Checking logs
- Running `prisma db push` after schema changes
- Pulling new Ollama models
- Checking disk space

Example: "Run `docker logs dashboard --tail 50` on the VPS" → coordinator uses `vps_exec`.
