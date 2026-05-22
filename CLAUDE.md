# CLAUDE.md — Agent Playground (agentplayground.net)

> **Start here:** Read `HANDOFF.md` first (current session state + billing plan), then this file.
> Update `HANDOFF.md` after every session. Full session history → `docs/SESSION-HISTORY.md`.
> Cross-reference `docs/MASTER-TODO.md` for the full task queue.

---

## Project at a Glance

**What it is:** A self-hosted AI operations platform. Users talk to the **Playground Keeper** (Claude in coordinator mode) and it manages agent teams, creates projects, schedules work, and routes tasks.

**Domain:** `agentplayground.net`
**Stack:** Next.js 15 · React 19 · TypeScript · Prisma 7 · PostgreSQL + pgvector · NextAuth v5 · Tailwind v4 · Docker · Anthropic Claude SDK

---

## Implementation Status

| Feature | Status |
|---|---|
| Teams & Agents, Skills, Chat (streaming, tools) | ✅ Active |
| Dashboard widgets, File management + embeddings | ✅ Active |
| Schedule / recurring tasks | ✅ Active |
| Billing schema + UI | ✅ Crypto-only (USDT/USDC) — update wallet addresses in billing/page.tsx |
| Stripe / BitPay / MercadoPago | ❌ Removed — crypto only |
| Plan enforcement (credit gate) | ❌ not built |
| Self-registration | ✅ Active (`REQUIRE_INVITE_CODE`) |
| Token counter, file/image/audio in chat | ✅ Active |
| Telegram voice + media | ✅ needs `OPENAI_API_KEY` |
| Auto-install tools via SSH | ✅ needs `VPS_SSH_KEY` |
| Email / WhatsApp channels | ✅ written — ❌ needs creds |
| **2nd Brain (Vault)** | |
| Vault Docker (Syncthing) | ✅ Running on VPS |
| VaultNote DB model + pgvector | ✅ Done |
| Brain API routes (`/api/brain/*`) | ✅ Done |
| Brain page (`/brain`) | ✅ Done (Notes / Capture / Search) |
| Vault tools in chat (`vault_search/read/write`) | ✅ Done |
| Telegram → vault pipeline | ✅ Done |
| MCP endpoint (`/api/mcp`) | ✅ Written — needs API key |
| Keeper vault context injection | ✅ Done (`VAULT_CONTEXT_ENABLED=true`) |
| D3.js knowledge graph | ✅ Done (canvas, physics sim, no D3 dep) |
| **Payments** | |
| Stripe wired | ❌ needs keys |
| Credit gate in chat | ❌ not built |
| **Other** | |
| Landing page Brain section + pricing | ❌ Block G |
| Admin monitoring panel | ❌ not built |
| **Agent Teams** | |
| Workspace tabs (category grouping) | ✅ Built — needs db push + deploy |

---

## Directory Map (key paths)

```
app/
  (app)/
    chat/          # PRIMARY — streaming chat with tool loop
    dashboard/     # Drag-drop widgets
    agent-lab/     # Team / agent / skill management
    brain/         # 2nd Brain vault browser (Notes/Capture/Search)
    billing/       # Credits UI (payments not wired)
    files/         # File manager + vector embeddings
    schedule/      # Calendar
    tools/         # Tool catalog
    settings/      # API keys, MCP key
  api/
    chat/          # POST — streaming Claude + tool loop
    brain/
      notes/       # GET — list vault notes from DB
      search/      # GET ?q= — semantic search
      note/        # GET/POST — read/write single note
      daily/       # GET/POST — daily notes
      ingest/      # POST — quick capture → vault
      index/       # POST — n8n indexer (secret-header auth)
    mcp/           # POST — MCP JSON-RPC (external LLMs)
    settings/api-key/  # API key management
    auth/register/ # Self-registration

lib/
  brain/index.ts   # searchVault, readVaultNote, writeVaultNote, ingestToVault, indexVaultNote
  chat-tools.ts    # 23 tool definitions + executeTool() — vault_search/read/write added
  prisma.ts        # Singleton Prisma client

components/
  Sidebar.tsx      # Nav — includes /brain link
```

---

## Database Schema (key models)

| Model | Table | Notes |
|---|---|---|
| User | users | id, email, role, plan, apiKey (SHA-256 for MCP) |
| AgentTeam | agent_teams | teams with agents, skills, CLI functions |
| VaultNote | vault_notes | path (unique), title, content, tags[], embedding vector(768) |
| FileEmbedding | file_embeddings | vector(768) via nomic-embed-text |
| UserCredits | user_credits | schema done, payments not wired |
| ApiUsage | api_usage | written on Claude calls |

---

## The Chat System

`app/api/chat/route.ts` — streams Claude/OpenAI/Ollama with tool loop (up to 10 iterations).

**Providers:** Anthropic (tool-calling ✅), OpenAI (function-calling ✅), Ollama (no tools).

