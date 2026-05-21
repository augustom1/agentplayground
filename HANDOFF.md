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

## Current Session — 2026-05-21 (session 8) — LOCAL ONLY, NEEDS DEPLOY

### What was built — Design System v3 (Claude Desktop-inspired redesign)

Complete redesign replacing the "warm copper/sepia" v2 palette with a
**neutral dark charcoal aesthetic** directly inspired by Claude Desktop's UI.

**Design philosophy:** Near-neutral dark charcoal (not brown/sepia), clean
neutral grays for all UI chrome, single rust accent `#D4715A` used ONLY for
the logo asterisk and brand moments — everything else neutral.

**Files changed:**
- `app/globals.css` — complete token overhaul: charcoal surfaces, neutral text
  hierarchy, rust brand accent used sparingly
- `components/Logo.tsx` — replaced node-graph with Anthropic-style 8-pointed
  asterisk in rust/coral (`var(--color-brand)`)
- `components/Sidebar.tsx` — Claude Desktop-style: "New chat" button, clean
  nav items with section labels, no active color bar
- `app/(app)/chat/page.tsx` — Claude Desktop empty state: centered greeting
  "Good [time], [Name]" + asterisk logo, suggestions chips, clean input box
  at bottom, config row moved to slim top bar
- `app/(app)/blog/page.tsx` — removed hardcoded indigo-400 classes
- `app/(app)/files/page.tsx` — removed hardcoded violet classes → CSS vars
- `app/(app)/stack/page.tsx` — removed hardcoded #8b5cf6 → CSS var

**Key design tokens (v3):**
```css
--color-background:  #1a1a1a   (neutral dark charcoal)
--color-surface:     #222222   (sidebar/panel)
--color-surface-2:   #2a2a2a   (card/input bg)
--color-surface-3:   #323232   (hover/code block)
--color-brand:       #D4715A   (rust/coral — logo only)
--color-text:        #efefef   (near-white)
--color-text-secondary: #aaaaaa
--color-muted:       #666666
```

**Deploy:** ✅ DEPLOYED — git pushed + VPS rebuilt (session 8b)

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

### 1. ✅ DEPLOYED — Design System v3 (session 8b)

### 2. UI/UX — Remaining Pages Audit ← START HERE
- `app/globals.css`
- `components/Logo.tsx`
- `components/Sidebar.tsx`
- `app/(app)/chat/page.tsx`
- `app/(app)/blog/page.tsx`
- `app/(app)/files/page.tsx`
- `app/(app)/stack/page.tsx`

```bash
scp -i ~/.ssh/id_ed25519 app/globals.css components/Logo.tsx components/Sidebar.tsx \
  root@95.217.163.247:/root/opt/vps/app/...
ssh root@95.217.163.247 "cd /root/opt/vps && docker compose ... up -d --build dashboard"
```

### 2. UI/UX — Remaining Pages Audit (1-2h)
Pages that still use hardcoded gray Tailwind classes (`text-gray-*`, `bg-gray-*`)
and need to be migrated to CSS var tokens:
- `app/(app)/blog/page.tsx` — still uses `text-gray-100`, `bg-gray-800` etc
- Any other pages with old Tailwind color classes (run grep for `text-gray-`)
Goal: all pages use `var(--color-*)` tokens consistently

### 3. Dashboard Page Cleanup (1h)
The dashboard still uses some `bg-gray-*` classes. Migrate to CSS vars
and review widget card visual quality against the new design system.

### 4. Empty States (30min)
Add proper empty states to: Plans, Teams, Brain, Schedule pages
Use the LogoMark asterisk + helpful message + CTA button pattern.

### 5. PWA Icons
Generate `public/icons/icon-192.png`, `icon-512.png`, `apple-touch-icon.png`
from the new asterisk logo SVG.

### 6. LLM Provider Settings UI (1-2h)
Build the settings UI to configure which LLM is used for each role.
**File:** `app/(app)/settings/page.tsx` — add "Providers" tab
**Existing API:** `GET/POST/DELETE /api/llm-providers` (fully wired)

### 7. Marketplace (4-6h)
Approved plan at `docs/MARKETPLACE-PLAN.md`.

### 8. Frontend SSE listener
Connect `/api/notify/stream` to a toast/banner in the chat page.

### 9. Landing page Block G
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
