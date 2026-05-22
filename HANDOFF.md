# Session Handoff
> Last updated: 2026-05-22 (Session 14 — FULLY DEPLOYED ✅)
> Read this at the start of every session BEFORE reading CLAUDE.md.
> Update the "Current Session" block when ending a session.

---

## How to use this file

1. Read **Next Session** — what to build and any new concepts to explore
2. Read **State Snapshot** — what's live vs. not built
3. Read **Architecture Quick Reference** — where things live
4. Then open CLAUDE.md for env/command reference

---

## Next Session Priority

### 1. P5 — Project Status Dashboard + `get_project_status` tool
The `projects` table, `project_teams`, and `project_outputs` all exist. Missing:
- `/projects` page showing active projects with per-team workstream statuses
- `get_project_status(projectId)` tool so the coordinator can summarize all workstreams in one call
- SSE events emitted per workstream completion (reuse existing `planEventBus`)

### 2. P6 — Telegram Integration
`channels` table exists. Prior Telegram bot stub in `lib/integrations/telegram/`. Missing:
- Telegram bot webhook handler that routes DMs to coordinator chat (bidirectional)
- Group notification system with per-task opt-in
- Settings UI in `/settings` to configure bot token, DM chat ID, group chat ID, notification prefs

### 3. Real Widget Data in Playground Dashboard
All widgets show `$0` / `0` / placeholder text. Wire up:
- `task_queue` widget → query Tasks where status=running/pending, filtered by playground members
- `project_pipeline` widget → query Projects linked to this playground's teams
- `revenue_mtd` and `invoices_pending` → query UserCredits / plan outputs (or leave as TODO if billing not wired)

### 4. LLM Provider Settings UI
Provider adapter system exists in `lib/providers/`. No UI to manage API keys or switch providers per team. Build a settings panel under `/settings` or `/agent-lab`.

---

## What's Deployed (as of Session 14 — all live ✅)

### Core Platform
- Teams (workspace tabs), Agents, Skills, Chat (streaming, 25-iteration tool loop), Tools
- 2nd Brain: vault, MCP endpoint, graph, search, brain chunks + HNSW index
- Plans system: create → council → approve at /plans → dispatch → execute
- LLM Provider adapter system
- Self-registration, credit gate UI, admin credits panel
- Mobile-first UI, Design System v3 (charcoal + blue-cyan)
- Brain network logo, PWA icons, manifest.webmanifest

### Coordinator & Delegation
- **Playground Teams Hub** (`/playground`) — create teams, chat with agent groups, LLM-powered configure panel
- **Admin Panel** (`/admin`) — analytics, API monitor (client CRUD, key rotation, per-client stats)
- **Delegation fully wired** — `delegate_to_team` executes, `run_plan` + `get_task_result` tools live
- **Phase C2** — 8 business skills + UI/UX Pro Max + MarkItDown auto-convert
- **Phase C4** — MCP expansion: `list_teams`, `ask_team`, `run_agent`, `create_task`, `list_tasks`, `search_brain`
- **Phase C5** — `COORDINATOR_INTRO` fully expanded with tool catalog + decision table

### Session 14 (newly deployed)
- **Live agent activity strip** — coordinator chat shows which agent team is running + task title in real time via SSE; auto-clears on done/error/blocked
- **`request_human_input` tool** — delegated agents can pause mid-task to surface a question to the user; coordinator receives it and asks; "needs input" badge shown in activity strip
- **Structured failure recovery** — `delegate_to_team` returns `tried` + `recovery` fields on error so coordinator reasons about next steps (retry, reroute, install skill)
- **Playground creation: Agent Teams** — "New Playground" modal now selects whole Agent Teams (not individual agents); Team → Agents hierarchy with expand/collapse; group auto-set to team name

### Session 13 (deployed)
- Playground redesign — no emojis, group terminology, tabbed workspace: Dashboard | Chat | [Group tabs] | Configure
- Widget grid (add/remove/reorder, persists to `team.config`) with Business + Crypto widget library
- `PlaygroundMember.group` field live in DB (migration confirmed in sync)
- Crypto Wallet Management scaffold (3 agents + 3 skills, awaits env vars)

### Not Built Yet ❌
- P5: Project status dashboard + `get_project_status` tool
- P6: Telegram DM + group notifications + settings UI
- Real widget data (task_queue, project_pipeline live queries)
- Google/Microsoft integrations (C3) — needs OAuth setup
- LLM Provider Settings UI
- Stripe payment automation
- Landing page Brain section (Block G)
- Live blockchain integration for Crypto Wallet (scaffold only)
- Empty states (Plans, Teams, Brain, Schedule)

---

## Architecture Quick Reference

