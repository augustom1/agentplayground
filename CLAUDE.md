# CLAUDE.md — Agent Playground (agentplayground.net)

> Read this file first. It gives you full project context so you don't need to explore every file.
> Update the **Recent Work** section after completing each task.
> Cross-reference `docs/MASTER-TODO.md` for the full task queue — start there before writing any code.
> Cross-reference VISION.md for product direction and paymentplan.md for billing details.

---

## Project at a Glance

**What it is:** A self-hosted AI operations platform ("Agent Playground"). Users talk to the **Playground Keeper** (Claude in coordinator mode) and it manages agent teams, creates projects, schedules work, and routes tasks. The platform becomes whatever the user needs through conversation.

**Current reality:** Chat + agent team management fully works. The Keeper is prototype-level (coordinator mode in chat). Billing is schema-complete but unwired. The next major feature is the **2nd Brain** — Obsidian vault as persistent memory for all agents, accessible from any LLM via MCP and from any channel (Telegram, email, WhatsApp). See `docs/MASTER-TODO.md` for the full task queue.

**Domain:** `agentplayground.net`
**Stack:** Next.js 15 · React 19 · TypeScript · Prisma 7 · PostgreSQL + pgvector · NextAuth v5 · Tailwind v4 · Docker · Anthropic Claude SDK

---

## Implementation Status (honest current state)

