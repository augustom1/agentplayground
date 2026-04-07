# WORK IN PROGRESS — AgentPlayground Dashboard

> **Generated:** 2026-03-27
> **Purpose:** Track all known gaps, active fixes, and future work for new Claude sessions.
> Keep this file updated after every work session.

---

## SESSION CONTEXT

- **Stack:** Next.js 16 · React 19 · TypeScript · Prisma 7 · PostgreSQL + pgvector · NextAuth v5 · Tailwind v4 · Docker
- **Domain:** agentplayground.net
- **State as of 2026-03-27:** UI is polished (~70% complete), backend logic is ~30% complete. Core automation features do not yet run autonomously.
- **Master plan:** See `MASTER_PLAN.md` — single source of truth for all audit findings, backend completion steps, VPS workflow, API keys, and revenue roadmap.

---

## COMPLETED IN SESSION 2 (2026-03-27)

### Track E — File Management (Full Stack)
- [x] Added `FileRecord` + `FileEmbedding` models to `prisma/schema.prisma`
  - `FileRecord`: tracks file metadata (name, path, size, mimeType, embedded status)
  - `FileEmbedding`: 768-dim pgvector for nomic-embed-text (Ollama, local/free)
- [x] Created `app/api/files/route.ts` — GET (list dir), POST (mkdir), DELETE
- [x] Created `app/api/files/upload/route.ts` — multipart file upload (100 MB cap)
- [x] Created `app/api/files/download/route.ts` — stream file download
- [x] Created `app/api/files/embed/route.ts` — embed text files into pgvector via Ollama nomic-embed-text
- [x] Rebuilt `app/(app)/files/page.tsx` — native file manager (no more iframe)
  - Folder navigation, breadcrumbs, drag-and-drop upload, create folder, delete, download
  - "Embed" button per file → embeds into vector DB
  - Visual embedded badge on already-indexed files
  - File type icons, size display, search filter
- [x] Added 5 file tools to `lib/chat-tools.ts`:
  - `list_files(path?)` — list directory contents
  - `read_file(path)` — read text file (max 50KB)
  - `write_file(path, content)` — create/overwrite text file
  - `delete_file(path)` — delete file or directory
  - `search_files(query, limit?)` — semantic search via pgvector + nomic-embed-text
- [x] Created `scripts/setup-databases.sh` — idempotent DB setup agent

### Track F — Stack Cleanup
- [x] Removed Open WebUI from `docker-compose.yml` and `docker-compose.prod.yml`
  - AgentPlayground chat IS the Ollama interface — no need for Open WebUI
  - `open-webui-data` volume removed
  - `OPEN_WEBUI_SECRET` env var no longer required
- [x] Created `MASTER_PLAN.md` — comprehensive audit + roadmap document

### Pending Migration (MUST RUN)
```bash
npx prisma migrate dev --name add-file-management
```
This creates the `file_records` and `file_embeddings` tables.

Also pull the embedding model on Ollama:
```bash
docker exec vps-ollama ollama pull nomic-embed-text
```

---

## COMPLETED IN SESSION 1 (2026-03-27)

### Track A — Security & Quality
- [x] Added `MAX_TOOL_ITERATIONS = 10` guard to `streamAnthropic()` in `app/api/chat/route.ts` — prevents infinite tool-use loops
- [x] Created `lib/rate-limit.ts` — simple in-memory rate limiter (10 req/min per user on chat)
- [x] Wired rate limiting into `app/api/chat/route.ts`
- [x] Added session-based auth check to chat route (returns 401 if not logged in)

### Track B — Billing System
- [x] Created `lib/usage-tracker.ts` — `trackUsage()` function that writes to `ApiUsage` and debits `UserCredits`
- [x] Wired `trackUsage()` into `app/api/chat/route.ts` for Anthropic calls
- [x] Created `app/api/billing/route.ts` — GET returns current user's usage summary + credit balance
- [x] Created `app/api/billing/credits/route.ts` — POST to manually add credits (admin use)

### Track C — Task Executor + DB Indexes
- [x] Created `app/api/task/route.ts` — real task executor: picks up `pending` Task records and runs them via Claude with full tool-use
- [x] Added database indexes to `prisma/schema.prisma` for `status`, `teamId`, `createdAt` on key models
- [x] Updated `app/api/cron/route.ts` to call `/api/task` with proper auth header
- [x] Tasks now flow: created → `/api/task` executes → `completed`/`failed` with result stored

