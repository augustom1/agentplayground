# Session Handoff
> Last updated: 2026-05-21
> Read this at the start of every session BEFORE reading CLAUDE.md.
> Update the "Current Session" block when ending a session.

---

## How to use this file

1. Read **Current Session** — what was just done and what's next
2. Read **Billing Plan** — the priority path to charging customers
3. Skim **State Snapshot** — what's live vs. not built
4. Then open CLAUDE.md for architecture/env/command reference
5. Full session history → `docs/SESSION-HISTORY.md`

---

## Current Session — 2026-05-21 (session 7) ✅ DEPLOYED

### What was built — Design System v2 (full UI/UX redesign)

Complete visual overhaul replacing the indigo/violet brand identity with a
**warm copper ops palette** inspired by Claude Desktop.

**Design philosophy:** Warm dark (not pure black), earthy neutrals, single
copper brand accent `#cf8c4a` — feels like precision instrumentation, not a
generic chat app.

**Files changed (19 files, fully deployed):**
- `app/globals.css` — complete token rewrite: surfaces, borders, text, brand,
  shadows, radii, transitions. Dark default + warm cream light mode.
- `components/Logo.tsx` — CSS-var auto-themed copper node-graph SVG; exports
  `LogoMark` (auto), `LogoMarkDark`, `LogoMarkLight` (pinned)
- `components/Sidebar.tsx` — 216px wide, wordmark next to mark, copper active bar
- `app/(auth)/login/page.tsx` — LogoMark replaces Bot icon, warm form
- `components/UserMenu.tsx` — brand-muted border
- `components/ToastProvider.tsx` — info toast uses brand-dim/muted
- `app/(app)/chat/page.tsx` — coordinator + tool badge copper
- `app/(app)/dashboard/page.tsx` — optimization widget copper
- `app/(app)/billing/page.tsx` — stat card accents → CSS vars
- `app/(app)/agent-lab/page.tsx` — all workspace/badge indigo → brand vars
- 9 other pages: connect, executor, files, optimize, plans, projects,
  schedule, settings, tools — global indigo sweep → CSS vars

**Key design tokens:**
```css
--color-background:   #17150f   (warm near-black)
--color-surface:      #1d1b13   (sidebar / primary card)
--color-surface-2:    #242118   (elevated card)
--color-brand:        #cf8c4a   (copper accent)
--color-brand-dim:    rgba(207,140,74,0.12)
--color-brand-muted:  rgba(207,140,74,0.35)
--color-text:         #f0ece3   (warm off-white)
```

**Deploy:** ✅ git pushed + VPS deployed (container rebuilt, schema in sync)

---

### Also deployed in this push — session 6 files (workspace tabs)

Session 6 files were pending deploy. Bundled together with session 7:
- `prisma/schema.prisma` — `category` field on `AgentTeam`
- `lib/chat-tools.ts` — `create_team` accepts `category`
- `app/api/teams/route.ts` — POST accepts `category`
- `app/(app)/agent-lab/page.tsx` — workspace tab bar (also updated for copper)

Schema was already in sync on VPS (auto-migrated on previous container start).

---

## Next Session — Priority Order

### 1. LLM Provider Settings UI (1-2h) ← START HERE
Build the settings UI to configure which LLM is used for each role.
This unlocks the "route to local Ollama after first API run" feature.

**Files to edit:**
- `app/(app)/settings/page.tsx` — add "Providers" tab

**UI needed:**
- List current providers (type, role, isDefault badge)
- "Add provider" form: name, type, baseUrl (for ollama/custom), API key
  (password field), role dropdown, set-as-default toggle
- Delete button per provider
- Quick-add: "Use Anthropic from env" + "Use local Ollama"

**Existing API:** `GET/POST/DELETE /api/llm-providers` (fully wired)

### 2. Marketplace (4-6h)
Approved plan at `docs/MARKETPLACE-PLAN.md`.
- `data/packages/*.json` — 8 package JSON files
- `app/(app)/marketplace/page.tsx` — browse + install UI
- `app/api/marketplace/route.ts` + `app/api/marketplace/install/route.ts`
- Add Marketplace link to Sidebar (ShoppingBag icon)

### 3. UX Phase 2 (1h)
- Empty states on Plans, Teams, Brain, Schedule
- Plain English audit (remove "pipeline", "vault_notes" jargon)
- `docs/UX-REDESIGN-PLAN.md`

