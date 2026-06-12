# HANDOFF.md — Session State
> Last updated: 2026-06-12 (Session 20)
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
- **Personal OS pages**: `/cv`, `/learn`, `/notes` — Brain-indexed context
- **Admin system**: Seed Context, Index Docs, Overnight Knowledge Build
- **Local LLM flywheel**: task classifier → Ollama routing → Brain archive → protocol writer
- **SensorGuard demo**: API routes for playground-chat, seed-team, telegram
- **GuardTech site**: `guardtech.agentplayground.net` — static company page + Ollama chatbot (qwen2.5:3b). CLEANUP after 2026-06-19 with sensorguard (branch `feature/sensorguard-demo`)

### Last Session (Session 20 — 2026-06-12)
- Deployed GuardTech Solutions company site (`web-empresa-sensorguard/` design) to `guardtech.agentplayground.net`
- `sites/guardtech.conf`: vhost + `/api/chat` POST-only proxy → `ollama:11434` (Ollama never exposed via the vhost)
- `docker-compose.prod.yml`: guardtech Traefik routers (mirrors sensorguard block)
- Chatbot model set to `qwen2.5:3b` (llama3.2:3b not installed on VPS)
- Verified: HTTPS + cert OK, HTTP→HTTPS redirect, chat responds in Spanish, GET /api/chat → 405, demo link → sensorguard
- All committed to `feature/sensorguard-demo` — delete branch + `sites/guardtech.conf` + `webroot/guardtech/` + compose labels after semester (2026-06-19)

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

**Run these in order from /admin/system:**
1. "Seed Context Now" — loads brain context docs + creates 8 pending actions
2. "Index Docs Now" — indexes all project docs into Brain
3. "Run Overnight Tasks" — qwen2.5:7b documents codebase + writes protocols (runs in background)

**Then open Chat** — coordinator will show pending actions and walk you through: CV info, ARQ account, Monotributo details.

**Feature work (priority order):**
1. Blog auto-generation page (`/blog/generate`)
2. CV subdomain (`cv.agentplayground.net` or `/public/cv/[username]`)
3. Crypto billing agents (blocked on ARQ account info from user)
4. Job application agents (`/jobs` page)
5. LLM Provider Settings UI (`/settings/providers`)
6. Admin Monitoring Panel (DB size, task volumes, Ollama status)

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

Full history → `docs/SESSION-HISTORY.md`