| Feature | Schema | API | UI | Active |
|---|---|---|---|---|
| Teams & Agents | ✅ | ✅ | ✅ | ✅ |
| Skills & CLI Functions | ✅ | ✅ | ✅ | ✅ |
| Chat with Claude (streaming, tools) | ✅ | ✅ | ✅ | ✅ |
| Coordinator/Keeper mode | — | ✅ partial | ✅ partial | ✅ partial |
| Dashboard widgets | ✅ | ✅ | ✅ | ✅ |
| File management + embeddings | ✅ | ✅ | ✅ | ✅ |
| Schedule / recurring tasks | ✅ | ✅ | ✅ | ✅ |
| Billing / credits schema | ✅ | ✅ | ✅ | ✅ tracking |
| Stripe checkout + webhook | ✅ | ✅ written | ✅ written | ❌ needs keys |
| BitPay checkout + webhook | ✅ | ✅ written | ✅ written | ❌ needs key |
| Plan enforcement (credit gate) | — | ❌ | — | ❌ no gate |
| Admin monitoring panel | — | ❌ | ❌ | ❌ |
| Self-registration | — | ❌ | ❌ | ❌ |
| Projects (Keeper organizes work) | ✅ | ✅ basic | ✅ basic | ✅ partial |
| Multi-channel routing (Telegram etc) | ✅ | ❌ | ❌ | ❌ |
| Agent Memory | ✅ | ❌ | ❌ | ❌ |
| Playground Keeper (full vision) | — | ❌ | ❌ | ❌ |
| **Planned — see docs/features/**  | | | | |
| Token counter in chat | — | ✅ | ✅ | ✅ |
| File/image/audio in chat | — | ✅ | ✅ | ✅ needs OPENAI_API_KEY |
| Telegram voice + media | ✅ | ✅ | — | ✅ needs OPENAI_API_KEY |
| Auto-install tools (npm/pip/mcp) | — | ✅ | ✅ | ✅ needs VPS_SSH_KEY |
| Email channel | ✅ | ✅ | ❌ | ❌ needs IMAP creds |
| WhatsApp channel | ✅ | ✅ | ❌ | ❌ needs Twilio keys |
| **2nd Brain — see docs/MASTER-TODO.md** | | | | |
| Vault Docker (Syncthing + obsidian-mcp) | — | ✅ | — | ✅ Block A1 done |
| VaultNote DB model + pgvector index | ✅ | ✅ | — | ✅ Block A3 done |
| Brain API routes (/api/brain/*) | — | ✅ | ❌ | ✅ Block A4 done |
| Keeper vault context injection | — | ✅ | — | ✅ Block A5 done |
| Session write-back to vault | — | ✅ | — | ✅ Block A6 done |
| MCP endpoint (/api/mcp) | — | ❌ | ❌ | ❌ Block B1 |
| API key management | ❌ | ❌ | ❌ | ❌ Block B2 |
| Telegram → vault pipeline | — | ❌ | — | ❌ Block C1 |
| Files tab: Brain/Graph/Search tabs | — | — | ❌ | ❌ Block D |
| D3.js knowledge graph | — | ❌ | ❌ | ❌ Block D3 |
| vault_search/write tools in chat | — | ❌ | — | ❌ Block E1 |
| Research team vault-first | — | ❌ | — | ❌ Block E2 |
| Stripe payments wired | ✅ | ✅ written | ✅ written | ❌ needs keys Block F1 |
| Credit gate in chat route | — | ❌ | — | ❌ Block F2 |
| Self-registration | — | ❌ | ❌ | ❌ Block F3 |
| Landing page: Brain section + pricing | — | — | ❌ | ❌ Block G |
| Client onboarding script | — | — | ❌ | ❌ Block H1 |

---

## Directory Map

```
/
├── app/
│   ├── (app)/                  # Authenticated app shell
│   │   ├── chat/               # PRIMARY — Chat with Keeper/Claude (streaming, tools)
│   │   ├── dashboard/          # Drag-drop widgets, metrics, team overview
│   │   ├── agent-lab/          # Merged: playground + team/agent/skill management
│   │   ├── billing/            # Credit balance + usage — UI complete, payments pending
│   │   ├── schedule/           # Calendar view for scheduled jobs
│   │   ├── files/              # File manager with vector embeddings
│   │   ├── tools/              # Tool/skill catalog browser
│   │   ├── users/              # User management (admin only)
│   │   └── settings/           # API keys, email config (Resend)
│   ├── (auth)/
│   │   ├── login/              # Credentials login
│   │   └── setup/              # First-run admin account creation
│   └── api/
│       ├── health/             # GET — DB liveness check (used by Docker)
│       ├── auth/[...nextauth]/ # NextAuth handler
│       ├── auth/setup/         # POST — create first admin user
│       ├── chat/               # POST — streaming Claude/OpenAI/Ollama + tool loop
│       ├── conversations/      # CRUD — chat conversation history
│       ├── conversations/[id]/ # GET/DELETE — specific conversation
│       ├── conversations/[id]/messages/ # POST — save message
│       ├── teams/              # CRUD — agent teams
│       ├── teams/[id]/         # GET/PATCH/DELETE — specific team
│       ├── agents/             # CRUD — agents within teams
│       ├── tasks/              # CRUD — one-off tasks
│       ├── recurring-tasks/    # CRUD — cron-scheduled tasks
│       ├── recurring-tasks/[id]/ # PATCH/DELETE
│       ├── schedule/           # CRUD — calendar jobs
│       ├── skills/             # CRUD — team skills
│       ├── cli-functions/      # CRUD — CLI command definitions
│       ├── improvements/       # CRUD — improvement/optimization logs
│       ├── improvements/[id]/  # GET/PATCH
│       ├── metrics/            # GET — aggregated dashboard metrics
│       ├── widgets/            # CRUD — dashboard widget configs
│       ├── widgets/[id]/       # PATCH — update position/config
│       ├── billing/            # GET — credit balance and usage history
│       ├── files/              # CRUD — file records
│       ├── files/upload/       # POST — upload file
│       ├── files/download/     # GET — download file
│       ├── files/embed/        # POST — generate pgvector embeddings via Ollama
│       ├── tools/              # GET — tool catalog aggregation
│       ├── playground-runs/    # CRUD — test run history
│       ├── import-team/        # POST — import team config JSON
│       ├── export-team/[id]/   # GET — export team config JSON
│       ├── ollama/models/      # GET — list local Ollama models
│       ├── ollama/pull/        # POST — download Ollama model
│       ├── users/              # CRUD — user management (admin)
│       ├── brain/              # 2nd Brain API (BLOCK A — build next)
│       │   ├── index/          # POST — n8n vault indexer (embed + upsert VaultNote)
│       │   ├── search/         # GET ?q= — semantic search across vault
│       │   ├── note/           # GET/POST — read/write single vault note
│       │   ├── daily/          # GET/POST — daily notes read + session write-back
│       │   ├── ingest/         # POST — quick capture (any text → vault inbox)
│       │   └── graph/          # GET — D3.js graph data (nodes + edges)
│       ├── mcp/                # POST — MCP protocol endpoint for external LLMs (BLOCK B)
│       ├── settings/
│       │   └── api-key/        # POST — generate API key for MCP access (BLOCK B2)
│       ├── auth/
│       │   └── register/       # POST — self-registration (BLOCK F3)
│       └── cron/               # POST — trigger recurring jobs (CRON_SECRET)
│
├── lib/
│   ├── brain/
│   │   └── index.ts            # Vault helpers: searchVault, readVaultNote, writeVaultNote, ingestToVault (BLOCK A2)
│   ├── credits.ts              # Credit helpers: getUserCredits, deductCredits, resetMonthlyCredits (BLOCK F5)
├── lib/
│   ├── prisma.ts               # Singleton Prisma client (adapter-pg, pool max 5)
│   ├── chat-tools.ts           # 20 Claude tool definitions (teams, tasks, files, web, etc.)
│   ├── db-agent.ts             # Permission-gated DB access layer (used by chat tools)
│   ├── agent-permissions.ts    # Permission scopes: admin/builder/standard/readonly
│   ├── pricing.ts              # Credit system config — INACTIVE (schema-ready)
│   ├── ai-providers.ts         # Anthropic + OpenAI + Ollama provider configs
│   ├── usage-tracker.ts        # Fire-and-forget usage logging — PARTIALLY ACTIVE
│   ├── rate-limit.ts           # In-memory per-user rate limiting
│   ├── default-skills.ts       # Built-in skills seeded on first run
│   ├── seed-defaults.ts        # First-startup DB seeding logic
│   ├── api-error.ts            # Typed API error helper
│   ├── widgets.ts              # Widget type definitions
│   ├── utils.ts                # cn() and misc utilities
│   ├── mock-data.ts            # Fallback mock data (not primary path)
│   └── config/
│       └── mode.ts             # PLAYGROUND_MODE detection + feature flags
│
├── components/
│   ├── Sidebar.tsx             # App navigation sidebar
│   ├── AuthProvider.tsx        # SessionProvider wrapper
│   ├── ToastProvider.tsx       # Toast notification context
│   ├── UserMenu.tsx            # Top-right user dropdown
│   ├── StatusBadge.tsx         # Agent/task status pill
│   ├── TeamWidget.tsx          # Dashboard team card widget
│   └── RefreshButton.tsx       # Data refresh trigger
│
├── prisma/
│   └── schema.prisma           # 22 models — see full list below
│
├── scripts/
│   ├── seed-teams.ts           # Seeds 5 default agent teams with agents/skills
│   └── init-db.sh              # Creates n8n DB on first Postgres start
│
├── test/                       # Vitest tests (20 passing)
│
├── auth.ts                     # NextAuth v5 config
├── middleware.ts               # Route protection + role gate
├── next.config.ts              # output: standalone, ignores TS/ESLint errors in build
├── prisma.config.ts
├── vitest.config.ts
│
├── docker-compose.yml          # Full VPS stack
├── docker-compose.prod.yml     # Traefik HTTPS overlay
├── Dockerfile                  # Multi-stage build → standalone
├── entrypoint.sh               # prisma db push → node server.js
└── setup.sh                    # One-command VPS bootstrap
```

---

## Database Schema (prisma/schema.prisma) — 22 Models

### Active Models (wired to API/UI)

| Model | Table | Key fields |
|---|---|---|
| User | users | id, email, passwordHash, role, plan, active |
| AgentTeam | agent_teams | id, name, status, permissions[], isSystemTeam |
| Agent | agents | id, teamId, model, systemPrompt, temperature, maxTokens |
| Task | tasks | id, teamId, status, priority, result |
| RecurringTask | recurring_tasks | id, teamId, cron, timezone, enabled |
| ScheduledJob | scheduled_jobs | id, teamId, scheduledFor, recurring |
| Skill | skills | id, teamId, category, instructions |
| CliFunction | cli_functions | id, teamId, command, dangerous |
| Improvement | improvements | id, category, impact, applied |
| Widget | widgets | id, type, position, config |
| ActivityLog | activity_logs | id, teamId, action, type |
| ChatConversation | chat_conversations | id, title |
| ChatMessage | chat_messages | id, conversationId, role, content |
| PlaygroundRun | playground_runs | id, target, prompt, result |
| AgentTeamConfig | agent_team_configs | id, configJson |
| FileRecord | file_records | id, path, size, mimeType, embedded |
| FileEmbedding | file_embeddings | id, filePath, chunkIndex, content, vector(768) |
| Embedding | embeddings | id, vector(1536), sourceType, sourceId |

### Billing Models (schema + UI done, payment processor NOT wired)

| Model | Table | Status |
|---|---|---|
| UserCredits | user_credits | Schema ✅, trackUsage() partially wired ⚠️ |
| ApiUsage | api_usage | Schema ✅, written on Claude calls ✅ |
| Invoice | invoices | Schema ✅, never generated ❌ |
| InvoiceLineItem | invoice_line_items | Schema ✅, never generated ❌ |

### 2nd Brain Models (to be added — Block A3)

| Model | Table | Key fields |
|---|---|---|
| VaultNote | vault_notes | id, path (unique), title, content, tags[], frontmatter Json?, embedding vector(768)?, updatedAt |

Also add to User model: `apiKey String? @unique` (Block B2)

### Vision Phase Models (schema only — no API/UI yet)

| Model | Table | Phase | Purpose |
|---|---|---|---|
| Project | projects | 1 | Organizes agent work around a goal |
| ProjectTeam | project_teams | 1 | Team ↔ project assignments |
| ProjectOutput | project_outputs | 1 | Reports/content produced by agents |
| Channel | channels | 2 | Telegram/Discord/Email/Webhook configs |
| ChannelMessage | channel_messages | 2 | Messages flowing in/out |
| RoutingRule | routing_rules | 2 | Pattern → team/project routing |
| AgentMemory | agent_memories | 4 | Persistent agent knowledge |
| Integration | integrations | 2 | Connector registry |

---

## The Chat System (Most Important)

`app/api/chat/route.ts` is the core of the platform. It streams Claude/OpenAI/Ollama with a tool-calling loop (up to 10 iterations).

### Providers

| Provider | When | Tool-calling |
|---|---|---|
| Anthropic | `provider === "anthropic"` | ✅ Yes |
| OpenAI | `provider === "openai"` | ✅ Yes (function-calling) |
| Ollama | `provider === "ollama"` | ❌ No |

### System Prompt Modes

- **BASE_SYSTEM** — Used for all chats. Positions Claude as AgentPlayground orchestrator. Describes the flywheel: Problem → Manual → Agent → Tool → Optimization.
- **COORDINATOR_INTRO** — Added when `teamId === "coordinator"`. Routes tasks, delegates to teams via `delegate_to_team` tool. This is the current Keeper prototype.
- **TEAM_CONTEXT** — Added when a specific teamId is set. Loads that team's agents, skills, and CLI functions.

### Available Tools (lib/chat-tools.ts) — 20 tools

Team/agent management: `create_team`, `create_agent`, `update_team`, `update_agent`, `list_team_details`
Skills: `add_skill`, `add_cli_function`, `list_available_skills`, `generate_tool`, `log_improvement`
Tasks: `schedule_task`, `delegate_to_team`
Data: `query_data` (teams, agents, tasks, skills, scheduled_jobs, activity_logs, improvements)
Web: `web_search`, `web_browse`
Files: `list_files`, `read_file`, `write_file`, `delete_file`, `search_files`
Chat: `create_chatbot`

---

## Billing System (paymentplan.md spec)

**Architecture:** Internal credit economy. 1 credit = $0.001. Users buy credits via Stripe or BitPay (10% bonus for crypto).

### lib/pricing.ts — DEFINED, NOT ACTIVE

```
Claude Sonnet:   3 input + 15 output credits per 1k tokens
Claude Haiku:    0.25 input + 1.25 output credits per 1k tokens
Web search:      10 credits/call
Web browse:      5 credits/call
Ollama:          0 credits (local, free)
```

Credit packages: Starter 2K($2), Basic 5.5K($5), Standard 12K($10), Growth 35K($25), Scale 100K($60), Pro 300K($150)

Plans: Free (500 credits/mo, Ollama only), Pro (1K credits/mo, Claude enabled), Enterprise (5K/mo)

### What's missing to activate billing

1. Stripe SDK + webhook handler (`/api/webhooks/stripe`)
2. BitPay SDK + webhook handler (`/api/webhooks/bitpay`)
3. Checkout session creation (`/api/billing/stripe/create-checkout`, `/api/billing/bitpay/create-invoice`)
4. Credit deduction in `app/api/chat/route.ts` (after each Claude call)
5. Plan enforcement (Free users: Ollama only, no Claude without credits)
6. Monthly credit reset cron job
7. Checkout modal/page in UI

---

## Auth & Permissions

- **NextAuth v5**, JWT strategy (no DB hit per request), Credentials provider (bcrypt)
- **Session:** `id`, `role`, `plan` in JWT
- **Middleware:** All routes protected. Public: `/login`, `/setup`, `/api/auth/*`, `/api/health`, `/api/cron`
- **Role gate:** `/users` and `/api/users` → admin only
- **Agent permissions:** admin, builder, standard, readonly (scopes: db:read/write:all/own_team)

---

## Environment Variables

| Variable | Required | Where used |
|---|---|---|
| `DATABASE_URL` | ✅ | Prisma (built by entrypoint.sh in prod) |
| `AUTH_SECRET` | ✅ | NextAuth JWT signing |
| `ANTHROPIC_API_KEY` | ⚠️ | Claude API (optional — Ollama works without it) |
| `CRON_SECRET` | ✅ | `/api/cron` bearer token |
| `NEXTAUTH_URL` | ✅ prod | NextAuth redirect base |
| `DOMAIN` | ✅ prod | docker-compose.prod.yml, Traefik |
| `POSTGRES_USER/PASSWORD/DB` | ✅ | PostgreSQL container |
| `REDIS_PASSWORD` | ⚠️ | Redis (used by future BullMQ) |
| `N8N_ENCRYPTION_KEY` | ✅ | n8n service |
| `N8N_BASIC_AUTH_PASSWORD` | ✅ | n8n admin password |
| `OLLAMA_BASE_URL` | ⚠️ | Ollama local LLM (defaults to http://ollama:11434) |
| `OLLAMA_AUTO_PULL` | ⚠️ | Space-separated models to auto-pull |
| `PLAYGROUND_MODE` | ⚠️ | `vps` (default) or `laptop` |
| `STRIPE_SECRET_KEY` | ❌ future | Stripe payment processor |
| `STRIPE_WEBHOOK_SECRET` | ❌ future | Stripe webhook validation |
| `BITPAY_API_KEY` | ❌ future | BitPay crypto payments |
| `MERCADOPAGO_ACCESS_TOKEN` | ⚠️ ar site | MercadoPago Checkout Pro (ar.agentplayground.net sales) |
| `VAULT_PATH` | ⚠️ brain | Path to vault folder inside Docker (`/var/syncthing/vault`) |
| `OBSIDIAN_MCP_URL` | ⚠️ brain | Internal URL of obsidian-mcp container (`http://obsidian-mcp:3001`) |
| `BRAIN_SECRET` | ⚠️ brain | Secret header for n8n → `/api/brain/index` (prevents public access) |
| `VAULT_CONTEXT_ENABLED` | ⚠️ brain | `true` to inject vault context into Keeper (default false until vault is set up) |
| `SYNCTHING_API_KEY` | ⚠️ brain | From Syncthing web UI → Actions → API key (fill after first run) |
| `STRIPE_SECRET_KEY` | ❌ payments | Stripe live key (from dashboard.stripe.com) |
| `STRIPE_WEBHOOK_SECRET` | ❌ payments | Stripe webhook secret (from dashboard.stripe.com) |
| `REQUIRE_INVITE_CODE` | ⚠️ auth | `false` = open registration, `true` = invite code required |

---

## Commands

```bash
# Development
npm run dev          # Start dev server (port 3000)
npm run build        # Production build
npm run lint         # ESLint
npm run test         # Vitest (20 tests)

# Database
npx prisma generate          # Regenerate client after schema change
npx prisma db push           # Push schema changes (no migration history)
npx prisma studio            # GUI at localhost:5555

# Docker (dev)
docker compose up -d         # Start postgres + redis locally
docker compose logs -f app   # Follow app logs

# Docker (prod)
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build
docker compose ps
docker logs vps-dashboard
docker exec -it vps-dashboard sh    # Shell into running container

# Seed default teams (run once after first boot)
npx tsx scripts/seed-teams.ts
```

---

## Production Stack (agentplayground.net)

| URL | Service |
|---|---|
| `https://app.agentplayground.net` | Agent Dashboard (this app) |
| `https://n8n.agentplayground.net` | n8n automation |
| `https://files.agentplayground.net` | FileBrowser |
| `https://manage.agentplayground.net` | Portainer |
| `https://agentplayground.net` | Static Nginx landing page |

DNS: Two A records — `@` and `*` → VPS IP.

---

## Key Patterns

- **API routes:** validate session → check role → Prisma query → return JSON. Use `lib/api-error.ts`.
- **Chat endpoint:** streams Claude. Tools defined in `lib/chat-tools.ts`, execute via `lib/db-agent.ts`.
- **First run:** `/setup` → creates admin → seeds defaults via `lib/seed-defaults.ts`.
- **Health check:** `GET /api/health` → pings DB. Used by Docker healthcheck and cron container wait.
- **Cron:** `POST /api/cron` triggered by cron container every minute, protected by `CRON_SECRET`.
- **pgvector:** `FileEmbedding` (768-dim via Ollama nomic-embed-text) and `Embedding` (1536-dim) exist but `AgentMemory` vector column must be added manually via raw SQL.
- **Mode detection:** `lib/config/mode.ts` — `PLAYGROUND_MODE=vps` (default) or `laptop`.

---

## Recent Work

### Session 2026-05-02b — Block A: 2nd Brain Core implementation

**All 7 Block A tasks completed. Build: ✓ Compiled successfully (0 errors).**

**New files created:**
- `lib/brain/index.ts` — 5 helpers: `searchVault`, `readVaultNote`, `writeVaultNote`, `getDailyNotes`, `ingestToVault`, `indexVaultNote`
- `app/api/brain/index/route.ts` — n8n indexer endpoint (POST, secret-header auth, no session required)
- `app/api/brain/search/route.ts` — semantic search (GET ?q=, session-protected)
- `app/api/brain/note/route.ts` — read/write single note (GET/POST, session-protected)
- `app/api/brain/daily/route.ts` — daily notes (GET/POST, session-protected)
- `app/api/brain/ingest/route.ts` — quick capture (POST, session-protected, indexes async)
- `docs/n8n-vault-indexer.md` — n8n workflow JSON + shell script alternative + setup steps

**Modified files:**
- `prisma/schema.prisma` — added `VaultNote` model (path unique, pgvector(768), tags[], frontmatter Json?)
- `docker-compose.yml` — added `syncthing` + `obsidian-mcp` services, `vaultdata` volume, mounted vault in dashboard
- `docker-compose.prod.yml` — added `sync.DOMAIN` Traefik router for Syncthing
- `middleware.ts` — `/api/brain/index` added to public routes (secret-header auth instead of session)
- `app/api/chat/route.ts` — A5: vault context injection before Claude calls; A6: session write-back to daily note after response
- Ran `npx prisma generate` — VaultNote model in client

**How vault context injection works:**
- Only when `VAULT_CONTEXT_ENABLED=true` and provider is Anthropic
- Runs `searchVault(lastUserMessage, 5)` + `getDailyNotes(3)` in parallel via `Promise.allSettled`
- Appends matching notes to systemPrompt under `## Relevant Vault Context` / `## Recent Daily Notes`
- Non-blocking: if vault search fails, chat continues without it

**How session write-back works:**
- After each Anthropic streaming response, fire-and-forget `writeVaultNote('daily/YYYY-MM-DD.md', summary, true)`
- Summary = ISO timestamp + first 200 chars of user message + first 200 chars of assistant response + tool names used
- Silently catches errors — never blocks the response

**Architecture note:** `lib/brain/index.ts` uses direct filesystem access (Node.js `fs/promises`) for read/write/ingest operations. The `vaultdata` volume is mounted at `/var/syncthing/vault` in both the dashboard and syncthing containers. The `obsidian-mcp` service is scaffolded for Block B (MCP endpoint) but not yet functional — it requires Obsidian's REST API plugin or a compatible MCP server image.

**Next steps (start here next session):**
1. Run `npx prisma db push` on VPS to create `vault_notes` table
2. Deploy to VPS (sync + rebuild)
3. Start Block B: MCP endpoint (`app/api/mcp/route.ts`) + API key management

### Session 2026-05-02 — 2nd Brain planning + full task queue

**No code written — architecture and product planning session.**

**What was decided:**
- The 2nd Brain is the next major feature and main selling point
- The vault is a **passive dump** — any AI, any channel, any person writes to it
- Agent teams **read vault context** before every task — zero cold starts, no repeated context
- The platform exposes a **MCP endpoint** so ChatGPT, Claude Desktop, Cursor can write/read the vault natively
- Telegram (already working) extended so any message → vault note (covers non-technical users)
- Files tab gets 3 new panels: Brain (vault browser + quick capture), Graph (D3.js knowledge graph), Search (semantic)
- Business model: $299/$499/$799 one-time install tiers + $79-299/month managed hosting + agent team add-ons

**Documents created:**
- `docs/MASTER-TODO.md` — full task queue, 8 blocks (A-H), every task has exact files to touch. START HERE.
- `docs/BRAIN-INTEGRATION-PLAN.md` — full technical + business spec
- `OBSIDIAN-BRAIN-INTEGRATION.md` — original proposal (in repo root)

**Priority order for next sessions:**
1. **Block A** — Vault core (Docker containers, VaultNote model, /api/brain/* routes, Keeper injection, session write-back)
2. **Block B** — MCP endpoint + API key management
3. **Block C** — Telegram → vault pipeline (extend existing bot)
4. **Block D** — Files tab redesign (Brain/Graph/Search tabs, D3.js graph)
5. **Block E** — Agent teams vault-aware (vault tools in chat-tools.ts, Research + Financial team prompts)
6. **Block F** — Payments (Stripe keys, credit gate, self-registration)
7. **Block G** — Landing page (Brain section, pricing update)
8. **Block H** — Client delivery standardization (onboarding script, .env.template)

**The demo that sells it (real estate example):**
1. User sends Telegram voice: "Thinking about real estate in BA, budget $120k"
2. → Transcribed + saved to vault automatically
3. Days later, user asks Keeper: "Analyze real estate for me"
4. → Keeper reads vault (knows the budget, city, preferences)
5. → Dispatches Research team + Financial team simultaneously
6. → Report written back to vault, shown in chat
7. User: "Send summary to my Telegram" → done

### Session 2026-04-17 — Audit + Security fixes on all new features

**All 7 features from docs/IMPLEMENTATION_PLAN.md were already implemented (previous session). This session audited and fixed issues.**

**Fixes applied:**
- `app/api/mercadopago/webhook/route.ts` — fixed bad `import prisma from` → `import { prisma } from` (was causing build warning)
- `app/api/server/stats/route.ts` — added regex validation for Ollama model name before shell interpolation (shell injection fix)
- `lib/tool-installer/installer.ts` — added `assertSafeName()` with strict regex for npm/pip/MCP package names before SSH exec (shell injection fix)

**Verified working:**
- Build: `✓ Compiled successfully` (clean, no errors, no warnings)
- Tests: 180 tests pass
- All 7 new features confirmed present: token counter, file/image/audio in chat, Telegram voice+photo, tool installer via SSH, email channel, WhatsApp channel
- New pages: `/server` (Docker + Ollama monitor, admin only), `/websites` (uptime checker)
- New providers: `LanguageProvider` + `ThemeProvider` in root layout, i18n keys for all new UI strings

**New pages added (previous session, confirmed this session):**
- `/server` — admin Docker container monitor + Ollama model manager (`app/(app)/server/page.tsx`)
- `/websites` — uptime/latency monitor for all subdomains (`app/(app)/websites/page.tsx`)

**New API routes confirmed:**
- `GET /api/server/stats` — Docker ps + free/df (admin only)
- `POST /api/server/stats` — restart container / pull Ollama model (admin only, validated)
- `GET /api/websites/check?url=` — HEAD ping with latency
- `POST /api/transcribe` — Whisper transcription (uses OPENAI_API_KEY)
- `POST /api/files/extract` — PDF/doc text extraction
- `POST /api/tools/install` — SSH-based npm/pip/MCP installer
- `POST /api/channels/whatsapp/webhook` — Twilio WhatsApp handler

**VPS deployed this session:**
- Synced all local changes to VPS via tar + scp
- Rebuilt and restarted `vps-dashboard` container — `✓ healthy`
- **IMPORTANT lesson:** rsync/tar overwrites VPS `.env` with local dev defaults. After every deploy, run `cp .env.local .env` on the VPS before restarting. This is now documented in `docs/IMPLEMENTATION_PLAN.md` deploy steps.

**Monetization readiness (honest assessment):**
- AR managed-service model: ~80% ready. Add `MERCADOPAGO_ACCESS_TOKEN` → payments work. Create user accounts manually.
- Self-serve SaaS: ~30% ready. Missing: self-registration, active payment keys, credit enforcement gate.
- **Fastest path to revenue:** find one client, demo the platform, charge setup fee, create their account via `/users`. No extra code needed.

### Session 2026-04-16 — Feature Planning: Token Counter, File Sharing, Tool Installer, Messaging Channels

**No code written — planning + documentation session.**

Created `docs/` folder with full implementation specs for the next 4 feature groups:

| Doc | Feature | Status |
|---|---|---|
| `docs/features/01-token-counter.md` | Live token + cost counter in chat UI | ⬜ Ready to build |
| `docs/features/02-file-media-chat.md` | File/image/audio/PDF attachments in chat | ⬜ Ready to build |
| `docs/features/03-telegram-full.md` | Telegram voice notes, photos, conversation memory | 🟡 Telegram text works; add voice/media |
| `docs/features/04-auto-tool-installer.md` | Auto-install npm/pip/MCP via SSH with safety checker | ⬜ Ready to build |
| `docs/features/05-messaging-channels.md` | Email (Gmail polling) + WhatsApp (Twilio) channels | ⬜ Ready to build |

**Master plan:** `docs/IMPLEMENTATION_PLAN.md` — priority order, all new files to create, new env vars, npm packages needed.

**Priority order to implement:**
1. Token counter (2-3 hrs, quick win)
2. File/audio in chat (1-2 days, unlocks voice note flow everywhere)
3. Telegram voice notes (1.5 days, needs #2 done first)
4. Auto-tool installer via SSH (2-3 days)
5. Email + WhatsApp (1-2 days each)

**New env vars that will be needed (add to VPS .env.local as features are built):**
```
OPENAI_API_KEY=          # Whisper audio transcription ($0.006/min)
TELEGRAM_BOT_TOKEN=      # From @BotFather
TELEGRAM_WEBHOOK_SECRET= # openssl rand -hex 20
VPS_SSH_HOST=95.217.163.247
VPS_SSH_USER=root
VPS_SSH_KEY=             # base64 < ~/.ssh/id_rsa
TWILIO_ACCOUNT_SID=      # WhatsApp (later)
TWILIO_AUTH_TOKEN=       # WhatsApp (later)
GMAIL_USER=              # Email polling (later)
GMAIL_APP_PASSWORD=      # Email polling (later)
```

**Key existing files relevant to these features:**
- `lib/integrations/telegram/bot.ts` — Telegram text bot (already works, needs voice/media added)
- `app/api/telegram/webhook/route.ts` — webhook handler (exists, works)
- `app/api/chat/route.ts` — needs: usage sentinel for token counter + attachment handling
- `app/(app)/chat/page.tsx` — needs: token counter UI + attachment input UI
- `lib/chat-tools.ts` — needs: `search_tools` + `install_tool` added

---

### Session 2026-04-14 — ar.agentplayground.net + private network + landing page

**Landing page (agentplayground.net) — open source framing:**
- Removed all self-signup CTAs ("Start Free", "Launch the Platform", "Get Started" → /setup)
- Footer now has: GitHub, Issues, MIT License, Servicio AR, Contacto
- Nav CTA changed from "Open App" to "Fork →" (GitHub)
- Pricing CTAs now point to GitHub (self-host) and ar.agentplayground.net (managed service)

**New subdomain: ar.agentplayground.net**
- `webroot/ar/index.html` — full Spanish sales page, dark theme, MercadoPago branding
- Sells 3 service tiers: Básico ($49), Stack Completo ($149), Premium + Soporte ($299)
- Payment flow: button → POST /api/mercadopago/preference → redirect to MP Checkout Pro
- Post-payment status banner on redirect back (aprobado/rechazado/pendiente)
- `sites/ar.conf` — nginx virtual host for ar subdomain
- `docker-compose.prod.yml` — added `ar.DOMAIN` Traefik router pointing to same nginx container

**MercadoPago integration:**
- `app/api/mercadopago/preference/route.ts` — creates Checkout Pro preference, returns init_point
- `app/api/mercadopago/webhook/route.ts` — IPN handler, logs payments to activity_logs
- CORS handled: ar.agentplayground.net + OPTIONS preflight
- Both routes public in `middleware.ts` via `/api/mercadopago` prefix
- Env var: `MERCADOPAGO_ACCESS_TOKEN` (get from mercadopago.com.ar/developers)

**Private network — already enforced:**
- Login page shows "Access is by invitation only."
- /setup auto-redirects to /login once admin exists (no second account creation via UI)
- New users only created by admin from /users panel
- No register/signup page exists

**Language toggle on agentplayground.net:**
- `🇪🇸 ES / 🇬🇧 EN` button in nav — pure JS, no extra files, saves to localStorage
- ~50 strings translated via `data-i18n` attributes + a `T = { en: {...}, es: {...} }` object at bottom of `webroot/main/index.html`

**business/ folder created** (open in separate Claude session from `/business`):
- `business/CLAUDE.md` — full business context: products, pricing rationale, target customers, sales flow, pre-launch checklist
- `business/delivery/checklist.md` — per-client delivery checklist with exact commands for all 3 plans
- `business/marketing/email-templates.md` — 6 ready Spanish email templates
- `business/marketing/strategy.md` — LinkedIn-first channel strategy, content calendar, pricing psychology

**Server deployment (VPS: 95.217.163.247):**
- Repo lives at `/root/opt/vps/` (GitHub: augustom1/agentplayground-vpsinstall)
- `git pull` doesn't work on server (needs creds) — use `scp` for code changes then rebuild
- `webroot/` and `sites/*.conf` are gitignored — always deploy via `scp` directly
- Deployed this session: all files above + rebuilt dashboard container + reloaded nginx
- All 3 sites live: agentplayground.net ✅  ar.agentplayground.net ✅  app.agentplayground.net ✅

**To activate MercadoPago:**
1. Get `MERCADOPAGO_ACCESS_TOKEN` from mercadopago.com.ar/developers → Credenciales
2. Add to `/root/opt/vps/.env.local`: `MERCADOPAGO_ACCESS_TOKEN=APP_USR-...`
3. Register webhook in MP dashboard: `https://app.agentplayground.net/api/mercadopago/webhook`
4. `cd /root/opt/vps && docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build dashboard`

### Session 2026-04-07 — Vision alignment + deployment fixes

**Phase 0 (deployment):**
- Fixed `/api/health` — was hitting dead legacy agent ports, causing Docker health check to always fail, preventing cron container from starting. Now pings DB with `SELECT 1`.
- This was the critical bug: cron container depends on `dashboard: service_healthy`. Without this fix, no recurring tasks ever ran.

**Phase 1 schema (added to prisma/schema.prisma):**
- `Project`, `ProjectTeam`, `ProjectOutput` — Keeper organizes work into projects
- `Channel`, `ChannelMessage`, `RoutingRule` — external channel routing
- `AgentMemory` — persistent agent knowledge (no vector column in schema — add manually via SQL)
- `Integration` — connector registry
- All use `tenantId @default("default")` so `prisma db push` works against existing data

**Infrastructure:**
- Created `lib/config/mode.ts` — PLAYGROUND_MODE detection + feature flags

**What was built in this session:**
- Stripe checkout API (`app/api/billing/stripe/create-checkout/route.ts`) — fully implemented
- Stripe webhook (`app/api/webhooks/stripe/route.ts`) — validates + credits user on payment
- BitPay invoice + webhook — same pattern
- Billing UI (`app/(app)/billing/page.tsx`) — complete with usage history, credit packages, Stripe + BitPay toggle
- Projects UI (`app/(app)/projects/page.tsx`) — list + create projects
- Projects API (`app/api/projects/route.ts`, `app/api/projects/[id]/route.ts`)
- Telegram webhook stub (`app/api/telegram/webhook/route.ts`)
- Agent memory helpers (`lib/memory/store.ts`, `lib/memory/retrieve.ts`)
- `trackUsage()` called in chat route (deducts credits, logs API usage)

**What's still needed (priority order — see ROADMAP.md):**
1. Plan enforcement gate in chat route (free users currently unlimited)
2. Stripe keys in `.env.local` + webhook registered in Stripe dashboard
3. Admin monitoring panel (`/admin`)
4. Self-registration page (`/register`)
5. Real API integrations wired into agent teams

---

### Session 2026-04-09 — Self-Optimization System

**Feature:** Platform now learns to route tasks to free local LLMs instead of paid Claude API.

**Architecture (3-layer flywheel):**

1. **Post-task evaluator** (`lib/optimizer/protocol-writer.ts`) — fires after every Claude API call (non-blocking). Uses local `qwen2.5:7b` (zero cost) to evaluate if the task pattern could be done by a mini model. If confidence ≥ 70%, writes a `TaskProtocol` to DB + `data/protocols/{id}.md`.

2. **Rules-based classifier** (`lib/optimizer/classifier.ts`) — zero-cost signal scoring. Checks existing protocols (regex match), then applies heuristics: web tools = API required; classification/extraction/formatting = local capable. Returns model recommendation (`qwen2.5:0.5b/1.5b/7b` or `claude-sonnet-4-6`).

3. **Weekly scanner** (`lib/optimizer/scanner.ts`) — runs every Sunday at midnight UTC via cron. Aggregates 7 days of `ApiUsage`, completed tasks, and protocol performance. Uses Claude Haiku (cheapest model) for intelligent analysis + recommendations. Falls back to a static markdown report if no API key.

**New DB models:** `TaskProtocol` (learned protocols), `OptimizationScan` (weekly scan results)

**New files:**
- `lib/optimizer/classifier.ts` — fast, zero-cost task classifier
- `lib/optimizer/protocol-writer.ts` — Ollama-powered post-task evaluator
- `lib/optimizer/scanner.ts` — weekly usage scanner
- `app/api/optimize/scan/route.ts` — POST (admin or cron) to trigger scan
- `app/api/optimize/evaluate/route.ts` — POST to evaluate a single task
- `app/api/optimize/protocols/route.ts` — GET/PATCH/DELETE protocols
- `app/(app)/optimize/page.tsx` — Optimization dashboard UI

**Modified:**
- `app/api/chat/route.ts` — accumulates response text + tool list, fires evaluator after each Anthropic call
- `app/api/cron/route.ts` — triggers weekly scan every Sunday midnight UTC
- `components/Sidebar.tsx` — added "Optimize" nav item (Sparkles icon)
- `prisma/schema.prisma` — added `TaskProtocol` + `OptimizationScan` models

**How protocols work:**
- Stored as DB records + markdown files at `data/protocols/{id}.md`
- Registered in `file_records` so Files UI shows them
- Classifier checks protocol patterns (regex) first before heuristics
- Protocols have `active` toggle, `successCount`, `failureCount`, `confidence`, `estimatedSaving`

---

### Task 5 — Billing foundation + Landing page (2026-03-25)
- Billing schema (ApiUsage, UserCredits, Invoice, InvoiceLineItem) + `lib/pricing.ts` (complete credit config, inactive)
- `webroot/main/index.html` — marketing landing page

### Task 4 — AgentPlayground vision alignment (2026-03-25)
- Tools Catalog page (`/tools`), `log_improvement` + `generate_tool` chat tools
- Updated BASE_SYSTEM prompt, Optimization dashboard widget

### Task 3 — Agent teams + Ollama (2026-03-22)
- `scripts/seed-teams.ts` — 5 teams (Dev Core, DevOps, Product, Business, Command Center)
- `Dockerfile.ollama` + `ollama-entrypoint.sh` — auto-pulls qwen2.5 models

### Task 2 — VPS deployment prep (2026-03-22)
- `setup.sh`, `add-site.sh`, `backup-db.sh`, `scripts/init-db.sh`
- `docker-compose.prod.yml` with Traefik HTTPS

### Task 1 — Production readiness
- NextAuth v5, Anthropic API, PostgreSQL/Prisma, Docker, 20 Vitest tests
