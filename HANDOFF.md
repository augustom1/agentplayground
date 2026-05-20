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

## Current Session — 2026-05-20 (session 5)

### Done this session — Agent Playground Spec implementation

Read `agent-playground-spec.md` and implemented the full spec:

**Schema additions (prisma/schema.prisma):**
- `Plan` + `PlanStatus` enum — primary work unit (replaces Projects for AI-driven work)
- `PlanTask` + `PlanTaskStatus` enum — tasks within a plan, assigned to teams
- `BrainDocument` + `BrainChunk` — proper chunked RAG store with 768-dim pgvector embeddings
- `LlmProvider` — DB-stored LLM provider configs with encrypted API keys
- `AppNotification` — in-app notification records for SSE streaming

**LLM Provider system (lib/providers/):**
- `types.ts` — LLMProvider interface, CompletionParams, CompletionResult
- `anthropic.ts` — AnthropicProvider (wraps SDK)
- `openai.ts` — OpenAIProvider (wraps SDK, also covers OpenAI-compatible APIs)
- `ollama.ts` — OllamaProvider (direct HTTP, zero external latency)
- `index.ts` — provider registry, `getProvider(role)`, AES-256-GCM key encryption

**Brain improvements:**
- `lib/brain/ingest.ts` — chunking pipeline (recursive splitter, 400-600 tokens, 10% overlap), content hash deduplication, BrainChunk upsert
- `lib/brain/query.ts` — `queryBrain()` with cosine similarity + recency boost + metadata filters
- `lib/brain/index.ts` — `indexVaultNote()` now also feeds BrainChunks (bridge)

**Intelligence layer:**
- `lib/council/index.ts` — 2-round Council debate, Amendment extraction, CouncilOutput JSON
- `lib/planner/builder.ts` — Keeper system prompt, plan builder (goal → Plan + PlanTasks), Council integration
- `lib/planner/dispatch.ts` — topological sort, parallel task batching, fire-and-forget dispatch
- `lib/agents/events.ts` — BlockedEvent + TaskResult interfaces
- `lib/agents/runner.ts` — RAG-injected task runner, TaskProtocol local routing, provider-aware

**Notifications:**
- `lib/notify/sse.ts` — in-memory EventEmitter + SSE ReadableStream, heartbeat

**API routes:**
- `app/api/plans/route.ts` — GET list, POST (triggers planner + council)
- `app/api/plans/[id]/route.ts` — GET detail, PATCH, DELETE
- `app/api/plans/[id]/approve/route.ts` — POST (approve/reject/request_changes)
- `app/api/notify/stream/route.ts` — SSE event stream
- `app/api/llm-providers/route.ts` — GET/POST/DELETE provider configs

**UI:**
- `app/(app)/plans/page.tsx` — plan list with status badges, grouped sections, inline create
- `app/(app)/plans/[id]/page.tsx` — plan detail + approval gate (Approve/Request changes/Reject), task accordion with results, Council notes, progress bar
- `components/Sidebar.tsx` — Plans link added (ClipboardList icon, in WORK section)
- `components/MobileNav.tsx` — Plans added to Work section in More drawer

**Chat integration:**
- `lib/chat-tools.ts` — `create_plan` tool added; coordinator calls it for multi-team goals
- The full flow: user types goal in chat → Keeper drafts plan → Council reviews → user approves at /plans/[id] → tasks dispatch with RAG context

### ⚠️ Required deploy step (DB schema changed!)
```bash
# On VPS after deploying files:
docker exec vps-dashboard npx prisma generate
docker exec vps-dashboard npx prisma db push
```

### New files to SCP to VPS
```bash
# New files (all need to go to VPS)
scp -r lib/providers/ root@95.217.163.247:/root/opt/vps/lib/
scp lib/brain/ingest.ts root@95.217.163.247:/root/opt/vps/lib/brain/
scp lib/brain/query.ts root@95.217.163.247:/root/opt/vps/lib/brain/
scp lib/brain/index.ts root@95.217.163.247:/root/opt/vps/lib/brain/
scp -r lib/council/ root@95.217.163.247:/root/opt/vps/lib/
scp -r lib/planner/ root@95.217.163.247:/root/opt/vps/lib/
scp -r lib/agents/ root@95.217.163.247:/root/opt/vps/lib/
scp -r lib/notify/ root@95.217.163.247:/root/opt/vps/lib/
scp app/api/plans/route.ts root@95.217.163.247:/root/opt/vps/app/api/plans/
scp "app/api/plans/[id]/route.ts" root@95.217.163.247:/root/opt/vps/app/api/plans/[id]/
scp "app/api/plans/[id]/approve/route.ts" root@95.217.163.247:/root/opt/vps/app/api/plans/[id]/approve/
scp app/api/notify/stream/route.ts root@95.217.163.247:/root/opt/vps/app/api/notify/stream/
scp app/api/llm-providers/route.ts root@95.217.163.247:/root/opt/vps/app/api/llm-providers/
scp "app/(app)/plans/page.tsx" root@95.217.163.247:/root/opt/vps/app/(app)/plans/
scp "app/(app)/plans/[id]/page.tsx" root@95.217.163.247:/root/opt/vps/app/(app)/plans/[id]/
scp prisma/schema.prisma root@95.217.163.247:/root/opt/vps/prisma/
scp lib/chat-tools.ts root@95.217.163.247:/root/opt/vps/lib/
scp components/Sidebar.tsx root@95.217.163.247:/root/opt/vps/components/
scp components/MobileNav.tsx root@95.217.163.247:/root/opt/vps/components/
```

