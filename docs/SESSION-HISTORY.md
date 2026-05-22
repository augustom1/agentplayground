# Session History

> Archived from CLAUDE.md. For current session notes, see HANDOFF.md.

---

### Session 2026-05-22 (Session 16) — Hotfix: slug conflict + deploy protocol

**Bug:** `app/api/playground/teams/[teamId]/widget-data/route.ts` introduced in Session 15 conflicted with the existing `[id]` slug at the same path level. Next.js App Router raised `You cannot use different slug names for the same dynamic path` as an unhandledRejection on every request, making the app unhealthy.

**Fix:**
- Moved route file from `app/api/playground/teams/[teamId]/widget-data/` → `app/api/playground/teams/[id]/widget-data/`
- Updated internal param destructure: `{ teamId }` → `{ id: teamId }`
- Removed the bad `[teamId]` directory from both VPS and local
- Docker no-cache rebuild required (regular `--build` used cached `COPY . .` layer)

**Deploy protocol added** — `docs/DEPLOY-PROTOCOL.md` documents the pre-deploy checklist, slug conflict rule, and no-cache rebuild trigger to prevent this class of error recurring.

**Deploy:** Hotfix committed + pushed, no-cache rebuild on VPS, container healthy ✅

---

### Session 2026-05-22 (Session 15) — Project Status Dashboard, Telegram Bidirectional, Live Widget Data

**P5 — Project Status Dashboard**
- `/projects` page expanded: clicking a project card now fetches `/api/projects/[id]/status` and renders per-team workstream panels — task counts (running/completed/pending/failed), recent task list with status dots, and project output log
- `get_project_status(projectId)` tool added to `lib/chat-tools.ts` (now 29 tools total) — coordinator can call this to get full workstream summary for any project in one call
- `GET /api/projects/[id]/status` new API route — returns workstreams array (team name, status, task counts, recent tasks) + outputs array
- `PROJECT_UPDATE` event type added to `lib/notify/sse.ts` PlanEvent interface — emitted when coordinator calls `get_project_status`

**P6 — Telegram Integration (bidirectional)**
- `lib/integrations/telegram/bot.ts` changed: non-command DMs now route to `getKeeperResponse()` (coordinator chat) instead of vault. `/note`, `/brain`, `/daily` still route to vault commands
- `sendGroupNotification(text)` function added — fires on task completion when `TELEGRAM_GROUP_CHAT_ID` env var is set (group chat gets notified when delegated tasks complete)
- `sendOwnerAlert(text)` function added — fires on human checkpoint (NEEDS_HUMAN_INPUT) when `TELEGRAM_OWNER_CHAT_ID` env var is set (owner DM gets pinged when agent needs input)
- Both notifications wired in `toolDelegateToTeam()` in `lib/chat-tools.ts` (fire-and-forget dynamic imports)
- `components/TelegramSettings.tsx` — new client component showing env var status, live webhook info, "Register Webhook" button, setup instructions
- `GET/POST /api/telegram/register-webhook` — GET returns current webhook info from Telegram API; POST calls `setWebhook` with the correct URL built from NEXTAUTH_URL/DOMAIN
- `/settings` Messaging Channels section replaced with TelegramSettings component + other channels (WhatsApp, Email) kept below

**P7 — Live Widget Data in Playground Dashboard**
- `GET /api/playground/teams/[teamId]/widget-data?type=task_queue|project_pipeline` — resolves AgentTeam IDs from playground members, queries live Tasks or Projects
- `task_queue`: queries Tasks where status IN [running, pending] for all AgentTeams whose agents are playground members; returns with team name
- `project_pipeline`: queries ProjectTeam for those AgentTeam IDs, fetches the linked Projects
- `WidgetCard` in `app/(app)/playground/[teamId]/page.tsx` updated: adds `liveTasks` + `liveProjects` state, useEffect fetches widget-data API for data-driven widget types on mount; renders live data (task list with status dots, project list with status badges) instead of hardcoded placeholders

**Deploy:** Committed to GitHub (4acba29), all 10 files scp'd to VPS, Docker rebuilt — container UNHEALTHY (slug conflict discovered; fixed in Session 16)

---

### Session 2026-05-22 (Session 14) — Live Agent Activity, Human Checkpoints, Playground Teams

- Live agent activity strip in coordinator chat (SSE, auto-clear)
- `request_human_input` tool for mid-task pausing with NEEDS_HUMAN_INPUT protocol
- Structured failure recovery in `delegate_to_team` (tried + recovery fields)
- Playground creation now selects whole Agent Teams (not individual agents); group auto-set to team name

---

### Session 2026-05-21 (session 9) — Brain logo, dropdown fix, mobile fixes

- **New logo:** Brain outline + 3 connected nodes (minimalist, rust `#D4715A`). Replaces asterisk/play-button. `components/Logo.tsx` rewritten, `public/icons/icon.svg` updated.
- **PWA icons:** All 4 PNG sizes regenerated via sharp from new SVG (192, 512, apple-touch, favicon-32).
- **`manifest.webmanifest` created** — was missing entirely, PWA install was broken.
- **Model dropdown rebuilt:** Centered fixed modal + dark backdrop instead of anchored popup. Context (agent) section is now collapsible with current team shown inline. Width clamped for mobile safety.
- **Mobile fixes:** Horizontal padding reduced `24px → 12px` on messages + input. Greeting font uses `clamp()`. Empty state padding adjusted for notched phones.
- Not yet deployed — scp + rebuild pending.

