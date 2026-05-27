# Master TODO — Agent Playground + 2nd Brain
> ⚠️ SUPERSEDED by `docs/PLAN.md` (2026-05-27). This file is kept for historical reference only.
> For open work, see `docs/PLAN.md`. For session history, see `docs/SESSION-HISTORY.md`.
> Updated: 2026-05-22 (Session 16)

---

## COMPLETED IN SESSION 16 ✅

| Item | What | Files |
|---|---|---|
| Hotfix slug conflict | Moved widget-data route from `[teamId]` → `[id]`, no-cache rebuild | app/api/playground/teams/[id]/widget-data/route.ts |
| Deploy protocol | Documented checklist + slug rule + no-cache trigger | docs/DEPLOY-PROTOCOL.md |

## COMPLETED IN SESSION 15 ✅

| Item | What | Files |
|---|---|---|
| P5 Project Status | `get_project_status` tool + `/api/projects/[id]/status` + workstream UI in `/projects` | lib/chat-tools.ts, app/api/projects/[id]/status/route.ts, app/(app)/projects/page.tsx |
| P6 Telegram | DMs → coordinator, group notifications, settings UI, register-webhook API | lib/integrations/telegram/bot.ts, components/TelegramSettings.tsx, app/api/telegram/register-webhook/route.ts, app/(app)/settings/page.tsx |
| P7 Widget data | Live task_queue + project_pipeline in playground widgets | app/api/playground/teams/[id]/widget-data/route.ts, app/(app)/playground/[teamId]/page.tsx |

## OPEN PRIORITIES

| Priority | Item | Notes |
|---|---|---|
| Next | LLM Provider Settings UI | lib/providers/ adapter exists, no UI |
| Next | Admin Monitoring Panel | No system health/usage view |
| Next | Empty States | Plans, Teams, Brain, Schedule |
| Future | Stripe payment automation | Schema done, needs keys |
| Future | Landing page Brain section | Block G |
| Future | Telegram env vars on VPS | Add TELEGRAM_GROUP_CHAT_ID + TELEGRAM_OWNER_CHAT_ID to .env.local |
| Future | Live blockchain (Crypto Wallet) | Scaffold only |

---

## BLOCK A — 2nd Brain Core (do this first — everything depends on it)

### A1. Docker: add Syncthing + obsidian-mcp containers
**File:** `docker-compose.yml`
- Add `syncthing` service (image: `syncthing/syncthing:latest`, port 8384, volume: `vaultdata:/var/syncthing/vault`)
- Add `obsidian-mcp` service (image: `cyanheads/obsidian-mcp-server:latest`, port 3001, volume: `vaultdata:/vault`)
- Add `vaultdata:` to the volumes block
- Add both to `docker-compose.prod.yml` Traefik routing: `sync.DOMAIN` → syncthing port

### A2. New lib: brain helpers
**Create:** `lib/brain/index.ts`
- `searchVault(query: string, topK?: number)` — pgvector semantic search over VaultNote table, returns array of `{ path, title, content, score }`
- `readVaultNote(path: string)` — GET request to obsidian-mcp container's REST API
- `writeVaultNote(path: string, content: string, append?: boolean)` — POST to obsidian-mcp
- `getDailyNotes(last?: number)` — reads last N daily notes from vault (path: `daily/YYYY-MM-DD.md`)
- `ingestToVault(text: string, title: string, tags?: string[])` — creates note at `inbox/YYYY-MM-DD-HH-MM-slug.md`

### A3. New Prisma model: VaultNote
**File:** `prisma/schema.prisma`
- Add model `VaultNote` with fields: `id`, `path` (unique), `title`, `content`, `tags String[]`, `frontmatter Json?`, `embedding vector(768)?`, `updatedAt`
- Run `npx prisma db push` after

### A4. New API routes: /api/brain/*
**Create:** `app/api/brain/index/route.ts` — POST: receives `{ path, content, frontmatter }` from n8n indexer, embeds via Ollama nomic-embed-text, upserts VaultNote record. No auth required from internal network (validate via secret header `X-Brain-Secret`).