### How Plans work (end-to-end)

1. User types a multi-team goal in Chat (coordinator mode) or goes to /plans directly
2. Chat calls `create_plan` tool → `lib/planner/builder.ts` → Keeper drafts Plan + PlanTasks
3. Council runs 2-round debate → amendments + risk flags folded in
4. Plan saved to DB with status `PENDING_APPROVAL`
5. User sees link in chat → clicks to `/plans/{id}`
6. User reviews: task list, risk flags, Council notes
7. Clicks "Approve & dispatch" → `POST /api/plans/{id}/approve`
8. `lib/planner/dispatch.ts` fires tasks in topological order (parallel where no dependency)
9. Each task: `lib/agents/runner.ts` → checks TaskProtocol for local Ollama match → falls back to Claude API
10. Results saved per task. Plan shows progress bar + task results.
11. SSE stream (`/api/notify/stream`) pushes TASK_DONE + PLAN_DONE events to frontend

### Immediate next steps (priority order)
1. **Connect Plans to brain index** — add HNSW index migration for brain_chunks (run after db push)
2. **LLM Provider settings UI** — add Providers tab to `/settings` page to configure per-role providers
3. **Marketplace** — still approved from `docs/MARKETPLACE-PLAN.md`
4. **UX Redesign Phase 2** — empty states + plain English audit
5. **PNG icons for PWA** — 180×180, 192×192, 512×512
6. **Landing page Block G** — Brain section + updated pricing

### Brain HNSW index (run after db push)
```sql
-- Run inside postgres container after schema push:
CREATE INDEX IF NOT EXISTS brain_chunk_embedding_idx
ON "brain_chunks" USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);
```

---

## Previous Session — 2026-05-18 (session 4)

### Done
- UX Redesign Phase 1 — Navigation restructure (Sidebar, MobileNav, hub pages)
- Credit gate (`lib/credits.ts`) — Anthropic-only, admin-exempt, deducts after stream
- Admin credits panel (`/api/admin/credits` GET/POST, `CreditsAdminPanel` component)
- Deployed to VPS with DB schema sync

---

## Billing Plan — Path to Charging Customers

### Phase 1 — Credit Gate ✅ DONE
- `lib/credits.ts` ✅
- Chat route gate ✅
- Rates: Sonnet 3 in/15 out, Haiku 0.25 in/1.25 out per 1k tokens ✅

### Phase 2 — Admin Credits Panel ✅ DONE
- `/api/admin/credits` GET/POST ✅
- `CreditsAdminPanel` component ✅

### Phase 3 — Payment Flow (half day) — NOT STARTED
- Option A: Stripe (fastest) — keys needed
- Option B: Crypto manual (current) — UI done, verification manual

### Phase 4 — Monthly Credit Reset — NOT STARTED
- Add to `/api/cron` on 1st of month

---

## State Snapshot (what's live vs. not)

### Live on VPS ✅
- Core platform: Teams, Agents, Skills, Chat, Tools
- 2nd Brain: vault, MCP, graph, search
- Self-registration
- Connect page
- Mobile-first UI
- Credit gate + admin panel

### Built but needs deploy ⚠️
- **Plans system** (this session) — SCP files + db push + HNSW index
- Provider adapter system
- Brain chunking pipeline
- Council + Planner + Agent runner
- SSE notifications

### Built but needs env vars ⚠️
- Telegram bot (needs `TELEGRAM_BOT_TOKEN`)
- Email/WhatsApp channels
- MCP endpoint

### Not built yet ❌
- Marketplace (`docs/MARKETPLACE-PLAN.md` approved)
- LLM Provider settings UI (UI for `/api/llm-providers`)
- Stripe payment automation
- Landing page Brain section (Block G)
- Admin monitoring panel
- PNG icons for PWA
- HNSW index for brain_chunks (SQL command above)

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
| Plans flow | /plans → create → council review → approve → dispatch |
| Provider config | /api/llm-providers (DB-stored, encrypted keys) |
