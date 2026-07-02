# HANDOFF.md — Session State
> Last updated: 2026-07-02 (Session 32 — Repo cleanup + plan realignment)
> Read this FIRST at every session start, before CLAUDE.md.
> **Source of truth for direction: `docs/VISION.md`** — if anything here contradicts it, VISION wins.
> See `docs/PLAN.md` for the full open work list.
> See `docs/SESSION-HISTORY.md` for full session archive.

---

## Current State — What's Live ✅

App is **healthy** at `https://app.agentplayground.net`

### Platform (all deployed)
- Teams, Agents, Skills, Chat (streaming, 25-iteration tool loop, 30 tools)
- 2nd Brain: vault, MCP endpoint, graph, semantic search, brain chunks + HNSW
- Plans system: create → council review → approve → dispatch → execute
- LLM Provider adapter system (`lib/providers/`) — extended thinking support added
- Admin panel (`/admin`): analytics, API monitor, credit management
- Playground Teams Hub (`/playground`): team chat, widget grid, live data
- Coordinator mode: full COORDINATOR_INTRO prompt, delegation wired, plans wired
- SSE activity strip: live agent task notifications in chat
- `request_human_input` tool: agents pause mid-task for user decisions
- Project status dashboard (`/projects`): workstream panels, task counts
- Telegram: bidirectional DMs → coordinator, group notifications, settings UI
- PWA: manifest, icons, installable
- Design System v3: charcoal `#1a1a1a`, rust logo `#D4715A`, neutral palette
- **Actions system**: PendingAction model, `/actions` page, create/dismiss/list tools
- **Personal OS pages**: `/cv`, `/learn`, `/notes` — Brain-indexed context, admin-only nav links
- **Nav gating**: `/overview`, `/notes`, `/cv`, `/learn`, `/connect` hidden for non-admin users
- **API Keys settings**: Users can set ANTHROPIC_API_KEY / OPENAI_API_KEY in Settings UI (stored in AgentMemory)
- **License model**: `licenses` table — plan, userEmail, key (UUID), expiresAt
- **Version endpoint**: `GET /api/version` — public, no auth — `{ version, downloadUrl, changelog }`
- **Admin Licenses**: `/admin/licenses` — create/revoke license keys
- **Admin system**: Seed Context, Index Docs, Overnight Knowledge Build
- **Local LLM flywheel**: task classifier → Ollama routing → Brain archive → protocol writer
- **Playgrounds**: Organizational containers grouping AgentTeams — sidebar section, CRUD API, `/spaces/[id]` dashboard (agents, active tasks, skills, recent completions)

### Last Session (Session 32 — 2026-07-02) — Repo Cleanup + Plan Realignment ✅

**Direction change:** `docs/VISION.md` (moved from root `AGENT_PLAYGROUND_VISION_2-7.md`) is now the
source of truth. Priority order: **UI restoration → n8n MCP tools → Telegram bots → permission rings →
deployment capabilities.** The owner dislikes the current UI (Session 28+ redesign) — restoring the
pre-redesign feel in a 4-section layout is the next session, fully specced in `docs/PLAN.md` §1.

- **Build fix:** removed committed slug conflicts left by a failed revert — deleted
  `app/(app)/playground/[teamId]/`, `app/(app)/playground/page.tsx`,
  `app/api/playground/teams/[teamId]/widget-data/`. HEAD previously had `[id]` + `[teamId]` + `page.tsx`
  coexisting → Next.js build crashed. `npm run build` passes again.
- **`components/MobileNav.tsx`:** `/playground` tab (now a 404) temporarily points to `/overview`
  until the UI restoration rebuilds nav.
- **Repo reorganization (VISION §3):** 12 stale root .md files + `docs/pivot/` + `docs/features/` +
  6 stale docs specs + old website folder → `docs/archive/`; infra how-tos (Cloudflare, deployment,
  Traefik SSL, VPS) → `docs/ops/`; `add-site.sh`/`backup-db.sh`/`setup.sh` → `scripts/`;
  `claude_desktop_reference.png` → `docs/assets/`; release zip gitignored.
  Code-referenced paths untouched (docs/PLAN.md, docs/PROTOCOLS.md, docs/architecture.md,
  docs/DEPLOY-PROTOCOL.md, docs/context/, docs/BLOGPOSTS.md, entrypoint scripts, KEYS.md).
