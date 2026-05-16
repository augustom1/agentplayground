# Session Handoff
> Last updated: 2026-05-16
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

## Current Session — 2026-05-16

### Done this session
- **Marketing Team** added to `scripts/seed-teams.ts`
  - Agents: Nova (Strategist), Spark (Copywriter), Pixel (Visual Director)
  - Skills: Weekly Content Plan, Twitter Thread, LinkedIn Post
  - Vault-aware: reads blog queue from BLOGPOSTS.md, writes social briefs
- **Blog Team** added to `scripts/seed-teams.ts`
  - Agents: Quill (Writer), Reed (Editor), Press (Publisher)
  - Skills: Draft Post, Review Post, Publish Post, Full Pipeline
  - Posts saved to vault under `Blog/<slug>.md` tagged `#blog-post`
- **`/api/blog/public`** — new public route (no session required)
  - Reads vault notes tagged `#blog-post` with `status: published`
  - Supports `?slug=` for single post, list for index
  - Wire up `agentplayground.net/blog` to call this endpoint
- **`/app/(app)/blog/page.tsx`** — in-app Blog Pipeline management page
  - Shows published / ready / draft counts
  - Lists all 12 planned posts from BLOGPOSTS.md with vault status
  - Instructions for agent-driven pipeline
- **Blog link** added to `components/Sidebar.tsx` (BookOpen icon)
- **HANDOFF.md** created (this file)
- **CLAUDE.md** trimmed — old session history moved to `docs/SESSION-HISTORY.md`
- Teams seeded on VPS via SSH

### Immediate next steps (priority order)
1. **Credit gate** — build `lib/credits.ts` + add check in `app/api/chat/route.ts` (see Billing Plan below)
2. **Admin credits panel** — manual grant UI at `/settings` or `/admin` so you can onboard first customers
3. **Landing page Block G** — Brain section + updated pricing + blog link
4. **Stripe keys** — wire up existing checkout routes to enable automated payment
5. **Client onboarding script** (`scripts/onboard-client.sh`) — makes delivery fast

### Files touched this session
- `scripts/seed-teams.ts` — +2 teams (Marketing, Blog)
- `app/api/blog/public/route.ts` — NEW
- `app/(app)/blog/page.tsx` — NEW
- `components/Sidebar.tsx` — +Blog nav link
- `HANDOFF.md` — NEW
- `CLAUDE.md` — trimmed (history archived)
- `docs/SESSION-HISTORY.md` — created with archived sessions

---

## Billing Plan — Path to Charging Customers

### Phase 1 — Credit Gate (2–3 hours, build next session)

**Goal:** Stop users from using unlimited Claude API for free.

**Files to create/edit:**
```
lib/credits.ts          — getUserCredits(userId), deductCredits(userId, amount)
app/api/chat/route.ts   — add gate before Claude call (lines ~80-100)
```

**Credit gate logic (add to chat route):**
```typescript
if (provider === 'anthropic') {
  const credits = await getUserCredits(session.user.id);
  if (credits.balance <= 0) {
    return Response.json({ error: 'No credits. Top up at /billing.' }, { status: 402 });
  }
}
// After streaming: deduct credits based on token usage
```

**Credit rates (already in CLAUDE.md):**
- Sonnet: 3 input + 15 output per 1k tokens
- Haiku: 0.25 input + 1.25 output per 1k tokens
- Ollama: free (no gate)

### Phase 2 — Admin Credits Panel (1 hour)

Add to `/settings` (admin only):
- List users with current credit balance
- "Grant credits" form → `POST /api/admin/credits { userId, amount }`
- This lets you manually top up first customers while payment automation is being built

**New route:** `app/api/admin/credits/route.ts`

### Phase 3 — Payment Flow (half day)

**Option A — Stripe (fastest automated path):**
- Get keys from dashboard.stripe.com
- Existing files already written: `app/api/billing/stripe/create-checkout/route.ts`
- Add `STRIPE_SECRET_KEY` + `STRIPE_WEBHOOK_SECRET` to VPS `.env.local`
- Webhook credits user on `checkout.session.completed` event
- Test with: `stripe listen --forward-to localhost:3000/api/webhooks/stripe`

**Option B — Crypto manual (current UI, manual verification):**
- Add "I've paid" button on billing page → creates support notification
- Admin verifies on-chain → manually grants credits via Phase 2 panel
- No automation, but works immediately without Stripe keys

**Recommendation:** Build Phase 1 + 2 immediately (stops abuse, enables first customers).
Add Stripe when you have 3+ paying customers and the manual flow becomes a bottleneck.

### Phase 4 — Monthly Credit Reset

File: `app/api/cron/route.ts`  
Add: on 1st of month → `resetMonthlyCredits()` for all active plan users.

---

## State Snapshot (what's live vs. not)

### Live on VPS ✅
- Core platform: Teams, Agents, Skills, Chat, Tools
- 2nd Brain: vault, MCP, graph, search, knowledge page
- Self-registration (`REQUIRE_INVITE_CODE=false`)
- Connect page (Claude Mobile/Desktop, ChatGPT, n8n)
- Brain push API (`/api/brain/push`)
- Agent team ↔ Brain config sync

### Built but needs env vars ⚠️
- Telegram bot (needs `TELEGRAM_BOT_TOKEN`)
- Email/WhatsApp channels (needs creds)
- MCP endpoint — live but needs API key distributed
- Crypto billing UI (needs wallet addresses updated in `billing/page.tsx`)

### Not built yet ❌
- Credit gate + credit deduction
- Admin credits panel
- Stripe payment automation
- Landing page Brain section (Block G)
- Admin monitoring panel
- Client onboarding script (`scripts/onboard-client.sh`)
- `agentplayground.net/blog` static page wired to `/api/blog/public`

---

## Agent Teams on VPS

Teams seeded by `scripts/seed-teams.ts`. Run inside Docker:
```bash
ssh -i ~/.ssh/id_ed25519 root@95.217.163.247
docker exec vps-dashboard npx tsx scripts/seed-teams.ts
```

Current teams (after this session):
1. Dev Core
2. DevOps & Infrastructure
3. Product & Design
4. Business & Growth
5. Command Center (Coordinator)
6. Marketing Team ← new
7. Blog Team ← new

---

## Quick Reference

| Thing | Where |
|---|---|
| VPS IP | 95.217.163.247 |
| App path on VPS | `/root/opt/vps/` |
| Deploy command | `scp file → restart container` (never git pull) |
| Wallet addresses | `app/(app)/billing/page.tsx` WALLETS constant |
| Blog post briefs | `docs/BLOGPOSTS.md` |
| Full task queue | `docs/MASTER-TODO.md` |
| Session history | `docs/SESSION-HISTORY.md` |
