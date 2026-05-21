# Session History

> Archived from CLAUDE.md. For current session notes, see HANDOFF.md.

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
