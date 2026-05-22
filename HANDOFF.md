# Session Handoff
> Last updated: 2026-05-22 (Session 13 — local, needs deploy)
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

### 2. Deploy Session 13
```bash
# Push schema change (adds group column to playground_members)
npx prisma db push

# scp changed files to VPS then rebuild
scp -i ~/.ssh/id_ed25519 app/(app)/playground/page.tsx root@95.217.163.247:/root/opt/vps/app/(app)/playground/page.tsx
scp -i ~/.ssh/id_ed25519 "app/(app)/playground/[teamId]/page.tsx" root@95.217.163.247:"/root/opt/vps/app/(app)/playground/[teamId]/page.tsx"
scp -i ~/.ssh/id_ed25519 app/api/mcp/route.ts root@95.217.163.247:/root/opt/vps/app/api/mcp/route.ts
scp -i ~/.ssh/id_ed25519 lib/default-skills.ts root@95.217.163.247:/root/opt/vps/lib/default-skills.ts
scp -i ~/.ssh/id_ed25519 prisma/schema.prisma root@95.217.163.247:/root/opt/vps/prisma/schema.prisma
```

### 3. Phase C3 — Google & Microsoft as Chat Tools
- Needs OAuth setup on Google Cloud Console and Azure Portal first
- `lib/integrations/google/` — Gmail search/send, Calendar list/create, Drive search/read
- Wire as tools in `lib/chat-tools.ts` + add OAuth token storage (encrypted)

### 4. Activate Crypto Wallet Group
- Create the group via coordinator: "Create the Crypto Wallet Management group in Agent Lab"
- Set env vars: `WALLET_INBOUND_ADDRESS`, `WALLET_TRANSFER_ENDPOINT`, `WALLET_API_PROVIDER`
- Add the group to a Playground to get the crypto dashboard widgets

### 5. Update Claude Desktop config for MCP
- Point `%APPDATA%\Claude\claude_desktop_config.json` at `https://app.agentplayground.net/api/mcp`
- Auth: create an `ApiClient` of type `CLAUDE_MOBILE` in Admin → API Monitor → get key

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

### Session 13 (local — needs deploy) ✅
- **Playground redesign** — all emojis removed, "group" terminology, "New Playground" button
- **PlaygroundMember.group** field added to schema (needs `prisma db push` on VPS)
- **Playground listing** — cards show named groups co-located, colored left border accent
- **Playground workspace** — tabbed UI: Dashboard | Chat | [Group tabs] | Configure
- **Dashboard tab** — widget grid (sm/md/lg cells), add/remove/reorder widgets, auto-saves to team config
- **Widget library** — Business (revenue, invoices, pipeline, tasks) + Crypto (balances, transfers, settlement queue) + Core (agents, groups, conversations)
- **Group drilldown tab** — per-group agent list, stats row, crypto wallet info block if wallet-named group
- **Crypto Wallet Management scaffold** — 3 agents (Monitor, Router, Settlement), 3 skills, exported as `CRYPTO_WALLET_TEAM` in `lib/default-skills.ts`
- **Phase C4 — MCP expansion** — `list_teams`, `ask_team`, `run_agent`, `create_task`, `list_tasks`, `search_brain` added to `/api/mcp/route.ts` (was vault-only)

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
