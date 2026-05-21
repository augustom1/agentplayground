# Session Handoff
> Last updated: 2026-05-22 (Session 12 — deployed)
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

### 1. New Concept (user to fill in)
> **[Describe your new concept here before next session starts.]**
> This should be the first thing tackled — it's the user's new idea.

### 2. Phase C3 — Google & Microsoft as Chat Tools
- `lib/integrations/google/` — Gmail search/send, Calendar list/create, Drive search/read
- `lib/integrations/microsoft/` — Outlook send, OneDrive search/read, Teams webhook
- Wire as tools in `lib/chat-tools.ts` + add OAuth token storage (encrypted, `OAuthToken` table or in `ApiClient`)
- Needs OAuth setup on Google Cloud Console and Azure Portal first

### 4. Phase C4 — Claude Desktop via MCP
- Add all 26+ chat tools to `/api/mcp/route.ts` (currently only vault tools)
- Wire `ask_team`, `run_agent`, `search_brain`, `create_task` as MCP-callable tools
- Update Claude Desktop config (`%APPDATA%\Claude\claude_desktop_config.json`) to point at `https://app.agentplayground.net/api/mcp`
- Auth: use `ApiClient` of type `CLAUDE_MOBILE` (tracked in API Monitor)

### 5. Phase C5 — Expand Coordinator System Prompt
- Update `COORDINATOR_INTRO` in `app/api/chat/route.ts` to document all new capabilities
- Document skill catalog, Google/MS tools, MarkItDown behavior, MCP external callers, VPS exec policy

---

## What's Deployed (as of Session 12)

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

### Not Built Yet ❌
- Google/Microsoft integrations (C3)
- MCP endpoint full tool exposure (C4)
- OAuthToken storage table
- Frontend SSE listener for plan/task events (real-time progress)
- LLM Provider Settings UI
- Marketplace (docs/MARKETPLACE-PLAN.md)
- Stripe payment automation
- Landing page Brain section (Block G)
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

Full history → `docs/SESSION-HISTORY.md`