---

### Session 2026-05-16 — Marketing Team, Blog Team, Blog infrastructure

- Marketing Team + Blog Team added to seed-teams.ts (7 teams total)
- `/api/blog/public` route — public endpoint for published vault notes
- `/app/(app)/blog/page.tsx` — in-app blog pipeline management page
- Blog nav link added to Sidebar
- HANDOFF.md created (new session handoff system)
- CLAUDE.md trimmed, session history moved here

---

### Session 2026-05-14 — Brain push API, agent team config sync, connect page overhaul

**Brain push endpoint (`/api/brain/push`):**
- New Bearer-token endpoint usable by any external AI (no session required)
- `team` field routes content directly to `Teams/<slug>/` folder
- GET returns OpenAPI schema — paste URL into ChatGPT Custom GPT Actions to connect
- Added to middleware public routes

**Agent team ↔ Brain two-way sync:**
- `saveTeamConfig(teamId)` in `lib/brain/index.ts` — writes `Teams/<slug>/config.json`
- `syncTeamFromConfig(config)` — reads config.json, wipes+recreates agents/skills/CLI functions in DB
- Auto-triggered from: `toolCreateTeam`, `toolCreateAgent`, `toolAddSkill`, `toolAddCliFunction`
- Also from: `POST /api/teams`, `PATCH /api/teams/[id]`
- Knowledge tab shows LIVE CONFIG badge + "Save & Sync" button for config.json files

**Connect page completely rebuilt:**
- Provider tabs: Claude Mobile, Claude Desktop, ChatGPT Custom GPT, Direct API, Cursor, n8n
- Copy-paste system prompt templates for each provider
- Brain Push endpoint reference with 3 example payloads

**Key file moves:**
- `app/(app)/brain/page.tsx` → now redirects to `/files`
- `app/(app)/files/page.tsx` — unified Knowledge + Files page

---

### Session 2026-05-09 — Payments → crypto, Brain redesign, business vault seed

- All Stripe/BitPay/MercadoPago routes deleted; billing page rewritten for USDT/USDC crypto
- **ACTION REQUIRED:** Update wallet addresses in `app/(app)/billing/page.tsx` (WALLETS constant)
- Brain page: 3-pane layout (left: folder tree, center: viewer, right: graph always visible)
- KnowledgeGraph redesigned Obsidian-style (square nodes, minimal dark bg, dot grid)
- Vault seeded: Business/Overview, Services-Pricing, Customers-ICP, Vision-Direction, Agents/Keeper-Briefing, Agents/Agent-Ground-Rules
- Docker cleanup: 112GB → 36GB disk usage on VPS

---

### Session 2026-05-06 — Autonomous machine: Brain sync + Task Executor + Connect page

- `lib/executor.ts` — generateTaskPlan() (Claude Haiku) + getExecutorQueue()
- `app/api/executor/plan/route.ts` + queue route
- `app/(app)/executor/page.tsx` — Executor UI
- `app/(app)/connect/page.tsx` — MCP connect guide
- `lib/brain/index.ts` — initProjectBrain(), initTeamBrain(), extractDate(), isScheduledNote()
- Project create → Brain folder at `Projects/<slug>/README.md`
- Team create → Brain folder at `Teams/<slug>/README.md`
- Brain note with #task/#meeting/#event + date → auto ScheduledJob
- plan_task tool added to chat-tools.ts

---

### Session 2026-05-05 — Brain page full UI + deploy + MCP live

- Brain page fully built, all brain API routes deployed, MCP endpoint live
- `components/KnowledgeGraph.tsx` — canvas-based force graph, no D3 dep
- Vault write permissions fixed: `chmod 777 /var/lib/docker/volumes/vps_vaultdata/_data`
- API key pre-generated: `agp_2cdb0e4ded24ddd5ae214ab08f9dff7ec40bb04ef1cdd2c57cde38a5d227c26d`
- End-to-end verified: vault_write → embed (768 dims) → vault_search ✅

---

### Session 2026-05-04 — Brain page + vault tools + VPS brain activation

- `vps-syncthing` container started, `nomic-embed-text` pulled, `VAULT_CONTEXT_ENABLED=true` set
- `app/api/brain/notes/route.ts` created
- vault_search, vault_read, vault_write tools added to chat-tools.ts
- Brain nav link added to Sidebar

---

### Session 2026-05-03 — Auto-seed, self-registration, env template

Auto-seed on first install via `/api/admin/seed`. Self-registration with optional invite code. `.env.template` ships with repo.

---

### Sessions 2026-05-02 (a–d) — 2nd Brain Blocks A–C

**Block A:** VaultNote model, `/api/brain/*` routes, vault context injection, session write-back.
**Block B:** MCP endpoint, API key management in Settings.
**Block C:** Telegram → vault pipeline, quick capture page.

---

### Sessions 2026-04-07 to 2026-04-17 — Core platform stabilization

Docker health check fix, billing schema, Telegram bot, self-optimization system, VPS deployment, AR sales site, MercadoPago integration, token counter, file/audio in chat, tool installer via SSH, email/WhatsApp channel stubs.