**System prompt modes:** BASE_SYSTEM (all chats) · COORDINATOR_INTRO (teamId=coordinator) · TEAM_CONTEXT (specific team)

**Tools (23 total):** Teams/agents, skills, tasks, web search/browse, files, vault_search/read/write, project management, memory, tool installer.

**Vault context injection:** When `VAULT_CONTEXT_ENABLED=true`, searches vault + daily notes before each Anthropic call and appends as context.

---

## Billing

1 credit = $0.001. Sonnet: 3 input + 15 output per 1k tokens. Haiku: 0.25 + 1.25. Ollama: free.

To activate: add Stripe keys → register webhook → uncomment credit gate in `app/api/chat/route.ts`.

---

## Auth & Permissions

NextAuth v5, JWT, bcrypt. Roles: admin/user. Agent permission scopes: admin/builder/standard/readonly.
Public routes: `/login`, `/setup`, `/register`, `/api/auth/*`, `/api/health`, `/api/cron`, `/api/brain/index`, `/api/mcp`.

---

## Environment Variables

| Variable | Required | Notes |
|---|---|---|
| `DATABASE_URL` | ✅ | Built by entrypoint.sh |
| `AUTH_SECRET` | ✅ | NextAuth JWT |
| `ANTHROPIC_API_KEY` | ⚠️ | Claude API |
| `CRON_SECRET` | ✅ | Cron + seed bearer token |
| `NEXTAUTH_URL` | ✅ prod | |
| `DOMAIN` | ✅ prod | Traefik |
| `POSTGRES_USER/PASSWORD/DB` | ✅ | |
| `OLLAMA_BASE_URL` | ⚠️ | default: http://ollama:11434 |
| `OLLAMA_AUTO_PULL` | ⚠️ | space-separated models |
| `VAULT_PATH` | ⚠️ brain | `/var/syncthing/vault` |
| `VAULT_CONTEXT_ENABLED` | ⚠️ brain | `true` on VPS |
| `BRAIN_SECRET` | ⚠️ brain | n8n → /api/brain/index auth |
| `STRIPE_SECRET_KEY` | ❌ payments | |
| `STRIPE_WEBHOOK_SECRET` | ❌ payments | |
| `MERCADOPAGO_ACCESS_TOKEN` | ⚠️ ar site | |
| `REQUIRE_INVITE_CODE` | ⚠️ auth | `false` = open registration |
| `OPENAI_API_KEY` | ⚠️ | Whisper transcription |
| `VPS_SSH_KEY` | ⚠️ | Tool installer via SSH |

---

## Commands

```bash
npm run dev          # Dev server (port 3000)
npm run build        # Production build
npm run test         # Vitest

npx prisma generate  # Regenerate client
npx prisma db push   # Push schema

# Docker prod
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
docker logs vps-dashboard

# Deploy (git pull broken on server — use scp)
scp -i ~/.ssh/id_ed25519 <file> root@95.217.163.247:/root/opt/vps/<path>
ssh -i ~/.ssh/id_ed25519 root@95.217.163.247 \
  "cd /root/opt/vps && docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build dashboard"
```

---

## Production Stack

| URL | Service |
|---|---|
| `https://app.agentplayground.net` | Agent Dashboard |
| `https://n8n.agentplayground.net` | n8n automation |
| `https://files.agentplayground.net` | FileBrowser |
| `https://manage.agentplayground.net` | Portainer |
| `https://agentplayground.net` | Landing page |

VPS IP: 95.217.163.247 · App: `/root/opt/vps/` · Secrets: `.env.local`

---

## Key Patterns

- **API routes:** validate session → check role → Prisma query → return JSON. Use `lib/api-error.ts`.
- **Tool execution:** `CHAT_TOOLS` array defines schemas, `executeTool()` in `lib/chat-tools.ts` dispatches.
- **Vault write:** `ingestToVault(text, title, tags)` writes file + calls `indexVaultNote()` async.
- **Deploy:** scp files → restart dashboard container. Never `git pull` on server.

---

## Recent Work

> Session notes moved to `HANDOFF.md` (current) and `docs/SESSION-HISTORY.md` (archive).
> **Read `HANDOFF.md` first** — it has what was done, what's next, and the billing plan.

### Last session summary — 2026-05-22 (Session 16 hotfix)
- Fixed slug conflict: `[teamId]` → `[id]` in widget-data API route; no-cache Docker rebuild
- Added `docs/DEPLOY-PROTOCOL.md` — pre-deploy checklist, slug rule, no-cache trigger, rollback guide
- App healthy ✅ at app.agentplayground.net

### Action items still open
- Update wallet addresses in `app/(app)/billing/page.tsx` (WALLETS constant)
- Build LLM Provider Settings UI (next priority — see HANDOFF.md)
- Add Telegram env vars on VPS: `TELEGRAM_GROUP_CHAT_ID` + `TELEGRAM_OWNER_CHAT_ID`

**Before any deploy:** Read `docs/DEPLOY-PROTOCOL.md` — especially the slug conflict rule.
