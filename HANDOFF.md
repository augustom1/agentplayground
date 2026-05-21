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

## Current Session — 2026-05-21 (session 9) — LOCAL ONLY, NEEDS DEPLOY

### What was built

#### 1. New Logo — Brain Network
Replaced the asterisk/play-button mark with a **brain + 3 nodes** minimalist SVG.
Brain outline with center division, 3 satellite nodes connected via subtle lines, all in rust `#D4715A`.

**Files changed:**
- `components/Logo.tsx` — new `BrainNetwork` component (32×32 viewBox, all variants)
- `public/icons/icon.svg` — 512×512 version on dark charcoal background (`#1a1a1a`)
- `public/icons/icon-192.png` — regenerated via sharp
- `public/icons/icon-512.png` — regenerated via sharp
- `public/icons/apple-touch-icon.png` — regenerated (iPhone "Add to Home Screen")
- `public/icons/favicon-32.png` — regenerated (browser tab)
- `public/manifest.webmanifest` — **created** (was missing entirely — PWA install was broken)

#### 2. Model Dropdown — Centered Modal + Collapsible Context
Problem: popup anchored to button clipped off screen on mobile and was unusable with many agents.

**Fix:** replaced anchored dropdown with a **centered fixed modal** + dark backdrop.
- Opens centered on screen regardless of trigger position
- Backdrop click + Escape key to close
- **Context section is now collapsible** — shows current team name inline when collapsed; click to expand scrollable agent list (max 220px with overflow scroll)
- Width: `min(320px, calc(100vw - 32px))` — safe on any screen

**Files changed:**
- `app/(app)/chat/page.tsx` — `ModelDropdown` component rewritten

#### 3. Mobile Centering Fixes
- Message bubble horizontal padding: `24px → 12px`
- Bottom input bar padding: `24px → 12px`
- Greeting heading: `32px fixed → clamp(22px, 5vw, 30px)`
- Empty state padding adjusted for notched phones (`padding: "16px 16px 32px"`)

**Deploy:** ❌ NOT YET deployed — git commit + scp pending

---

### Previous sessions (already deployed)

**Session 8b/8c:** Design System v3 (charcoal tokens) + Sidebar v2 — ✅ DEPLOYED
**Session 6:** Workspace tabs in Agent Teams — ✅ DEPLOYED

---

## Next Session — Priority Order

### 0. DEPLOY SESSION 9 FIRST ← DO THIS BEFORE ANYTHING ELSE

```bash
# From local machine:
scp -i ~/.ssh/id_ed25519 \
  components/Logo.tsx \
  "app/(app)/chat/page.tsx" \
  public/icons/icon.svg \
  public/icons/icon-192.png \
  public/icons/icon-512.png \
  public/icons/apple-touch-icon.png \
  public/icons/favicon-32.png \
  public/manifest.webmanifest \
  root@95.217.163.247:/root/opt/vps/...

ssh -i ~/.ssh/id_ed25519 root@95.217.163.247 \
  "cd /root/opt/vps && docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build dashboard"
```

No schema changes — no `prisma db push` needed.

### 1. UI/UX — Remaining Pages Audit (1-2h)
Pages still using hardcoded Tailwind gray classes (`text-gray-*`, `bg-gray-*`):
- `app/(app)/blog/page.tsx` — still uses `text-gray-100`, `bg-gray-800` etc
- `app/(app)/dashboard/page.tsx` — has `bg-gray-*` widget cards
- Run: `grep -r "text-gray-\|bg-gray-" app/` to find all remaining instances
Goal: all pages use `var(--color-*)` tokens consistently

### 2. Empty States (30min)
Add proper empty states to: Plans, Teams, Brain, Schedule pages.
Use `<LogoMark size={40} />` + helpful message + CTA button pattern.

### 3. LLM Provider Settings UI (1-2h)
Build the settings UI to configure which LLM is used for each role.
**File:** `app/(app)/settings/page.tsx` — add "Providers" tab
**Existing API:** `GET/POST/DELETE /api/llm-providers` (fully wired, no UI yet)

### 4. Frontend SSE listener (30min)
Connect `/api/notify/stream` to a toast/banner in the chat page.
Add `EventSource` in `chat/page.tsx` useEffect.

### 5. Marketplace (4-6h)
Approved plan at `docs/MARKETPLACE-PLAN.md`.

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
- Design System v3: charcoal tokens, Sidebar v2

### Built locally, NOT YET deployed ⏳
- Brain network logo (replaces asterisk/play-button)
- All PWA icons regenerated (192, 512, apple-touch, favicon-32)
- `manifest.webmanifest` created (PWA install was broken without it)
- Model dropdown: centered modal + collapsible context section
- Mobile centering fixes (padding, clamp font size)

### Built but needs UI ⚠️
- LLM Provider config (`/api/llm-providers` live, no UI) — **next priority**
- SSE notifications received by backend, no frontend EventSource listener

### Not built yet ❌
- LLM Provider Settings UI (Providers tab in Settings)
- Marketplace (`docs/MARKETPLACE-PLAN.md` approved)
- Stripe payment automation
- Landing page Brain section (Block G)
- Admin monitoring panel
- Frontend SSE listener
- Empty states (Plans, Teams, Brain, Schedule)

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