**Create:** `app/api/brain/search/route.ts` — GET `?q=query&topK=5`: session-protected, calls `searchVault()`, returns ranked note list.

**Create:** `app/api/brain/note/route.ts` — GET `?path=`: reads note via obsidian-mcp. POST: writes note via obsidian-mcp. Session-protected.

**Create:** `app/api/brain/daily/route.ts` — GET: returns today's daily note + last 3. POST: appends session summary to today's daily note.

**Create:** `app/api/brain/ingest/route.ts` — POST `{ text, title, tags? }`: creates vault note at inbox/, embeds it. Session-protected. Used by Quick Capture UI and Telegram.

**Update:** `middleware.ts` — add `/api/brain/index` to public routes (internal n8n calls only, protected by secret header instead of session)

### A5. Keeper context injection
**File:** `app/api/chat/route.ts`
- After building the system prompt, before calling Claude:
  ```typescript
  // Vault context injection (non-blocking — use Promise.allSettled)
  const [vaultNotes, dailyNotes] = await Promise.allSettled([
    searchVault(lastUserMessage, { topK: 5 }),
    getDailyNotes(3)
  ]);
  // Append to systemPrompt if results exist
  ```
- Keep it non-blocking: if vault search fails, continue without it
- Add a `VAULT_CONTEXT_ENABLED` env flag so it can be toggled per deployment

### A6. Session write-back
**File:** `app/api/chat/route.ts`
- After streaming completes, fire-and-forget:
  ```typescript
  // Append session log to today's daily note
  writeVaultNote(`daily/${today}.md`, sessionSummary, true).catch(() => {})
  ```
- Session summary = last user message + first 200 chars of assistant response + tool names used

### A7. n8n vault indexing workflow
**Document:** `docs/n8n-vault-indexer.md`
- Write the exact n8n workflow JSON to import (Schedule trigger every 5 min → Read vault folder via filesystem → For each .md file changed since last run → POST to `/api/brain/index`)
- This doc gives a new session the exact steps to configure n8n

---

## BLOCK B — MCP Endpoint (any LLM can read/write the vault)

### B1. MCP protocol endpoint
**Create:** `app/api/mcp/route.ts`
- Implements MCP JSON-RPC protocol (`initialize`, `tools/list`, `tools/call`)
- Auth: `Authorization: Bearer <api-key>` header — validate against `User.apiKey` field in DB
- Tools to expose:
  - `vault_write` — `{ path?, title, content, tags? }` → calls `/api/brain/ingest` internally
  - `vault_search` — `{ query, topK? }` → calls `searchVault()`
  - `vault_read` — `{ path }` → calls `readVaultNote()`
  - `dispatch_task` — `{ description, context? }` → creates Task record, routes to Keeper
  - `get_context` — `{ topic }` → returns top-5 vault notes + active project summary
- **Update:** `middleware.ts` — add `/api/mcp` to public routes (auth is API key, not session)

### B2. API key management
**File:** `prisma/schema.prisma`
- Add `apiKey String? @unique` field to `User` model
- Run `npx prisma db push`

**File:** `app/(app)/settings/page.tsx`
- Add "API Keys" section: show current key (masked), "Generate New Key" button, copy button
- Show MCP config snippet: `{ "type": "url", "url": "https://app.yourdomain.com/mcp", "headers": { "Authorization": "Bearer KEY" } }`

**Create:** `app/api/settings/api-key/route.ts` — POST: generates `crypto.randomUUID()` key, saves hashed to DB, returns plaintext once

---

## BLOCK C — Universal Inbox (any channel → vault)

### C1. Telegram → vault (extend existing bot)
**File:** `lib/integrations/telegram/bot.ts`
- Any text message (not a command) → call `ingestToVault(text, title, ['#telegram'])` → reply "Saved to your brain ✓"
- `/note <text>` → same as above but explicit
- `/brain <query>` → call `searchVault(query)` → reply with top 3 results formatted
- `/daily` → call `getDailyNotes(1)` → reply with today's note content
- Voice message → already transcribed via Whisper → pass transcript to `ingestToVault()`
- Photo → already vision-described → pass description to `ingestToVault()`

