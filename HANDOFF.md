# Session Handoff
> Last updated: 2026-05-20
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

## Current Session — 2026-05-20 (session 5) ✅ COMPLETE + DEPLOYED

### What was built and is now live on VPS

Full implementation of `agent-playground-spec.md`:

**DB (all tables live):**
- `plans` + `plan_tasks` — Plan system replacing Projects as AI-driven work unit
- `brain_documents` + `brain_chunks` — chunked RAG store (768-dim, HNSW index created)
- `llm_providers` — DB-stored LLM configs with AES-256-GCM encrypted API keys
- `app_notifications` — SSE-ready in-app events

**LLM Provider system (`lib/providers/`):**
- Unified adapter: AnthropicProvider, OpenAIProvider, OllamaProvider
- `getProvider(role)` — selects from DB or env-var fallback per role (keeper/agent/embed/council)
- `encryptApiKey` / `decryptApiKey` — for secure key storage

**Brain pipeline:**
- `lib/brain/ingest.ts` — recursive chunker (400-600 tokens, 10% overlap), SHA-256 dedup, BrainChunk upsert
- `lib/brain/query.ts` — `queryBrain()` with cosine similarity + recency boost + metadata filters
- `lib/brain/index.ts` — `indexVaultNote()` now bridges into BrainChunks (vault → agent RAG)

**Intelligence layer:**
- `lib/council/index.ts` — 2-round Council debate, amendment + risk flag extraction
- `lib/planner/builder.ts` — Keeper prompt, goal → Plan + PlanTasks + Council integration
- `lib/planner/dispatch.ts` — topological sort, parallel task batching, fire-and-forget
- `lib/agents/runner.ts` — RAG-injected runner, checks TaskProtocol for local Ollama routing
- `lib/notify/sse.ts` — EventEmitter + SSE ReadableStream + heartbeat

**API:** `/api/plans`, `/api/plans/[id]`, `/api/plans/[id]/approve`, `/api/notify/stream`, `/api/llm-providers`

**UI:** `/plans` (list + inline create) and `/plans/[id]` (approval gate, task accordion, Council notes, progress bar). Plans link in Sidebar + MobileNav.

**Chat:** `create_plan` tool added — coordinator calls this for multi-team goals.

### The Plans flow (end-to-end)
1. User types goal in Chat → coordinator calls `create_plan` tool
2. Keeper (Claude) drafts Plan + PlanTasks with team assignments
3. Council runs 2-round debate → folds in amendments + risk flags
4. Plan saved as `PENDING_APPROVAL` → chat returns link to `/plans/{id}`
5. User reviews task list, risk flags, Council notes → clicks **Approve & dispatch**
6. Tasks execute in topological order (parallel where no dependency)
7. Each task: RAG context injection + provider routing (checks local Ollama protocol first)
8. Results appear in task accordion on `/plans/{id}`, SSE streams TASK_DONE events

---

## Next Session — Priority Order

### 1. LLM Provider Settings UI (1-2h) ← START HERE
Build the settings UI to configure which LLM is used for each role (keeper/agent/embed/council).
This unlocks the "route to local Ollama after first API run" feature.

**Files to edit:**
- `app/(app)/settings/page.tsx` — add "Providers" tab
- Uses existing `GET/POST/DELETE /api/llm-providers`

**UI needed:**
- List current providers (type, role, isDefault badge)
- "Add provider" form: name, type (dropdown: anthropic/openai/ollama/custom), baseUrl (ollama/custom), API key (password field, hidden), role (dropdown), set as default
- Delete button
- Pre-filled quick-add buttons: "Use Anthropic from env" (no key needed if ANTHROPIC_API_KEY set), "Use local Ollama"

### 2. Marketplace (4-6h)
Approved plan at `docs/MARKETPLACE-PLAN.md`. Build next after Providers UI.
- `data/packages/*.json` — 8 package JSON files
- `app/(app)/marketplace/page.tsx` — browse + install UI
- `app/api/marketplace/route.ts` + `app/api/marketplace/install/route.ts`
- Add Marketplace link to Sidebar (ShoppingBag icon)