- **`docs/PLAN.md`:** full rewrite — new build order, detailed UI-restoration spec (incl. git
  archaeology: liked UI at commit `5213954`, disliked redesign in `404a125`), n8n/Telegram/rings/
  deployment stages, cross-cutting requirements, backlog.
- **`business/` docs updated to VISION §1 model:** open source core; custom playgrounds $350–500;
  full installs $1,000–1,500; hosting ~$100 / ~$180–200 / ~$250–300 per month; Playground Library.
  Rewrote `business/CLAUDE.md`, `00-overview.md`, `03-services-pricing.md`, `07-future-roadmap.md`;
  historical banner added to the other 9 business files. AR site = lead-gen, no MercadoPago checkout.
- **`CLAUDE.md`:** new read order (HANDOFF → docs/VISION.md → docs/PLAN.md), repo structure map,
  no-emoji + LLM-routing constraints added.

### Previous Session (Session 31 — 2026-06-29) — Overview Dashboard + AR Rebuild ✅ Phase 2 Session 10 COMPLETE

- **`app/(app)/overview/page.tsx`**: Full widget dashboard — 6 widgets: Active Tasks (running/pending), Playgrounds Quick-Launch (cards → /playground/[id]), Recent Completions, Plans Status (with status badges), Brain Summary (doc count + last indexed + link), Quick Chat (input → /chat?q=... launcher)
- **`app/(app)/playground/[id]/layout.tsx`**: Added Plans (ListTodo → /plans) and Actions (Zap → /actions) to WORKSPACE section
- **`components/ProviderModelSection.tsx`** + **`app/api/settings/provider-model/route.ts`**: Default Provider/Model selector in Settings — radio buttons (Anthropic/OpenAI/Ollama), model dropdown, saves to AgentMemory DEFAULT_PROVIDER/DEFAULT_MODEL
- **`app/api/chat/route.ts`**: Reads DEFAULT_PROVIDER/DEFAULT_MODEL from AgentMemory when request doesn't specify provider/model
- **`app/(app)/chat/page.tsx`**: Reads `?q=` query param on load and pre-fills input (used by Overview Quick Chat)
- **`webroot/ar/index.html`**: Full rebuild — lead-gen page, no prices, chatbot widget, 4-step process, FAQ, contact section; accent changed from blue to rust #D4715A; rust asterisk logo
- **`app/api/public/ar-chat/route.ts`**: New public endpoint — in-memory rate limit (20/hr/IP), CORS headers, system prompt for Argentine sales assistant, uses haiku/gpt-4o-mini
- **`middleware.ts`**: Added `/api/public/` to public routes (no auth required)
- **Deploy**: SCP 10 files → rebuild dashboard → health 200 ✅
- **GitHub**: Committed 42 files (sessions 22–31) + pushed to augustom1/agentplayground ✅
- **Phase 2 COMPLETE** — Docker push pending (need Docker Desktop running)

### Previous Session (Session 30 — 2026-06-29) — Playground Creation Assistant ✅ Phase 2 Session 9

- **`app/api/playground-assistant/route.ts`**: New non-streaming API endpoint for the playground creation chat. Auth-gated. 3 inline tools: `list_teams` (returns existing teams), `suggest_playground_config` (sub-LLM call to generate config JSON), `create_playground_from_config` (creates new teams if needed + playground). `confirmedConfig` shortcut skips LLM for creation step. Tool loop runs up to 6 iterations.
- **`components/Sidebar.tsx`**: Replaced old form modal with a right-side slide-in chat panel. 4-state machine: `chatting` → `proposing` → `creating` → `done`. Opens with greeting message. User describes intent → assistant proposes config card (name, icon, teams, brain tags) → "Looks good" creates instantly → "Open Playground" navigates. Input box in chatting/proposing states. Auto-scrolls. Panel is 440px wide with backdrop.
- **`app/api/library/install/route.ts`**: New stub endpoint (501 "coming in Phase 3") for importing playground packages.
- **`app/(app)/playground/[id]/settings/page.tsx`**: Added "Import" section with file picker (.zip) → `POST /api/library/install` → shows toast on success/error. Import section placed before Delete.
- **Deploy**: SCP 4 files → rebuild dashboard → health check ✅

