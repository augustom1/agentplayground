# CLAUDE.md — Agent Playground (agentplayground.net)

> Read this file first. It gives you full project context.
> Update **Recent Work** after every task.
> Cross-reference `docs/MASTER-TODO.md` for the full task queue.
> Cross-reference VISION.md for product direction and paymentplan.md for billing details.

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

### Session 2026-05-14 — Brain push API, agent team config sync, connect page overhaul

**Brain push endpoint (`/api/brain/push`):**
- New Bearer-token endpoint usable by any external AI (no session required)
- `team` field routes content directly to `Teams/<slug>/` folder
- GET returns OpenAPI schema — paste URL into ChatGPT Custom GPT Actions to connect
- Added to middleware public routes (no session wall)
- End-to-end tested: `Teams/marketing/config.json` written ✓

**Agent team ↔ Brain two-way sync:**
- `saveTeamConfig(teamId)` in `lib/brain/index.ts` — writes `Teams/<slug>/config.json` (full export JSON + `teamId` field)
- `syncTeamFromConfig(config)` — reads config.json, wipes+recreates agents/skills/CLI functions in DB
- Auto-triggered from: `toolCreateTeam`, `toolCreateAgent`, `toolAddSkill`, `toolAddCliFunction` (chat-tools.ts)
- Also triggered from: `POST /api/teams` (UI creation), `PATCH /api/teams/[id]` (UI edit)
- `POST /api/brain/note` auto-syncs when saved path matches `Teams/*/config.json`
- Knowledge tab shows **LIVE CONFIG** badge + **"Save & Sync"** button for config.json files
- Backfilled config.json for existing teams (tech-ops-core, research-team)

**Connect page completely rebuilt:**
- Workflow diagram: External AI → Brain Push → Agent Teams
- Provider tabs: Claude Mobile, Claude Desktop, ChatGPT Custom GPT, Direct API, Cursor, n8n
- Copy-paste system prompt templates for each provider (teaches Claude/ChatGPT when and how to push)
- Brain Push endpoint reference with 3 example payloads (inbox, team-routed, research)

**Key file moves:**
- `app/(app)/brain/page.tsx` → now redirects to `/files` (brain UI merged into Knowledge/Files page)
- `app/(app)/files/page.tsx` — is now the unified Knowledge + Files page

**Claude Mobile MCP:** Works today via Settings → Integrations → Custom → `https://app.agentplayground.net/api/mcp`

**Config.json format (agent team in vault):**
```json
{ "teamId": "...", "name": "...", "agents": [...], "skills": [...], "cliFunctions": [...] }
```
Edit in Knowledge tab → Save & Sync → live in platform instantly. `teamId` must stay.

### Session 2026-05-09 — Payments → crypto, Brain redesign, business vault seed

**Payment infrastructure removed:**
- Deleted: Stripe, BitPay, MercadoPago API routes and webhooks
- Billing page rewritten: USDT/USDC crypto-only with wallet address display, network selector, copy button
- **ACTION REQUIRED:** Update wallet addresses in `app/(app)/billing/page.tsx` (WALLETS constant at top)
- Also update `CONTACT_INFO.telegram` in the same file

**Brain page redesigned (3-pane layout):**
- New layout: Left (notes sidebar with folder tree) · Center (note viewer) · Right (Knowledge Graph widget — always visible)
- Graph removed from tabs — now a persistent panel on the right side
- Search bar inline in header (no separate tab)
- Capture as a button that replaces the center pane
- Folder tree with expand/collapse, active note highlighting

