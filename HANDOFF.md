# HANDOFF.md — Session State
> Last updated: 2026-05-27 (Session 17)
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
- LLM Provider adapter system (`lib/providers/`)
- Admin panel (`/admin`): analytics, API monitor, credit management
- Playground Teams Hub (`/playground`): team chat, widget grid, live data
- Coordinator mode: full COORDINATOR_INTRO prompt, delegation wired, plans wired
- SSE activity strip: live agent task notifications in chat
- `request_human_input` tool: agents pause mid-task for user decisions
- Project status dashboard (`/projects`): workstream panels, task counts
- Telegram: bidirectional DMs → coordinator, group notifications, settings UI
- PWA: manifest, icons, installable
- Design System v3: charcoal `#1a1a1a`, rust logo `#D4715A`, neutral palette

### Last Session (Session 18 — 2026-05-27)
- Documentation restructure (S17): slim CLAUDE.md, PLAN.md, PROTOCOLS.md, architecture.md
- `generate_session_report` tool, research/task auto-archive to Brain (P1/P2)
- 4-step onboarding wizard, `lib/seed-personal-teams.ts`, `POST /api/admin/index-docs`
- `lib/agents/local-runner.ts`: Ollama batch runner (no tool loop)
- `app/api/admin/overnight/route.ts`: queues dev docs + business docs tasks via qwen2.5:7b
- `/admin/system`: Overnight Knowledge Build UI (run + select groups)
- `/notes` page: dump CV/business/education context → Brain (Notes & Context page)
- `UserNote` model added to prisma schema (`prisma db push` needed on VPS)
- Notes API: GET/POST/DELETE notes + `POST /api/notes/[noteId]/brain` to index note
- Sidebar: Notes link added to brain tab

---

## Next Session Priorities

See `docs/PLAN.md` for full detail. Short version:

**FIRST THING: Deploy + Schema Push**
```bash
# 1. scp all session 18 files to VPS
# 2. prisma db push — new models: UserNote, PendingAction
docker compose exec dashboard npx prisma db push
# 3. Restart dashboard
```

**Then run these in order from /admin/system:**
1. "Seed Context Now" — loads brain context docs + creates 8 pending actions for coordinator
2. "Index Docs Now" — indexes all project docs into Brain
3. "Run Overnight Tasks" — qwen2.5:7b documents codebase + writes business docs (runs in background)

**After that, open Chat** — the coordinator will see pending actions and walk you through: CV info, ARQ account, Monotributo details, learning preferences.

**Next session priorities:**
1. Blog auto-generation page (`/blog/generate`)
2. CV subdomain (public-facing `cv.agentplayground.net`)
3. Crypto billing agents (depends on ARQ account info from user)
4. Job application agents (`/jobs` page + Application Package flow)
5. LLM Provider Settings UI
6. Admin Monitoring Panel (DB size, SSE, Ollama status)

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
