# AgentPlayground

> Self-hosted AI operations platform. Build and manage agent teams through conversation.
> Deploy on your own VPS in one command.

---

## What it is

AgentPlayground is a Next.js app that runs on your VPS and lets you:
- Chat with Claude (or local Ollama models) as an AI coordinator
- Create and manage teams of AI agents
- Schedule and automate tasks
- Manage files with vector search
- Monitor usage and billing

The core idea: **Problem → Agent System → Reusable Tool → Local Optimization**. Every repeated workflow becomes a permanent skill.

---

## Quick Deploy (VPS)

```bash
# 1. Clone the repo
git clone https://github.com/augustom1/agentplayground-vpsinstall /opt/vps
cd /opt/vps

# 2. Create your env file
cp .env.example .env.local
nano .env.local   # fill in passwords, API keys

# 3. Generate required secrets
openssl rand -hex 32   # use for AUTH_SECRET, CRON_SECRET, N8N_ENCRYPTION_KEY

# 4. Deploy
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
```

See [DEPLOYMENT.md](./DEPLOYMENT.md) for the full guide including domain setup and SSL.

---

## Stack

| Layer | Technology |
|-------|-----------|
| Framework | Next.js 15 (App Router) |
| Database | PostgreSQL 16 + pgvector |
| ORM | Prisma 7 |
| AI | Anthropic Claude + Ollama (local) |
| Auth | NextAuth v5 |
| Styling | Tailwind CSS v4 |
| Deployment | Docker Compose + Traefik |

---

## Services (after deploy)

| URL | Service |
|-----|---------|
| `https://app.DOMAIN` | Agent Dashboard (this app) |
| `https://n8n.DOMAIN` | n8n workflow automation |
| `https://files.DOMAIN` | FileBrowser |
| `https://manage.DOMAIN` | Portainer |
| `https://DOMAIN` | Static website (Nginx) |

---

## Key docs

| File | Purpose |
|------|---------|
| [CLAUDE.md](./CLAUDE.md) | Full project context for AI sessions |
| [ROADMAP.md](./ROADMAP.md) | What to build next — phased plan |
| [DEPLOYMENT.md](./DEPLOYMENT.md) | VPS deploy guide |
| [CLOUDFLARE_SETUP.md](./CLOUDFLARE_SETUP.md) | DNS and SSL setup |
| [VPS_SERVER.md](./VPS_SERVER.md) | Server specs and access |
| [BUSINESS-ROADMAP.md](./BUSINESS-ROADMAP.md) | Go-to-market strategy |
| [VISION.md](./VISION.md) | Product vision and Claude Code rules |

---

## Development

```bash
npm install
npm run dev        # dev server at localhost:3000
npm run test       # Vitest (20 tests)
npx prisma studio  # DB browser at localhost:5555
```

Requires a running PostgreSQL instance. Use `docker compose -f docker-compose.dev.yml up -d` for a local DB only.