### 3. UX Redesign Phase 2 (1-2h)
- Empty states on all major pages (Plans, Teams, Brain, Schedule)
- Plain English audit — remove jargon like "pipeline", "agent_teams", "vault_notes"
- See `docs/UX-REDESIGN-PLAN.md`

### 4. Phone UI fixes
See `docs/PHONE-UX-TODO.md` for specific issues.

### 5. PWA PNG icons
Generate from `public/icons/icon.svg` at 180×180, 192×192, 512×512px.

### 6. Landing page Block G
Brain section + updated pricing + blog link.

---

## Billing Plan — Path to Charging Customers

### Phase 1 — Credit Gate ✅ DONE
### Phase 2 — Admin Credits Panel ✅ DONE
### Phase 3 — Payment Flow (half day) — NOT STARTED
- Option A: Stripe — get keys from dashboard.stripe.com → add `STRIPE_SECRET_KEY` + `STRIPE_WEBHOOK_SECRET`
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
  → if not: fall back to new AnthropicProvider() using ANTHROPIC_API_KEY env var

runAgentTask() also checks TaskProtocol (local Ollama protocols) first:
  → if matching protocol + confidence >= 0.7: use OllamaProvider (free)
  → else: use configured agent provider (API)
```

### Brain Pipeline
```
ingestToBrain({content, title, source, sourceType})
  → SHA-256 dedup check
  → splitIntoChunks() (recursive, 400-600 tokens)
  → embed each chunk via getEmbedProvider() (Ollama nomic-embed-text)
  → upsert to brain_chunks table

queryBrain({query, topK, filter})
  → embed query
  → pgvector cosine search with HNSW index
  → recency boost: score * (1 + 0.1 * exp(-days/30))
  → return top-K BrainChunkResult[]
```

---

## State Snapshot

### Live on VPS ✅
- Core platform: Teams, Agents, Skills, Chat, Tools
- 2nd Brain: vault, MCP, graph, search
- Plans system: full end-to-end (create → council → approve → dispatch → execute)
- Brain chunking pipeline + HNSW index
- LLM Provider adapter system
- SSE notification stream
- Self-registration, credit gate, admin credits panel
- Mobile-first UI (bottom nav, responsive pages)

### Built but needs UI ⚠️
- LLM Provider config (`/api/llm-providers` live, no UI yet) — **next priority**
- SSE notifications received by backend, no frontend listener yet

### Not built yet ❌
- LLM Provider Settings UI (Providers tab in Settings)
- Marketplace (`docs/MARKETPLACE-PLAN.md` approved)
- Stripe payment automation
- Landing page Brain section (Block G)
- Admin monitoring panel
- PNG icons for PWA
- Frontend SSE listener (connect `/api/notify/stream` to a toast/banner in chat)

---

## Agent Teams on VPS

Teams seeded by `scripts/seed-teams.ts`. Plan tasks reference these teams by name match.
Current teams: Dev Core, DevOps & Infrastructure, Product & Design, Business & Growth, Command Center (Coordinator), Marketing Team, Blog Team.

For Plans to work end-to-end, team names must roughly match: `content`, `research`, `ops`, `dev` (partial match via `toLowerCase().includes()`). Add specialist teams if needed.

---

## Quick Reference

| Thing | Where |
|---|---|
| VPS IP | 95.217.163.247 |
| App path on VPS | `/root/opt/vps/` |
| Deploy command | `scp file → restart container` (never git pull) |
| Wallet addresses | `app/(app)/billing/page.tsx` WALLETS constant |
| Marketplace plan | `docs/MARKETPLACE-PLAN.md` |
| Full task queue | `docs/MASTER-TODO.md` |
| Session history | `docs/SESSION-HISTORY.md` |
| Plans UI | `/plans` → `/plans/[id]` |
| Provider config API | `GET/POST/DELETE /api/llm-providers` |
| SSE stream | `GET /api/notify/stream` (text/event-stream) |