### C2. Email → vault (via n8n)
**Document:** `docs/n8n-email-to-vault.md`
- n8n workflow: Gmail/IMAP trigger → extract subject + body → POST to `/api/brain/ingest` with `tags: ['#email', '#inbox']`
- No code needed in the app — all in n8n

### C3. Web capture widget (shareable link)
**Create:** `app/(app)/brain/capture/page.tsx`
- Minimal public-ish page (requires API key in URL param, not session)
- Single textarea + "Save to Brain" button
- POST to `/api/brain/ingest`
- Use case: browser bookmarklet, share link with clients who don't use Telegram

---

## BLOCK D — Files Tab Redesign (Brain UI)

### D1. Tab structure
**File:** `app/(app)/files/page.tsx`
- Replace single-view with tabbed layout: `Files | Brain | Graph | Search`
- `Files` tab = existing file manager (keep exactly as-is)
- Add the 3 new tabs below

### D2. Brain tab — Vault Browser + Quick Capture
**File:** `app/(app)/files/page.tsx` (Brain tab section)
- Top: Quick Capture — always-visible textarea + "Save to Brain" button → POST `/api/brain/ingest`
- Below: Vault Browser — folder tree of vault notes fetched from `/api/brain/note?list=true`
- Click note → opens in right panel (read-only markdown renderer)
- Show frontmatter tags as colored pills
- Show `updatedAt` timestamp

### D3. Graph tab — D3.js knowledge graph
**File:** `app/(app)/files/page.tsx` (Graph tab section)
- Install: `npm install d3` + `@types/d3`
- Fetch graph data from `GET /api/brain/graph` (new route — see D3a below)
- Render force-directed graph: nodes = vault notes, edges = `[[wikilink]]` references parsed from content
- Node color by tag: `#project` = blue, `#person` = green, `#research` = yellow, `#email` = purple, no tag = gray
- Click node → open note in side panel
- This is the "wow" visual for social media demos

**Create:** `app/api/brain/graph/route.ts`
- Reads all VaultNote records from DB
- Parses `[[wikilink]]` patterns from content
- Returns `{ nodes: [{ id, title, tags, size }], edges: [{ source, target }] }`

### D4. Search tab — semantic search
**File:** `app/(app)/files/page.tsx` (Search tab section)
- Search input → debounced GET `/api/brain/search?q=`
- Results list: note title, tags, first 150 chars of content, relevance score
- Click result → open note in side panel

---

## BLOCK E — Agent Teams: Vault-Aware

### E1. Add vault tools to chat-tools.ts
**File:** `lib/chat-tools.ts`
- Add tool: `vault_search` — `{ query: string }` → calls `searchVault()`, returns formatted note list
- Add tool: `vault_write` — `{ title: string, content: string, tags?: string[] }` → calls `ingestToVault()`
- Add tool: `vault_read` — `{ path: string }` → calls `readVaultNote()`
- These let Keeper and all agent teams read/write the brain during any chat session

### E2. Research Team — vault-first search
**Goal:** Team reads vault before doing web search. Avoids re-researching what's already known.
- In agent system prompt seed for Research Team: "Always call `vault_search` first with the research topic. If sufficient context exists (score > 0.8), summarize vault knowledge. Only call `web_search` for gaps."
- Write research output back to vault: `vault_write` with path `research/topic-YYYY-MM-DD.md`
- Update `scripts/seed-teams.ts` — Research Team agents get updated system prompts

### E3. Financial/Business Team — reads budget context from vault
**Goal:** Team reads financial notes from vault before calculating anything.
- System prompt: "Before any financial calculation, call `vault_search` with 'budget financial income expenses' to load user's financial context from their brain."
- New team seed: Financial Team (if not exists) with agents: Financial Analyst, Budget Tracker, ROI Calculator
- Update `scripts/seed-teams.ts`

### E4. Keeper coordinator: multi-team dispatch
**File:** `app/api/chat/route.ts`
- When `teamId === "coordinator"` and vault context is loaded, add to COORDINATOR_INTRO system prompt:
  ```
  You have access to the user's second brain via vault_search, vault_read, vault_write tools.
  Always search the vault for context before answering. When a task requires multiple domains
  (research + finance, content + scheduling), dispatch to both teams and synthesize the results.
  Write a summary of completed tasks back to the vault using vault_write.
  ```