### Track D — UI Fixes
- [x] Installed `@dnd-kit/core`, `@dnd-kit/sortable`, `@dnd-kit/utilities`
- [x] Wired drag-and-drop into dashboard widget grid
- [x] Added "Apply Improvement" button to Tools page (`app/(app)/tools/page.tsx`) — marks `applied: true` via PATCH to `/api/improvements/[id]`
- [x] Created `app/api/improvements/[id]/route.ts` — PATCH to toggle `applied` field

---

## KNOWN ISSUES (Active Bugs)

| # | Issue | File | Severity |
|---|-------|------|----------|
| 1 | No rate limiting on `/api/chat` for Ollama — only Anthropic | `app/api/chat/route.ts` | Medium |
| 2 | Drag-and-drop position not persisted server-side on reorder (only position updates to `/api/widgets`) | `app/(app)/dashboard/page.tsx` | Low |
| 3 | OpenAI provider uses raw fetch instead of SDK — no tool-use support | `app/api/chat/route.ts` | Medium |
| 4 | `web_browse` tool uses regex HTML parsing — fragile | `lib/chat-tools.ts` | Medium |
| 5 | Chat history loads full conversation with no pagination | `app/(app)/chat/page.tsx` | Low |
| 6 | No XSS sanitization on chat message code block rendering | `app/(app)/chat/page.tsx` | Medium |
| 7 | Permission presets defined but not enforced in API routes | `lib/agent-permissions.ts` | High |
| 8 | No email/Slack notifications for failed/completed tasks | — | Medium |

---

## WHAT STILL NEEDS BUILDING

### Priority 1 — Core Product (Must-have)

#### 1.1 Permission Enforcement
- **Files:** `app/api/agents/route.ts`, `app/api/teams/route.ts`, `app/api/tasks/route.ts`, `middleware.ts`
- **What:** Read role/plan from JWT session, check `hasPermission()` before each API operation
- **Why:** Free users shouldn't be able to create unlimited teams or use Claude

#### 1.2 Stripe Integration
- **Files:** New `app/api/billing/stripe/` directory
- **What:** Checkout session, webhooks for payment events, credit top-up flow
- **Packages needed:** `stripe`
- **Why:** Revenue blocker
- **Entrypoints:** `CREDIT_PACKAGES` in `lib/pricing.ts` already defined

#### 1.3 Plan Limit Enforcement
- **Files:** `middleware.ts` or per-route checks
- **What:** Check `PLANS[plan].maxTeams`, `maxAgentsPerTeam`, `dailyCallLimit` before creating resources
- **Helpers already in:** `lib/pricing.ts` → `canUseClaudeApi()`, `dailyCallLimit()`

#### 1.4 Monthly Credit Reset
- **Files:** `app/api/cron/route.ts`
- **What:** On 1st of month, call `monthlyFreeCredits(plan)` and top up each user's balance
- **Helper:** `lib/pricing.ts` → `monthlyFreeCredits()`

### Priority 2 — Growth Features

#### 2.1 Agent Memory (pgvector)
- **Files:** New `lib/embeddings.ts`
- **What:** After each chat conversation, embed the messages and store in `Embedding` table
- **Packages needed:** Nothing new — `pgvector` already in schema
- **Model:** Use `text-embedding-3-small` (OpenAI) or `nomic-embed-text` (Ollama, free)
- **Query:** On new chat, retrieve top-5 similar past messages as context
- **Why:** Makes agents learn from history → sticky product

#### 2.2 Team Templates Marketplace
- **Files:** New `app/(app)/marketplace/page.tsx`, `app/api/marketplace/route.ts`
- **What:** Public list of `AgentTeamConfig` records that users can one-click import
- **Import endpoint:** `app/api/import-team/route.ts` already exists
- **Why:** Viral growth loop — share and reuse team configs

#### 2.3 Notification System
- **Files:** New `lib/notify.ts`
- **What:** Email (nodemailer or Resend) + optional Slack webhook when tasks complete/fail
- **Trigger:** After task executor writes `completed`/`failed` status
- **Package needed:** `resend` (simplest) or `nodemailer`

#### 2.4 Recurring Task UI
- **Files:** `app/(app)/schedule/page.tsx` (already has UI shell)
- **What:** Tab showing `RecurringTask` records with enable/disable toggle + cron display
- **API:** `app/api/recurring-tasks/route.ts` — check if it exists; if not, create it