### Previous Session (Session 29 — 2026-06-28) — Playground Environment ✅ Phase 2 Session 8

- **`prisma/schema.prisma`**: Added `brainTags String[] @default([])` to `Playground` model; `npx prisma db push` run on VPS
- **`app/(app)/playground/[id]/layout.tsx`**: New playground inner sidebar — 200px panel with playground name/icon, WORKSPACE section (Dashboard/Chat/Brain links), collapsible TEAMS section (filtered to playground's teams), collapsible APPS section (disabled "Coming soon"), Settings link at bottom
- **`app/(app)/playground/[id]/chat/page.tsx`**: Scoped chat — pre-filtered team picker (only playground teams + coordinator), `systemContext` injected with playground name + team list, empty state shows "Add teams in Settings" when no teams assigned
- **`app/(app)/playground/[id]/brain/page.tsx`**: Scoped Brain — fetches notes tagged with playground's `brainTags` (deduped across all tags), "Add to Brain" modal ingests with playground tags auto-applied, empty states for no-tags and no-docs
- **`app/(app)/playground/[id]/settings/page.tsx`**: Playground settings — name/icon/color editing, team multi-select, comma-separated brain tags input, PATCH to `/api/playgrounds/[id]`, delete with confirm
- **`lib/seed-playgrounds.ts`**: New `seedDefaultPlaygrounds(userId)` — creates 3 default playgrounds (Development 💻/Research 🔬/Business 💼) if user has 0; matches existing teams by name keywords
- **`app/api/playgrounds/route.ts`**: GET now auto-seeds defaults if list is empty; POST accepts `brainTags`
- **`app/api/playgrounds/[id]/route.ts`**: PATCH now accepts `brainTags`
- **`app/api/setup/complete/route.ts`**: Calls `seedDefaultPlaygrounds()` after team seeding in wizard flow
- **Deploy**: SCP all files → docker cp schema → db push (brainTags added) → rebuild → health 200 ✅

### Previous Session (Session 28 — 2026-06-28) — Navigation Restructure ✅ Phase 2 Session 7

- **`components/Logo.tsx`**: Unified to single `LogoMark` component — rust asterisk (#D4715A), 3 lines crossing at 60° each, replaces BrainNetwork SVG; exports `LogoMark({ size, color? })` and `LogoFull({ size, color? })`
- **`components/Sidebar.tsx`**: Full rewrite — removed 3-tab pill box (Chat/Teams/Brain), removed recents, removed pending actions badge; new structure: logo row → New Chat → SECTION: Main (Chat + Overview) → SECTION: Playgrounds; hamburger now has Settings + Admin (admin) + Users (admin), no Billing; playground links updated to `/playground/[id]`
- **`app/(app)/playground/[id]/page.tsx`**: New file — content moved from `/spaces/[id]`; delete-playground now redirects to `/chat` not `/dashboard`
- **Deleted**: `app/(app)/playground/page.tsx` and `app/(app)/playground/[teamId]/page.tsx` (old agent teams hub)
- **`app/(app)/overview/page.tsx`**: Replaced "How It Works" diagram with simple stub ("Coming in Session 10")
- **`app/(app)/chat/page.tsx`**: Empty state now shows "What would you like to work on today?" subtitle; fetches `/api/playgrounds` and shows up to 3 as navigation chips; falls back to hardcoded suggestions if no playgrounds
- **`app/page.tsx`** + **`app/(marketing)/layout.tsx`**: Replaced inline Logo SVG functions with imported `LogoMark` from `@/components/Logo`
- **Deploy**: SCP all 7 files → `--no-cache` rebuild → container up ✅ health 200 ✅

### Previous Session (Session 27 — 2026-06-28) — Polish + GitHub Release Prep ✅ Phase 1 Complete

- **`docker/start.sh` + `docker/start.bat`**: Removed exit-1 on first run; auto-generate AUTH_SECRET if placeholder; health-check polling loop (up to 120s) instead of fixed `sleep 10` — much better first-run UX
- **`docker/.env.example`**: Clarified API keys are optional in file (wizard handles them)
- **`INSTALL.md`**: Simplified to 3-step flow — Docker, extract, run start.bat
- **`app/api/chat/route.ts`**: Fixed invalid-key error messages to say "Go to Settings → API Keys" instead of `.env.local`; fixed "key not set" messages same way
- **`app/(auth)/setup/page.tsx`**: Changed default starter from "business" → "personal" (more relatable for first users)
- **`app/(app)/settings/page.tsx`**: OpenAI fixed from "Coming soon" → active with "GPT-4o, GPT-4o mini"; subtitle changed from ".env.local" to "Manage your API keys"; added prisma DB key check so "Missing required configuration" banner no longer false-alarms for wizard users; updated Quick Links to API key sources + Ollama download
- **`app/api/version/route.ts`**: Updated `downloadUrl` to `https://agentplayground.net/download` and `changelog` to proper text
- **`docker/build-release.sh`**: New script — builds `agentplayground-v0.1.0.zip` release package
- **`README.md`**: Rewritten as desktop-app public GitHub readme (hero, features, quick start, license)
- **Deploy**: SCP 4 changed app files → rebuild dashboard → verified ✅
  - `https://app.agentplayground.net/api/health` → 200 ✅
  - `https://agentplayground.net/api/version` → `{ "version": "0.1.0", "downloadUrl": "https://agentplayground.net/download", ... }` ✅

### Previous Session (Session 26 — 2026-06-28) — Marketing Website agentplayground.net

- **`app/page.tsx`**: Replaced dashboard redirect with marketing homepage — hero, 3 features, how-it-works, footer CTA, header + footer with rust asterisk logo
- **`app/(marketing)/layout.tsx`**: Marketing layout shell (header + footer) for all `/` group routes
- **`app/(marketing)/download/page.tsx`**: Download page — version badge (fetched from `/api/version`), download card, requirements, 5-step install, API key guide
- **`middleware.ts`**: Added `/`, `/download`, `/api/version`, `/llms.txt`, `/robots.txt`, `/sitemap.xml` to `isPublic` (no auth redirect)
- **`public/llms.txt`** + **`public/robots.txt`**: SEO files
- **`app/sitemap.ts`**: Returns sitemap for `/` and `/download`
- **`docker-compose.prod.yml`**: Added `marketing` + `marketing-http` Traefik routers on dashboard container for `agentplayground.net` + `www.agentplayground.net`; removed conflicting root-domain labels from nginx service
- **Deploy**: SCP all files → `docker compose up -d --build dashboard` → verified ✅
- **Tested live**:
  - `https://agentplayground.net` → HTTP 200 (marketing homepage) ✅
  - `https://agentplayground.net/download` → HTTP 200 (download page with v0.1.0 badge) ✅
  - `https://agentplayground.net/sitemap.xml` → XML sitemap ✅
  - `https://agentplayground.net/llms.txt` → HTTP 200 ✅
  - `https://agentplayground.net/robots.txt` → HTTP 200 ✅
  - `https://app.agentplayground.net/api/health` → HTTP 200 (app still works) ✅

### Previous Session (Session 25 — 2026-06-27) — Docker Packaging + End-to-End Test

- **`docker/docker-compose.yml`**: Core stack — `agentplayground/app:latest` + `pgvector/pgvector:pg16` + `redis:7-alpine`; `AUTH_TRUST_HOST=true` added (NextAuth v5 requires this for localhost); named volumes for data persistence
- **`docker/docker-compose.ollama.yml`**: Optional overlay — `ollama/ollama` + sets `OLLAMA_BASE_URL`; user adds with `--file` flag if they want local AI
- **`docker/.env.example`**: Template with `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`, `AUTH_SECRET`, `NEXTAUTH_URL`; Ollama comment included
- **`docker/start.bat` + `docker/stop.bat`**: Windows launch scripts; first-run copies `.env.example` → `.env.local`, prompts user to add key, then opens browser
- **`docker/start.sh` + `docker/stop.sh`**: Mac/Linux equivalents; executable bit set in git index
- **`INSTALL.md`**: Root-level install guide — requirements, 6 steps, Ollama opt-in, stop instructions
- **Bug fixed**: Deleted stale `app/api/playground/teams/[teamId]/` directory — Next.js crashed on startup with slug conflict vs `[id]` at same depth (leftover from Session 16 that was never actually removed)
- **Bug fixed**: Switched postgres image from `postgres:16-alpine` → `pgvector/pgvector:pg16` (alpine doesn't ship the vector extension)
- **Bug fixed**: Added `AUTH_TRUST_HOST: "true"` to `docker-compose.yml` env — NextAuth v5 rejects `localhost` as untrusted host without this
- **End-to-end test**: Built image locally (`agentplayground/app:latest`, 457MB compressed), ran full stack, wizard appeared on fresh DB, created account, logged in, sent message to coordinator — all working ✅
- **Image NOT yet pushed to Docker Hub** — needs `docker push agentplayground/app:latest` when ready to publish

### Previous Session (Session 24 — 2026-06-27) — Playground Organizational Containers

- **`Playground` model**: Added to `prisma/schema.prisma` — `id, name, icon, color, teamIds[], userId` — relation on `User`; `@@map("playgrounds")`; `npx prisma db push` run on VPS
- **`GET/POST /api/playgrounds`**: List (auth-scoped to userId) + create playground
- **`GET/PATCH/DELETE /api/playgrounds/[id]`**: Full CRUD, all scoped to userId
- **Sidebar Playgrounds section**: Collapsible "Playgrounds" section below Recents; + button opens quick-create modal (name, emoji icon, team multi-select); lists all playgrounds as nav links to `/spaces/[id]`; collapsed view shows emoji icons
- **`/spaces/[id]` dashboard page**: 4-quadrant grid — Agents (with status dot), Active Tasks, Skills (tag pills), Recent Completions; inline edit (name + icon); delete with confirmation
- **URL note**: Used `/spaces/[id]` instead of `/playground/[id]` — the latter conflicts with existing `/playground/[teamId]` (same dynamic segment depth in Next.js); teams and agents fetched from existing APIs and filtered client-side by `teamIds`
- **Deploy**: SCP all new + modified files → `prisma db push` → `docker compose up --build` → 200 health check ✅

### Previous Session (Session 23 — 2026-06-27) — First-Run Setup Wizard

- **Middleware**: Switched to `runtime = "nodejs"`, added Prisma import for user-count check; setup_complete cookie logic — no cookie → count users → if 0 redirect to /setup, else stamp cookie and continue
- **`/api/setup/create-account`**: New public POST — validates 0 users exist, creates admin with `role=admin plan=pro`, creates UserCredits (5000 balance)
- **`/api/setup/complete`**: New auth-required POST — saves OPENAI_API_KEY / ANTHROPIC_API_KEY to AgentMemory, seeds teams based on starterPack (personal/business/development/blank), sets `setup_complete` cookie in response
- **`/setup` page**: Replaced old 4-step wizard with new 5-step wizard: Welcome → API Keys (3 provider cards, multi-select) → Create Account (auto sign-in after) → Choose Starter (4 packs) → Done (summary + launch button)
- **`/api/setup` added to isPublic** in middleware — these routes are self-secured within the handlers
- Build: passes clean, all new routes appear as `ƒ` (dynamic)

### Previous Session (Session 22 — 2026-06-26) — Desktop App Session 1
- **Nav gating**: `/overview`, `/notes`, `/cv`, `/learn`, `/connect` hidden from non-admin users in Sidebar + MobileNav
- **API Keys settings**: `UserApiKeysSection` component + `GET/POST /api/settings/api-keys` → stores keys in AgentMemory (ownerType=system)
- **Chat route**: Falls back to AgentMemory for ANTHROPIC_API_KEY + OPENAI_API_KEY when env vars not set
- **License model**: Added to `prisma/schema.prisma`, table created on VPS (`licenses`)
- **Version endpoint**: `GET /api/version` → `{ version, downloadUrl, changelog }` — no auth required
- **Admin Licenses page**: `/admin/licenses` — list, create (auto-UUID key), revoke. API at `/api/admin/licenses`
- **AdminSidebar**: Added Licenses nav item with Key icon
- Deploy: SCP + no-cache rebuild + db push (docker cp schema workaround needed — cached layer issue)

### Session 21 (2026-06-25) — SensorGuard Cleanup
- Cleaned up `feature/sensorguard-demo` branch and merged to master
- Deleted: `app/api/sensorguard/`, `lib/sensorguard-demo.ts`, `web-empresa-sensorguard/`, `webroot/sensorguard/`, `webroot/guardtech/`, `sites/sensorguard.conf`, `sites/guardtech.conf`
- Removed GuardTech/SensorGuard Traefik labels from `docker-compose.prod.yml`
- Removed sensorguard volume mount from `docker-compose.yml`
- Removed sensorguard auth bypass from `middleware.ts`
- Removed `edit_demo_file` tool from playground messages route
- VPS cleanup: removed guardtech.conf, webroot/guardtech/, webroot/sensorguard/, sensorguard.conf via SSH
- Rebuilt dashboard container with `--no-cache`
- Branch `feature/sensorguard-demo` deleted locally and remotely
- **Desktop app pivot begins** — see `docs/pivot/` for the 8-session plan

### Session 19 — 2026-06-08
- **DEPLOYED**: All sessions 17-18-19 changes (101 files) to VPS + container rebuilt
- Local LLM flywheel fully connected: runner.ts classifies → routes to Ollama (confidence ≥72%) → fallback to Claude → archive to Brain → evaluateAndWriteProtocol
- `delegated.ts`: delegated tasks archive to Brain + evaluate for local protocol
- `dispatch.ts`: plan completion generates Ollama report → docs/reports/plans/ + Brain
- Overnight: 3 new Ollama documentation tasks (local-llm-catalog, team-capabilities, workflow-patterns)
- `lib/providers/anthropic.ts`: extended thinking support (budget_tokens)
- SensorGuard API routes: playground-chat, seed-team, telegram
- `app/(app)/overview/page.tsx`: system flow overview page
- `components/SystemFlowDiagram.tsx`: visual flow diagram

---

## Next Session Priorities

### 🔜 NEXT SESSION — UI Restoration (VISION §2)

**Full spec with git archaeology already done: `docs/PLAN.md` §1. Read it first — don't re-derive.**

Summary:
1. Four top-level sections, nothing else: **Chats / Playgrounds / Teams / Brain**
2. Recover the liked sidebar visual language from commit `5213954` (`git show 5213954:components/Sidebar.tsx`)
3. Remove the 9 hardcoded rust `#D4715A` occurrences → back to `--color-brand` tokens (blue-cyan on charcoal; `app/globals.css` is already correct, don't touch tokens)
4. New ORIGINAL terminal-style logo (2–3 SVG variants for owner approval first) — the rust asterisk imitates Anthropic's mark and must go
5. Fix off-center content, visual pass on all four sections, passing `docker compose build`
6. MobileNav: replace temporary `/overview` patch with the four sections

### After that (in order — see docs/PLAN.md)
1. n8n MCP tools (agents create their own workflows)
2. Self-service Telegram bots
3. Permission rings + one-tap Telegram approval + audit log
4. Agent deployment capabilities (containers, subdomains)

### Standing items (do when convenient, not blocking)
- **AR chatbot key** — VPS `ANTHROPIC_API_KEY` expired; enter a fresh key at
  `https://app.agentplayground.net/settings` → API Keys (AgentMemory-first lookup already handles it). No code change.
- **Docker Hub push + friends release** — now gated behind UI restoration (the app's face must be right first):
  ```bash
  docker build -t augustojmd/agentplayground:0.1.0 .
  docker push augustojmd/agentplayground:0.1.0
  ```

---

## Deploy Info

**Before ANY deploy:** read `docs/DEPLOY-PROTOCOL.md`.

Key rules:
- `scp` files → restart dashboard container. Never `git pull` on server.
- Slug names must match at same URL level (e.g. all `app/api/playground/teams/[id]/...` use `[id]`)
- Deleting directories requires `--no-cache` rebuild
- No pending schema changes — `brainTags` was pushed in Session 29

```bash
# Standard deploy
scp -i ~/.ssh/id_ed25519 <file> root@95.217.163.247:/root/opt/vps/<path>
ssh -i ~/.ssh/id_ed25519 root@95.217.163.247 \
  "cd /root/opt/vps && docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build dashboard"
```

---

## Architecture Quick Reference

| Thing | Where |
|---|---|
| VPS IP | 95.217.163.247 |
| App path on VPS | `/root/opt/vps/` |
| Chat API | `app/api/chat/route.ts` |
| Chat tools | `lib/chat-tools.ts` (30 tools) |
| Agent runner (plan tasks) | `lib/agents/runner.ts` |
| Agent runner (delegated) | `lib/agents/delegated.ts` |
| Plan dispatcher | `lib/planner/dispatch.ts` |
| Brain ingest | `lib/brain/ingest.ts` |
| SSE stream | `GET /api/notify/stream` |
| Coordinator system prompt | `app/api/chat/route.ts` → `COORDINATOR_INTRO` |
| Design tokens | `app/globals.css` |
| Wallet addresses | `app/(app)/billing/page.tsx` → `WALLETS` |
| MCP endpoint | `app/api/mcp/route.ts` |

### Coordinator Flow
```
User → Coordinator (25 tool iterations)
  → delegate_to_team(teamId, title, desc)   ← single task, immediate
  → create_plan(goal) → run_plan(planId)    ← multi-team, parallel
  → get_task_result(taskId) × N → synthesize
```

### Not Built Yet
- Telegram env vars on VPS (`TELEGRAM_GROUP_CHAT_ID`, `TELEGRAM_OWNER_CHAT_ID`) — add to `.env.local` + restart
- LLM Provider Settings UI
- Admin Monitoring Panel
- Stripe payment automation
- Empty states (Plans, Teams, Brain, Schedule)
- Live blockchain integration (Crypto Wallet scaffold only)

---

## Session History (condensed)

| Sessions | What |
|---|---|
| 1–4 | Core platform: teams, agents, skills, chat, files, schedule, billing schema |
| 5–6 | 2nd Brain (vault + pgvector), MCP endpoint, Brain page, Telegram pipeline |
| 7–8 | Plans system, council, planner, dispatcher, provider adapter, SSE, /plans UI |
| 9–10 | PWA, agent editor, design systems v1–v3, Ollama tool loop, council/vps tools |
| 11–12 | Phase A (Playground Hub), Phase B (Admin Panel), Phase C1–C2 (delegation, business skills) |
| 13 | Playground redesign (groups, tabs, widgets), Crypto Wallet scaffold, Phase C4 (MCP expansion) |
| 14 | Live activity strip (SSE), request_human_input + checkpoint, playground → Agent Teams |
| 15 | Project status dashboard, Telegram bidirectional + group notifications, live widget data |
| 16 | Hotfix: slug conflict `[teamId]`→`[id]`; deploy protocol doc |
| 17 | Documentation restructure, session reports system, generate_session_report tool |
| 18–20 | Personal OS pages (CV/learn/notes), Local LLM flywheel, SensorGuard demo, GuardTech site |
| 21 | SensorGuard cleanup: deleted demo code, VPS cleanup, merged to master, desktop pivot begins |
| 22–27 | Desktop app Phase 1: nav gating, API keys settings, licenses, wizard, docker packaging, marketing site |
| 28–31 | Phase 2 (the disliked redesign): flat nav + rust asterisk logo, playground environment, creation assistant, overview dashboard, AR lead-gen rebuild |
| 32 | New vision adopted (docs/VISION.md), build fix (slug conflicts), repo cleanup, plan + business docs realigned |

Full history → `docs/SESSION-HISTORY.md`
