# HANDOFF.md — Session State
> Last updated: 2026-06-26 (Session 22 — Nav gating, API Keys settings, License model, version endpoint)
> Read this FIRST at every session start, before CLAUDE.md.
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

### Last Session (Session 22 — 2026-06-26) — Desktop App Session 1
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

### ⚡ PIVOT IN PROGRESS — Desktop App (Session 2 next)
Full pivot plan at `docs/pivot/` (8 files). Summary: AgentPlayground becomes a downloadable open-source desktop app. Read `docs/pivot/00-OVERVIEW.md` first.

**Revised approach (simpler):** VPS app IS the desktop app — same codebase, packaged for Docker download. No separate repo yet. Addons + monetization come after public launch + traction.

**Prompt schedule** (exact prompts to paste each session): `docs/pivot/PROMPT-SCHEDULE.md`

**Session order:**
1. ~~Session 0 — Sensorguard cleanup~~ ✅ Done (Session 21)
2. ~~Session 1 — Nav cleanup + hub endpoints + License schema~~ ✅ Done (Session 22)
3. Session 2 — First-run wizard /setup (2-3 hrs)
4. Session 3A — Multi-workspace tabs: data layer (2-3 hrs)
5. Session 3B — Multi-workspace tabs: live status + agent awareness (2-3 hrs)
6. Session 4 — Docker packaging + installer scripts (2-3 hrs)
7. Session 5 — Download page on agentplayground.net (2-3 hrs)
8. Session 6 — Polish + GitHub release (1-2 hrs)

See `docs/pivot/07-SESSIONS.md` for rationale + scope.

See `docs/PLAN.md` for full detail.

**Deploy (already done this session):**
```bash
# No pending deploy — VPS is up to date as of 2026-06-08
```

---

## Deploy Info

**Before ANY deploy:** read `docs/DEPLOY-PROTOCOL.md`.

Key rules:
- `scp` files → restart dashboard container. Never `git pull` on server.
- Slug names must match at same URL level (e.g. all `app/api/playground/teams/[id]/...` use `[id]`)
- Deleting directories requires `--no-cache` rebuild
- No pending schema changes at this time

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

Full history → `docs/SESSION-HISTORY.md`