**KnowledgeGraph redesigned (Obsidian style):**
- Square nodes with rounded corners (replaces circles)
- Minimal dark background (#0c0c0f) — no stars, no radial glow
- Thin edges (0.6px normal, 1px hover), square glow on hover
- Dot grid background (very subtle)
- Pan with drag, zoom with scroll wheel
- Labels shown on hover + always for hub nodes (degree ≥ 3)

**Brain vault seeded with business context:**
- `Business/Overview.md` — What AgentPlayground is and how it works
- `Business/Services-Pricing.md` — All service tiers and pricing
- `Business/Customers-ICP.md` — Target customer profiles
- `Business/Vision-Direction.md` — Strategic direction and roadmap
- `Agents/Keeper-Briefing.md` — Instructions for the Keeper coordinator
- `Agents/Agent-Ground-Rules.md` — Rules and context for all agent teams
- All 6 files indexed with embeddings and searchable via vault_search

**VPS cleanup (same session):**
- Docker build cache pruned: 112GB → 36GB disk usage
- node_modules removed from /root/opt/vps/ (1.2GB — not needed in Docker)

### Session 2026-05-06 — Autonomous machine: Brain sync + Task Executor + Connect page

**Architecture: Brain is now the connective tissue for all platform components**

**New files:**
- `lib/executor.ts` — Task Executor: generateTaskPlan() (Claude Haiku) + getExecutorQueue()
- `app/api/executor/plan/route.ts` — POST {taskId} → generate plan, save to Brain at plans/<id>.md
- `app/api/executor/queue/route.ts` — GET pending tasks with plan status
- `app/(app)/executor/page.tsx` — Executor UI: queue, plan viewer, auto-plan all
- `app/(app)/connect/page.tsx` — MCP connect guide: Claude Desktop/Mobile, ChatGPT, DeepSeek, Cursor, n8n

**Modified:**
- `lib/brain/index.ts` — Added: initProjectBrain(), initTeamBrain(), extractDate(), isScheduledNote(), slugify()
- `app/api/projects/route.ts` — Project create → auto Brain folder at Projects/<name>/README.md
- `app/api/teams/route.ts` — Team create → auto Brain folder at Teams/<name>/README.md
- `app/api/brain/ingest/route.ts` — Notes with date + schedule tags (#meeting, #event, #task) → auto ScheduledJob
- `app/api/chat/route.ts` — Coordinator prompt updated with Brain integration, plan-before-delegate, team brain folders in context
- `lib/chat-tools.ts` — Added plan_task tool (generates plan via Claude Haiku, saves to Brain)
- `components/Sidebar.tsx` — Added Executor (/executor) and Connect (/connect) nav links

**How the autonomous loop works:**
1. User/agent creates task → Coordinator calls plan_task → plan saved to Brain (plans/<id>.md)
2. Executor UI shows queue → agents can read plans and execute steps
3. Teams write results back to Teams/<name>/ in Brain
4. Coordinator reads results and closes the loop

**Brain sync rules:**
- Project created → Brain folder `Projects/<slug>/README.md`
- Team created → Brain folder `Teams/<slug>/README.md`
- Brain note with #task/#meeting/#event + date → auto ScheduledJob created
- Task plan → Brain at `plans/<taskId>.md`

**Sidebar links added:** /brain, /executor, /connect

### Session 2026-05-05 — Brain page full UI + deploy + MCP live

**All deployed to VPS and verified end-to-end:**
- Brain page (`/brain`) fully built: Notes list (click to read/edit), Graph (canvas physics sim), Capture (title+content+tags+folder+file upload), Search (semantic, debounced)
- `components/KnowledgeGraph.tsx` — canvas-based force graph, no D3 dep
- All brain API routes deployed: notes, note, ingest, search, tree, folder, graph, index, daily
- MCP endpoint (`/api/mcp`) live at `https://app.agentplayground.net/api/mcp`
- Vault write permissions fixed: `chmod 777 /var/lib/docker/volumes/vps_vaultdata/_data`
- API key pre-generated for admin: `agp_2cdb0e4ded24ddd5ae214ab08f9dff7ec40bb04ef1cdd2c57cde38a5d227c26d`
- End-to-end verified: vault_write → embed (768 dims) → vault_search ✅
- Fixed JSX bug in `files/page.tsx`: missing `}` closing `{mode !== "graph" && <div>`

**To connect Claude mobile / ChatGPT / DeepSeek:**
- MCP endpoint: `https://app.agentplayground.net/api/mcp`
- Auth: `Authorization: Bearer agp_2cdb0e4ded24ddd5ae214ab08f9dff7ec40bb04ef1cdd2c57cde38a5d227c26d`
- To regenerate key: Settings → MCP API Key → Regenerate (or use /api/settings/api-key POST)

**Next:**
- Block G: Landing page Brain section + pricing
- Stripe keys → billing → credit gate
- Admin monitoring panel

### Session 2026-05-04 — Brain page + vault tools + VPS brain activation

**VPS state after this session:**
- `vps-syncthing` container started ✅
- `nomic-embed-text` model pulled ✅
- `VAULT_CONTEXT_ENABLED=true` set in VPS `.env.local` ✅
- `obsidian-mcp` image not available on Docker Hub (skip for now)

**New files:**
- `app/(app)/brain/page.tsx` — Brain vault browser: Notes list (click to view/edit) · Capture (text + tags + file upload) · Search (semantic)
- `app/api/brain/notes/route.ts` — GET all vault notes from DB, paginated, sorted by updatedAt

**Modified:**
- `lib/chat-tools.ts` — added `vault_search`, `vault_read`, `vault_write` tools + handler functions at end of file
- `components/Sidebar.tsx` — added Brain nav link + Brain icon import

**How to feed the vault:**
1. `/brain` → Capture tab → write text + title + tags → Save to Brain
2. Upload .md/.txt/.json files via Capture tab → auto-ingested
3. Telegram bot: any message → auto-saved to vault
4. POST `/api/brain/ingest` with `{title, text, tags}` (session auth)

**Agents accessing vault:**
- In chat, agents can call `vault_search`, `vault_read`, `vault_write`
- Keeper automatically reads vault context before each response (VAULT_CONTEXT_ENABLED=true)

**Next (Block D3 + Block F):**
- D3.js knowledge graph in Brain page (graph tab)
- Stripe keys → activate billing → credit gate in chat route
- Admin monitoring panel

### Session 2026-05-03 — Auto-seed, self-registration, env template

Auto-seed on first install via `/api/admin/seed`. Self-registration with optional invite code. `.env.template` ships with repo.

### Sessions 2026-05-02 (a–d) — 2nd Brain Blocks A–C

**Block A:** VaultNote model, `/api/brain/*` routes, vault context injection, session write-back.
**Block B:** MCP endpoint (`/api/mcp`), API key management in Settings.
**Block C:** Telegram → vault pipeline (all messages auto-ingested). Quick capture page at `/brain/capture`.

### Sessions 2026-04-07 to 2026-04-17 — Core platform stabilization

Docker health check fix, billing schema, Stripe/BitPay checkout written, Telegram bot, self-optimization system (protocol writer + classifier + weekly scanner), VPS deployment, AR sales site, MercadoPago integration, token counter, file/audio in chat, tool installer via SSH, email/WhatsApp channel stubs.