#### 2.5 OpenAI SDK Integration
- **Files:** `app/api/chat/route.ts`
- **What:** Replace raw fetch in `streamOpenAI()` with `openai` SDK, add tool-use support
- **Package needed:** `openai`

### Priority 3 — Scale / Enterprise

#### 3.1 API Keys for Programmatic Access
- **Files:** New `prisma/schema.prisma` model `ApiKey`, new `app/api/keys/` routes
- **What:** Users generate API keys, use them to call `/api/task` or `/api/chat` without session
- **Why:** Developers will pay for this

#### 3.2 Usage Analytics Dashboard
- **Files:** Extend `app/(app)/settings/page.tsx` or new `app/(app)/billing/page.tsx`
- **What:** Graph of API usage over time, credits remaining, invoice history
- **Data:** `ApiUsage` table (already being populated after Track B fix)

#### 3.3 White-Label Config
- **Files:** `app/layout.tsx`, new `lib/theme.ts`
- **What:** Per-domain branding: logo, colors, company name from env vars
- **Why:** Agencies pay $200-500/mo to resell this

#### 3.4 Vector Search for Skills
- **Files:** `lib/embeddings.ts` (from 2.1), `app/api/skills/route.ts`
- **What:** Embed skill descriptions; semantic search when Claude asks "what tool can do X?"
- **Enables:** Auto-discovery of relevant skills without explicit tool_use

---

## ARCHITECTURE DECISIONS MADE

| Decision | Reason |
|---|---|
| Rate limiting is in-memory (not Redis) | Simpler for single-instance; switch to Upstash when going multi-instance |
| Task executor uses Claude directly (not a queue) | Fast to implement; add BullMQ/pg-boss queue when load requires it |
| Billing is credit-based (not subscription seats) | More granular; can layer subscriptions on top later |
| Embeddings deferred until OpenAI/Ollama embed model confirmed | Avoid vector dimension mismatch between providers |

---

## ENVIRONMENT VARIABLES NEEDED (Not Yet Set)

```bash
# Billing (when Stripe is added)
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...

# Notifications (when notify.ts is added)
RESEND_API_KEY=re_...
NOTIFICATION_EMAIL=admin@agentplayground.net

# OpenAI (when SDK is wired)
OPENAI_API_KEY=sk-...

# Embeddings (when agent memory is built)
# Uses OPENAI_API_KEY above OR OLLAMA_BASE_URL for local embeddings
```

---

## MIGRATION NEEDED

After adding indexes in Track C, run:
```bash
npx prisma migrate dev --name add-indexes
```

---

## FILE MAP OF NEW FILES CREATED

```
lib/
├── rate-limit.ts           # NEW: in-memory rate limiter
├── usage-tracker.ts        # NEW: trackUsage() → writes ApiUsage + debits UserCredits

app/api/
├── task/route.ts           # NEW: real task executor (Claude + tools)
├── billing/route.ts        # NEW: GET usage summary for current user
├── billing/credits/route.ts # NEW: POST to add credits (admin)
├── improvements/[id]/route.ts # NEW: PATCH to apply/unapply improvement
```

---

## HOW TO RESUME WORK IN A NEW SESSION

1. Read this file first (`WORK_IN_PROGRESS.md`)
2. Read `CLAUDE.md` for full project context
3. Check "COMPLETED IN THIS SESSION" to know what's already done
4. Pick the highest priority item from "WHAT STILL NEEDS BUILDING"
5. Key files to read before editing:
   - `lib/pricing.ts` — billing config
   - `lib/chat-tools.ts` — all Claude tools
   - `app/api/chat/route.ts` — main chat endpoint
   - `prisma/schema.prisma` — full DB schema
   - `lib/usage-tracker.ts` — usage tracking (new)
   - `app/api/task/route.ts` — task executor (new)

---

## MONETIZATION NOTES

- **Best first paying customers:** agencies running client AI workflows ($200-500/mo)
- **Hook:** "Deploy Claude + your tools in 10 minutes, on your VPS, for $10/mo"
- **Moat:** Local-first (Ollama), self-hosted, bring-your-own-key — privacy-first angle
- **Flywheel:** User solves problem → agent does it → becomes a reusable skill → reduces API cost → user saves money → tells others
- **Free tier is intentionally limited** to Ollama-only to keep free infra cost near zero
- **Stripe:** Wire in when the product actually executes tasks reliably (Track C must be solid first)