---

## BLOCK F — Payments (get money coming in)

### F1. Stripe keys — wire up existing code
**Prerequisite:** Get keys from dashboard.stripe.com
- Existing files already written: `app/api/billing/stripe/create-checkout/route.ts`, `app/api/webhooks/stripe/route.ts`
- Just need: `STRIPE_SECRET_KEY` + `STRIPE_WEBHOOK_SECRET` in `.env.local`
- Test with Stripe CLI: `stripe listen --forward-to localhost:3000/api/webhooks/stripe`
- Verify: create test checkout, confirm webhook credits user

### F2. Credit gate in chat route
**File:** `app/api/chat/route.ts`
- After session validation, before calling Claude:
  ```typescript
  if (provider === 'anthropic') {
    const credits = await getUserCredits(session.user.id);
    if (credits.balance <= 0) {
      return Response.json({ error: 'Insufficient credits. Top up at /billing.' }, { status: 402 });
    }
  }
  ```
- Free users can still use Ollama (provider === 'ollama' skips gate)

### F3. Self-registration page
**Create:** `app/(auth)/register/page.tsx`
- Form: email + password + invite code (optional)
- POST to `/api/auth/register`
- **Create:** `app/api/auth/register/route.ts` — validates invite code if `REQUIRE_INVITE_CODE=true`, creates user with `plan: 'free'`, seeds 500 credits
- **Update:** `middleware.ts` — add `/register` and `/api/auth/register` to public routes
- **Update:** `app/(auth)/login/page.tsx` — add "Create account →" link at bottom

### F4. MercadoPago — activate for AR clients
- Already coded: `app/api/mercadopago/preference/route.ts` + webhook
- Just needs `MERCADOPAGO_ACCESS_TOKEN` in VPS `.env.local`
- Update prices in `app/api/mercadopago/preference/route.ts` to match current tiers ($299/$499/$799 install + $79/$149/$299/mo managed)
- Register webhook URL in MercadoPago dashboard: `https://app.agentplayground.net/api/mercadopago/webhook`

### F5. Monthly credit reset cron
**File:** `app/api/cron/route.ts`
- Add: on 1st of each month, run `resetMonthlyCredits()` which sets `UserCredits.balance = plan.monthlyAllowance` for all active users
- **Create:** `lib/credits.ts` — `resetMonthlyCredits()`, `getUserCredits(userId)`, `deductCredits(userId, amount)`

---

## BLOCK G — Landing Page (agentplayground.net)

### G1. Add 2nd Brain section
**File:** `webroot/main/index.html`
- Add new section between hero and features: "Your Second Brain, Powered by AI Agents"
- Subheading: "Everything you save — chats, research, voice notes, ideas — becomes context for your agent teams. Send a WhatsApp. Your agents remember it forever."
- 3 columns: (1) Any channel → Brain, (2) Brain → Agent Context, (3) Agents → Results
- Add screenshot/mockup of the D3.js graph (placeholder until built)
- Add both EN and ES translations to the `T` object

### G2. Update pricing to match current model
**File:** `webroot/main/index.html`
- Update 3 tiers to: Starter Install ($299), Brain Install ($499), Full Stack ($799)
- Add "Managed Hosting" row: $79/$149/$299/month
- Add agent team add-ons table: Marketing ($149), Communication ($199), Dev ($149), Business ($149)
- Update AR page (`webroot/ar/index.html`) with same structure in Spanish

### G3. Add demo video placeholder
**File:** `webroot/main/index.html`
- Add "See it in action" section with YouTube embed placeholder
- For now: a terminal-style animation showing the real estate example flow
- Text: `> User: "Analyze real estate for me" → Keeper reads vault → Dispatches Research + Financial teams → Full report in 90 seconds`

---

## BLOCK H — Product Delivery Standardization

### H1. Client onboarding script
**Create:** `scripts/onboard-client.sh`
- Prompts for: domain, email, password, plan tier
- Generates `.env.local` from template
- Runs `docker compose up -d --build`
- Runs `npx tsx scripts/seed-teams.ts` (seeds default teams)
- Creates admin user via `/api/auth/setup`
- Outputs: login URL, credentials, Syncthing setup link
- Makes delivering a new client a 5-minute operation

