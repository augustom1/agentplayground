# Session Handoff
> Last updated: 2026-05-22 (Session 13 — DEPLOYED ✅)
> Read this at the start of every session BEFORE reading CLAUDE.md.
> Update the "Current Session" block when ending a session.

---

## How to use this file

1. Read **Next Session** — what to build and any new concepts to explore
2. Read **State Snapshot** — what's live vs. not built
3. Read **Architecture Quick Reference** — where things live
4. Then open CLAUDE.md for env/command reference and NEXT-STEPS.md for the full roadmap

---

## Next Session Priority

### 0. PENDING — Run schema migration on VPS (one command)
The `group` column on `playground_members` is not yet in the live DB.
Run this once (type `! <command>` in Claude Code prompt to execute):
```bash
ssh -i ~/.ssh/id_ed25519 root@95.217.163.247 \
  "cd /root/opt/vps && docker compose exec dashboard npx prisma db push --accept-data-loss"
```
This is safe — adds a nullable column, no data is dropped.

### 1. Evaluation & Adjustment (next session focus)
User will evaluate the live app at https://app.agentplayground.net and report:
- What works well → keep / reinforce
- What feels wrong → fix before continuing
- Missing UX gaps → address immediately
- New ideas → spec and build

**Things likely to surface:**
- Playground Dashboard empty state (no widgets show real data yet)
- Group assignment flow (only set at creation — no inline reassign yet)
- Chat tab needs agent context shown more clearly
- Widget re-ordering (move up/down is minimal — consider drag)
- Empty states for Plans, Brain, Teams

### 2. After evaluation — pending features
- Phase C3: Google/Microsoft as chat tools (needs OAuth setup first)
- Crypto Wallet group activation (set env vars, wire to playground)
- Claude Desktop → MCP: create ApiClient key in Admin → API Monitor, update desktop config
- LLM Provider Settings UI
- Real widget data (tasks completed, projects, revenue) via API endpoints

### 3. Schema migration still needed
See item 0 above — run `prisma db push` on VPS.

---

## What's Deployed (as of Session 13)

### Live on VPS ✅
- Core platform: Teams (workspace tabs), Agents, Skills, Chat (streaming, 25-iteration tool loop), Tools
- 2nd Brain: vault, MCP endpoint, graph, search, brain chunks + HNSW index
- Plans system: create → council → approve at /plans → dispatch → execute
- LLM Provider adapter system
- Self-registration, credit gate UI, admin credits panel
- Mobile-first UI, Design System v3 (charcoal + blue-cyan)
- Brain network logo, PWA icons, manifest.webmanifest
- **Playground Teams Hub** (`/playground`) — create teams, chat with agent groups, LLM-powered configure panel
- **Admin Panel** (`/admin`) — analytics (self-hosted, recharts), API monitor (client CRUD, key rotation, per-client stats), admin guard
- **Delegation fully wired** — `delegate_to_team` executes, `run_plan` + `get_task_result` tools live, coordinator limit = 25
- **Analytics beacon** — fires pageview + duration on every page load
- Ollama tool loop, `council_reason`, `vps_exec`, `convert_to_markdown` tools
- **Phase C2** — 8 business skills (Invoice, CRM, Proposal, Onboarding, Status Reporter, Meeting Summarizer, Sales Email, Support Ticket) + UI/UX Pro Max skill in `lib/default-skills.ts`
- **MarkItDown auto-convert** — `.xlsx/.docx/.pptx/.pdf/.csv` files auto-convert + Brain-index on upload (fire-and-forget)
- **Phase C5** — `COORDINATOR_INTRO` fully expanded: tool catalog, business skills, decision table, VPS exec policy, MCP note

### Session 13 — DEPLOYED ✅ (schema migration still pending — see Next Session #0)
- **Playground redesign** — all emojis removed, "group" terminology, "New Playground" button
- **PlaygroundMember.group** field in schema ⚠️ `prisma db push` not yet run on live DB
- **Playground listing** — cards show named groups co-located, colored left border accent
- **Playground workspace** — tabbed UI: Dashboard | Chat | [Group tabs] | Configure
- **Dashboard tab** — widget grid (sm/md/lg), add/remove/reorder, persists to `team.config`
- **Widget library** — Core + Business (revenue, invoices, pipeline) + Crypto (balances, transfers, queue)
- **Group drilldown tabs** — per-group agent list, stats, crypto wallet info block
- **Crypto Wallet Management scaffold** — 3 agents + 3 skills in `lib/default-skills.ts`
- **Phase C4 — MCP expansion** — `list_teams`, `ask_team`, `run_agent`, `create_task`, `list_tasks`, `search_brain`

### Not Built Yet ❌
- Google/Microsoft integrations (C3) — needs OAuth setup
- OAuthToken storage table
- Frontend SSE listener for plan/task events (real-time progress)
- LLM Provider Settings UI
- Marketplace (docs/MARKETPLACE-PLAN.md)
- Stripe payment automation
- Landing page Brain section (Block G)
- Empty states (Plans, Teams, Brain, Schedule)
- Live blockchain integration for Crypto Wallet (scaffold only)

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
| Delegated runner | `lib/agents/delegated.ts` (haiku, team-scoped tools) |
| Plan dispatcher | `lib/planner/dispatch.ts` |
| Chat tools | `lib/chat-tools.ts` (27 tools incl. run_plan, get_task_result) |
| API logger HOF | `lib/api-logger.ts` — wrap routes with `withApiLogger()` |
| Analytics helpers | `lib/analytics.ts` — parseUA, anonymizeIp, getCountry |
| VPS SSH utility | `lib/tool-installer/installer.ts` → `runArbitraryCommand` |
| Default skills | `lib/default-skills.ts` |
| MCP endpoint | `app/api/mcp/route.ts` |
| Council logic | `lib/council/index.ts` |
| SSE stream | `GET /api/notify/stream` |
| Design tokens | `app/globals.css` — all `var(--color-*)` |
| Wallet addresses | `app/(app)/billing/page.tsx` WALLETS constant |

### Coordinator Flow (now fully wired)
```
You: "Build X and deploy it"

Coordinator (25 iterations):
  → create_plan("Build X")          [drafts tasks per team, council reviews]
  → run_plan(planId)                 [auto-approves, dispatches in parallel]
     Dev team (10 iter): tool loop → vps_exec, write_file, etc.
     Research team (10 iter): web_search, vault_write, etc.
  → get_task_result(devTaskId)       [read what dev team produced]
  → get_task_result(researchTaskId)  [read what research team produced]
  → synthesizes reply to you
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
| 11 | **Phase A** (Playground Teams Hub), **Phase B** (Admin Panel), **Phase C1** (delegation wired) |
| 12 | **Phase C2** (8 business skills + UI/UX Pro Max + MarkItDown auto-convert), **Phase C5** (expanded coordinator) |
| 13 | **Playground redesign** (no emoji, groups, tabbed Dashboard/Chat/Groups), **widget system**, **Crypto Wallet scaffold**, **Phase C4** (MCP expansion) |

Full history → `docs/SESSION-HISTORY.md`