| Thing | Where |
|---|---|
| VPS IP | 95.217.163.247 |
| App path on VPS | `/root/opt/vps/` |
| Deploy | `scp` files → `docker compose ... up -d --build dashboard` |
| Git remote | github.com/augustom1/agentplayground-vpsinstall |
| Admin panel | `/admin` → requires `role = "admin"` in DB |
| Playground Teams | `/playground` + `/playground/[teamId]` |
| Playground API | `/api/playground/teams/...` |
| Admin API | `/api/admin/analytics/...` + `/api/admin/api-monitor/...` |
| Agent runner | `lib/agents/runner.ts` (full tool loop, 10 iter) |
| Delegated runner | `lib/agents/delegated.ts` (haiku, team-scoped tools, checkpoint aware) |
| Plan dispatcher | `lib/planner/dispatch.ts` |
| Chat tools | `lib/chat-tools.ts` (28 tools incl. request_human_input) |
| SSE stream | `GET /api/notify/stream` — events: TASK_STARTED, TASK_DONE, MISSING_INFO, ERROR, PLAN_DONE |
| Activity strip | `app/(app)/chat/page.tsx` → `activeAgents` state + EventSource hook |
| Human checkpoint | `request_human_input` tool → `delegated.ts` intercepts → `NEEDS_HUMAN_INPUT:` result |
| API logger HOF | `lib/api-logger.ts` — wrap routes with `withApiLogger()` |
| Default skills | `lib/default-skills.ts` |
| MCP endpoint | `app/api/mcp/route.ts` |
| Council logic | `lib/council/index.ts` |
| Design tokens | `app/globals.css` — all `var(--color-*)` |
| Wallet addresses | `app/(app)/billing/page.tsx` WALLETS constant |

### Coordinator Flow
```
You: "Build X and deploy it"

Coordinator (25 iterations):
  → create_plan("Build X")          [drafts tasks per team, council reviews]
  → run_plan(planId)                 [auto-approves, dispatches in parallel]
     Dev team (10 iter): tool loop → vps_exec, write_file, etc.
     Research team (10 iter): web_search, vault_write, etc.
  → get_task_result(devTaskId)       [read what dev team produced]
  → synthesizes reply to you

If a team needs human input mid-task:
  → request_human_input("What is the API key?")
  → coordinator surfaces question to you in chat
  → you answer → coordinator re-delegates with answer in description
```

---

## Billing & Business Status

| Phase | Status |
|---|---|
| Credit Gate (schema + UI) | ✅ Done — not enforced |
| Admin Credits Panel | ✅ Done |
| Crypto payment UI (USDT/USDC) | ✅ Done — manual verification |
| Stripe payment automation | ❌ Needs keys |
| Monthly Credit Reset | ❌ Not started |

Update wallet addresses: `app/(app)/billing/page.tsx` → `WALLETS` constant.

---

## Quick Commands

```bash
# Dev
npm run dev

# Prisma
npx prisma generate
npx prisma db push

# Deploy (always scp — git pull is broken on server)
scp -i ~/.ssh/id_ed25519 <file> root@95.217.163.247:/root/opt/vps/<path>
ssh -i ~/.ssh/id_ed25519 root@95.217.163.247 \
  "cd /root/opt/vps && docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build dashboard"

# Set admin role in DB
ssh -i ~/.ssh/id_ed25519 root@95.217.163.247 \
  "cd /root/opt/vps && docker compose exec db psql -U \$POSTGRES_USER -d \$POSTGRES_DB -c \"UPDATE users SET role='admin' WHERE email='augustojmeyer@gmail.com';\""
```

---

## Session History (condensed)

| Session | What |
|---|---|
| 1-4 | Core platform: teams, agents, skills, chat, files, schedule, billing schema |
| 5-6 | 2nd Brain (vault + pgvector), MCP endpoint, Brain page, Telegram pipeline |
| 7-8 | Plans system, council, planner, dispatcher, provider adapter, SSE, /plans UI |
| 9 | PWA, agent editor, design system v1+v2 |
| 10 | Ollama tool loop, council_reason/vps_exec/convert_to_markdown tools, Design System v3 |
| 11 | Phase A (Playground Teams Hub), Phase B (Admin Panel), Phase C1 (delegation wired) |
| 12 | Phase C2 (8 business skills + UI/UX Pro Max + MarkItDown auto-convert), Phase C5 (expanded coordinator) |
| 13 | Playground redesign (no emoji, groups, tabbed Dashboard/Chat/Groups), widget system, Crypto Wallet scaffold, Phase C4 (MCP expansion) |
| 14 | P1 live agent activity strip (SSE), P2+P3 request_human_input + checkpoint + failure recovery, P4 playground creation selects Agent Teams |

Full history → `docs/SESSION-HISTORY.md`