### H2. Environment template
**Create:** `.env.template`
- Every variable with comments explaining what it does and where to get it
- Grouped: Required / Optional / Payment / Brain / Channels
- This is what you send clients who self-install

### H3. Agent team tiers
**File:** `scripts/seed-teams.ts`
- Add flag: `--tier starter|brain|full`
- `starter`: seeds 1 team (Command Center + basic agents)
- `brain`: adds Research + Business teams (vault-aware system prompts)
- `full`: all 5 teams with full vault-aware prompts + Financial team

### H4. Client delivery checklist
**Create:** `business/delivery/checklist-v2.md`
- Per-client checklist updated for the Brain tier
- Includes: Syncthing setup for client's Obsidian vault, MCP config for Claude Desktop, Telegram bot setup, first vault note seeding

---

## New Environment Variables Needed

Add these to `.env.local` and `.env.template`:

```bash
# 2nd Brain
VAULT_PATH=/var/syncthing/vault         # Path to vault inside Docker
OBSIDIAN_MCP_URL=http://obsidian-mcp:3001  # Internal container URL
BRAIN_SECRET=                           # Secret header for n8n → /api/brain/index
VAULT_CONTEXT_ENABLED=true             # Toggle vault injection in Keeper

# Payments
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
REQUIRE_INVITE_CODE=false              # Set true to require invite on register

# Syncthing (fill after first run)
SYNCTHING_API_KEY=                     # From Syncthing web UI → Actions → API key
```

---

## New Files Summary (create in order)

```
lib/brain/index.ts                          # Brain helpers (search, read, write, ingest)
lib/credits.ts                              # Credit helpers (get, deduct, reset)
prisma/schema.prisma                        # Add VaultNote model + User.apiKey field
app/api/brain/index/route.ts               # n8n indexer endpoint
app/api/brain/search/route.ts              # Semantic search
app/api/brain/note/route.ts                # Read/write single note
app/api/brain/daily/route.ts               # Daily notes
app/api/brain/ingest/route.ts              # Quick capture endpoint
app/api/brain/graph/route.ts               # D3 graph data
app/api/mcp/route.ts                       # MCP protocol endpoint
app/api/settings/api-key/route.ts          # API key generation
app/api/auth/register/route.ts             # Self-registration
app/(auth)/register/page.tsx               # Registration UI
app/(app)/brain/capture/page.tsx           # Web capture widget
scripts/onboard-client.sh                  # Client setup script
.env.template                              # Environment template for clients
business/delivery/checklist-v2.md         # Updated delivery checklist
docs/n8n-vault-indexer.md                  # n8n workflow setup guide
docs/n8n-email-to-vault.md                 # Email → vault n8n workflow
```

## Modified Files Summary

```
docker-compose.yml                         # Add syncthing + obsidian-mcp services
docker-compose.prod.yml                    # Add Traefik routes for new services
app/api/chat/route.ts                      # Vault injection + session write-back + credit gate
lib/chat-tools.ts                          # Add vault_search, vault_write, vault_read tools
lib/integrations/telegram/bot.ts           # Extend: any message → vault + /note /brain /daily
middleware.ts                              # Add /api/mcp, /api/brain/index, /register to public
app/(app)/files/page.tsx                   # Full redesign: add Brain/Graph/Search tabs
app/(app)/settings/page.tsx               # Add API key section
scripts/seed-teams.ts                      # Add --tier flag + vault-aware system prompts
webroot/main/index.html                    # Add Brain section + update pricing
webroot/ar/index.html                      # Update pricing in Spanish
```

---

## Session Startup Checklist (read this at start of every session)

1. Read `CLAUDE.md` for full project context
2. Read this file (`docs/MASTER-TODO.md`) for current task queue
3. Check which Block you're working on — start from the first unchecked task in the earliest incomplete Block
4. When done with a task: check it off here AND update `CLAUDE.md` Recent Work section
5. Run `npm run build` before ending any session — never leave the repo broken