### 4. PWA PNG icons
Generate from `public/icons/icon.svg` at 180×180, 192×192, 512×512px.

### 5. Frontend SSE listener
Connect `/api/notify/stream` to a toast/banner in the chat page.
File: `app/(app)/chat/page.tsx` — add `useEffect` with EventSource.

### 6. Landing page Block G
Brain section + updated pricing + blog link.

---

## Billing Plan — Path to Charging Customers

### Phase 1 — Credit Gate ✅ DONE
### Phase 2 — Admin Credits Panel ✅ DONE
### Phase 3 — Payment Flow (half day) — NOT STARTED
- Option A: Stripe — get keys → add `STRIPE_SECRET_KEY` + `STRIPE_WEBHOOK_SECRET`
- Option B: Crypto manual (current) — UI done, manual verification
### Phase 4 — Monthly Credit Reset — NOT STARTED
Add to `/api/cron` on 1st of month.

---

## Architecture Quick Reference

### Plans System
```
User goal → POST /api/plans
  → lib/planner/builder.ts (Keeper + Council)
  → Plan{status: PENDING_APPROVAL} + PlanTasks in DB
  → User reviews at /plans/[id]
  → POST /api/plans/[id]/approve {action: "approve"}
  → lib/planner/dispatch.ts (topological batching)
  → lib/agents/runner.ts per task (RAG + provider routing)
  → Task results saved, SSE events streamed
```

### Provider Routing
```
getProvider("agent") → DB lookup (llm_providers where role=agent AND isDefault=true)
  → if found: build AnthropicProvider/OpenAIProvider/OllamaProvider from DB row
  → if not: fall back to env var ANTHROPIC_API_KEY
runAgentTask() checks TaskProtocol (Ollama local) first → if match: use OllamaProvider (free)
```

### Brain Pipeline
```
ingestToBrain({content, title, source, sourceType})
  → SHA-256 dedup → splitIntoChunks() (400-600 tokens)
  → embed via nomic-embed-text → upsert brain_chunks
queryBrain({query, topK}) → pgvector cosine + recency boost
```

### Design System
All tokens in `app/globals.css` under `@theme inline`. Light mode via `[data-theme="light"]`.
Brand accent = copper. Never hardcode rgba(99,102,241,*) or #a78bfa anywhere.
Logo auto-themes via `var(--color-surface)` / `var(--color-brand)` in SVG fills.

---

## State Snapshot

### Live on VPS ✅
- Core platform: Teams (with workspace tabs), Agents, Skills, Chat, Tools
- 2nd Brain: vault, MCP, graph, search
- Plans system: create → council → approve → dispatch → execute
- Brain chunking pipeline + HNSW index
- LLM Provider adapter system (API only, no UI)
- SSE notification stream (backend only, no frontend listener)
- Self-registration, credit gate, admin credits panel
- Mobile-first UI (bottom nav, responsive)
- **Design System v2: warm copper palette, new Logo, all pages updated**

### Built but needs UI ⚠️
- LLM Provider config (`/api/llm-providers` live, no UI) — **next priority**
- SSE notifications received by backend, no frontend EventSource listener

### Not built yet ❌
- LLM Provider Settings UI (Providers tab in Settings)
- Marketplace (`docs/MARKETPLACE-PLAN.md` approved)
- Stripe payment automation
- Landing page Brain section (Block G)
- Admin monitoring panel
- PNG icons for PWA
- Frontend SSE listener

---

## Quick Reference

| Thing | Where |
|---|---|
| VPS IP | 95.217.163.247 |
| App path on VPS | `/root/opt/vps/` |
| Deploy | scp files → `docker exec vps-dashboard npx prisma db push` → rebuild |
| Git remote | github.com/augustom1/agentplayground-vpsinstall |
| Wallet addresses | `app/(app)/billing/page.tsx` WALLETS constant |
| Marketplace plan | `docs/MARKETPLACE-PLAN.md` |
| Full task queue | `docs/MASTER-TODO.md` |
| Session history | `docs/SESSION-HISTORY.md` |
| Plans UI | `/plans` → `/plans/[id]` |
| Provider config API | `GET/POST/DELETE /api/llm-providers` |
| SSE stream | `GET /api/notify/stream` (text/event-stream) |
| Design tokens | `app/globals.css` — all `var(--color-*)` |
