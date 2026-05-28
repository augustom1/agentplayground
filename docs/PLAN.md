# docs/PLAN.md — Master Open Work List
> Updated: 2026-05-27 (Session 18)
> Single source of truth for open work. HANDOFF.md has the short version.
> Full history → docs/SESSION-HISTORY.md

---

## Active / Next Session

### 1. Deploy Session 18 + Run Setup
**Status:** Built locally. Needs deploy + schema push.
**Steps:**
1. `scp` all changed files to VPS
2. `docker compose exec dashboard npx prisma db push` (new models: UserNote, PendingAction)
3. `/admin/system` → "Seed Context Now" (seeds Brain + creates pending actions)
4. `/admin/system` → "Index Docs Now" (indexes all docs)
5. `/admin/system` → "Run Overnight Tasks" (generates code docs + business docs via qwen2.5:7b)
6. Chat → coordinator will show pending actions, ask for CV/business info

### 2. Blog Auto-Generation
**Status:** Not started. Docs/context seeded (content-strategy in PLAN).
**What to build:** `/blog/generate` page — user picks topic + outline, coordinator drafts post, saves to Brain + publishes to `/blog`.
**Agent flow:** Business team → draft post → user reviews → publish to `data/blog/<slug>.md` → render at `/blog/[slug]`.

### 3. CV Subdomain
**Status:** `/cv` page built (local). Needs subdomain + public view.
**What to build:** `cv.agentplayground.net` or `/public/cv/[username]` — public-facing rendered CV from Brain notes.
**Agent flow:** CV Advisory team formats Brain notes → renders as clean HTML CV page.

### 4. Crypto Billing Agents
**Status:** Architecture documented in `docs/context/business-setup.md`. Not built.
**What to build:**
- `Billing Monitor Agent` team: wallet watcher + invoice matcher + ARQ transfer
- Schema: `Invoice`, `CryptoTransaction`, `WalletConfig` models
- `/billing/crypto` page: wallet config, transaction log, ARQ transfer history
**Blocked on:** User providing ARQ account + preferred chain (see pending actions)

### 5. Job Application Agents
**Status:** Job Search team seeded in `lib/seed-personal-teams.ts`. UI missing.
**What to build:** `/jobs` page — paste job description → Application Package skill runs → cover letter + outreach → saves to Brain.
**Agent flow:** CV notes + job desc → Job Scout analyzes → Application Writer drafts cover letter.

### 6. LLM Provider Settings UI
**Status:** Backend done. UI missing.
**Build:** `/settings/providers` page — list providers, add/edit API keys, set default per team, test connection.

### 7. Admin Monitoring Panel
**Status:** Partially built (`/admin/system` has Index Docs + Overnight). Health metrics missing.
**Build:** DB size, task volumes, active SSE connections, Ollama model status, ApiUsage chart (daily tokens by model).

### 8. Empty States
**Status:** Not started.
**Where:** `/plans`, `/agent-lab`, `/brain`, `/schedule` — blank divs when no data.
**Build:** Consistent empty states with lucide icons + call-to-action per page.

---

## Near-Term Backlog

| Item | Notes |
|---|---|
| Webapp hosting by agents | `/app/data/sites/<sub>/` + nginx config gen + `HostedApp` DB record. See P10 in PROTOCOLS.md |
| Agent evolution / versioning | `tools`, `version`, `changelog` fields on Agent model. Coordinator upgrades agents after successful task patterns |
| Token usage dashboard | ApiUsage data exists. Build a chart page at `/settings/usage` |
| Background task log | List all tasks (completed/running/failed) with results, searchable. Enhance `/plans` or add `/tasks` page |
| Weekly optimization scan | `lib/optimizer/scanner.ts` exists. Wire to cron to run weekly + write OptimizationScan + report to Brain |
| Multi-server / client isolation | Each client gets separate DB + namespace. `tenantId` field exists on most models — build tenant routing |

---

## Long-Term Vision

### The Brain as Operations Hub
Every action the system takes should leave a trace in the Brain:
- Research → `BrainDocument (research)`
- Task results → `BrainDocument (task-result)`  
- Session reports → `BrainDocument (session-report)`
- Plans + outcomes → `BrainDocument (plan)`
- Documentation → `BrainDocument (manual)` via index-docs

When the Brain is full, agents can answer questions from stored context using local Ollama (zero API cost).

### Protocols In Place (already built)
See `docs/PROTOCOLS.md` for full specification. Summary:
- P1: Research auto-archive (web_search + web_browse → Brain)
- P2: Task result auto-archive (delegate_to_team → Brain)
- P3: Session report protocol (generate_session_report tool)
- P4: Knowledge population (POST /api/admin/index-docs)
- P5: Agent evolution (optimizer learns from usage)
- P6: Human intervention (request_human_input → SSE + Telegram)
- P7: Data retention config (full / results_only / minimal)
- P8: Token usage tracking (ApiUsage table)
- P9: Onboarding wizard (4-step setup: account → mission → teams → preferences)

### Onboarding Goals
When a new user installs the app on their server:
1. `/setup` wizard: account → use case → team selection → data/LLM preferences
2. Admin creates account + seeds selected teams + saves config to AgentMemory + indexes docs
3. Coordinator reads config at startup and adapts behavior

### Scale-Out Plan
1. **Single VPS (current):** One admin, multiple users, shared coordinator
2. **Multi-tenant VPS:** `tenantId` on all models, namespaced Brain, per-tenant coordinators
3. **Client hosting:** Each client gets isolated namespace + their selected agent teams
4. **Multi-VPS:** Redis pub/sub for cross-server SSE, shared DB or per-client DB

---

## Infrastructure Backlog

| Item | Notes |
|---|---|
| Telegram env vars on VPS | `TELEGRAM_GROUP_CHAT_ID` + `TELEGRAM_OWNER_CHAT_ID` → `.env.local` + restart |
| Stripe payment automation | Schema done. Needs keys + webhook. Wire to UserCredits |
| Live blockchain (Crypto Wallet) | 3 agents, 3 skills scaffold only. Awaits API keys |
| Landing page Brain section | Block G — not started |
| Google/Microsoft OAuth | Phase C3 |
| Monthly credit reset cron | Schema ready, no reset logic |
| Update wallet addresses | `app/(app)/billing/page.tsx` → `WALLETS` constant |

---

## Recently Completed

### Session 17 (2026-05-27)
- Slim CLAUDE.md (session start protocol), new PLAN.md, HANDOFF.md restructured
- `docs/PROTOCOLS.md` — all 11 system protocols defined
- `docs/architecture.md` — full code navigation guide (updated)
- `generate_session_report` tool (tool #30) — Brain upload from coordinator
- Research auto-archive — `web_search` + `web_browse` → Brain (P1)
- Task result auto-archive — `delegate_to_team` → Brain (P2)
- 4-step onboarding wizard — `/setup` page rebuilt
- `lib/seed-personal-teams.ts` — CV Advisory, Education, Financial Planner, Job Search, Fitness
- `app/api/admin/index-docs` — docs indexer API
- `app/admin/system/page.tsx` — Index Docs button

### Session 16 (2026-05-22)
- Slug conflict fixed: `[teamId]` → `[id]` in widget-data route
- No-cache Docker rebuild after directory deletion
- `docs/DEPLOY-PROTOCOL.md` created

### Session 15 (2026-05-22)
- Project status dashboard + `get_project_status` tool
- Telegram: bidirectional DMs → coordinator, group notifications, Settings UI
- Live widget data (task_queue, project_pipeline)

> Full archive → docs/SESSION-HISTORY.md
