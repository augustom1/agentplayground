# Session Handoff
> Last updated: 2026-05-18
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

## Current Session — 2026-05-18 (session 3)

### Done this session
- **Meeting / Event scheduling feature** — full end-to-end:
  - `prisma/schema.prisma` — Added `Meeting` model (title, scheduledFor, reminderMins, participants JSON, status)
  - `app/api/meetings/route.ts` — GET (all/upcoming) + POST
  - `app/api/meetings/[id]/route.ts` — PATCH (update status/participants) + DELETE
  - `lib/chat-tools.ts` — Added `schedule_meeting` tool (tool #34). Agents can now schedule meetings from chat. The coordinator knows to use this when users mention meetings/syncs.
  - `app/(app)/schedule/page.tsx` — Added **Meetings tab**: list of meetings with participant chips (user/agent), reminder badge, mark-done + delete. **Schedule Meeting modal**: title, date/time, agenda, reminder picker (5m–1d), participant builder (add humans by name + agents from team dropdown).
  - `app/(app)/projects/page.tsx` — Added **Upcoming Meetings section** at top of Projects page showing next 5 meetings with reminder indicators. Links to Schedule page.
  - `app/api/chat/route.ts` — Coordinator context now injects upcoming meetings (next 24h) into system prompt. Highlights meetings in the reminder window with ⚠️.
  - `app/(app)/chat/page.tsx` — Added **meeting reminder banner** between header and messages. Checks `/api/meetings?upcoming=true` on load + every 60s. Shows amber banner "📅 Meeting in X min: Title" that can be dismissed.
- **Phone UI/UX audit file** — `docs/PHONE-UX-TODO.md` created with specific issues to fix and implementation approach for next phone-focused session.
- **UX Redesign Plan** — `docs/UX-REDESIGN-PLAN.md` created. New navigation: Home / Chat / Teams / Playground (Projects+Schedule+Meetings+Work Queue) / Stack (Optimize+Server+Websites+Tools+Connect+Blog) / Settings (Billing+Users+Language). "Grandpa UX" principles documented. 4-phase implementation checklist ready.

### ⚠️ Required deploy step (DB schema changed)
```bash
# On VPS after deploying files:
docker exec vps-dashboard npx prisma db push
docker exec vps-dashboard npx prisma generate
# Or on your local machine: npx prisma generate && npx prisma db push
```

### Immediate next steps (priority order)
1. **UX Redesign** — `docs/UX-REDESIGN-PLAN.md` is fully specced. This is the top priority. User wants the app to be intuitive for non-technical users ("grandpa UX"). Full plan with 4 phases and implementation checklist is ready. ~5–8h total.
   - Phase 1: Navigation restructure (Sidebar groupings, MobileNav, Playground + Stack hub pages)
   - Phase 2: Empty states + plain English audit
   - Phase 3: Mobile-specific fixes (from `docs/PHONE-UX-TODO.md`)
   - Phase 4: Language file (separate session)
2. **Build Marketplace** — `docs/MARKETPLACE-PLAN.md` is approved. ~4-6h. Files to create:
   - `data/packages/*.json` — 8 package JSON files
   - `app/(app)/marketplace/page.tsx` — browse UI
   - `app/api/marketplace/route.ts` — GET list
   - `app/api/marketplace/install/route.ts` — POST install
   - `components/Sidebar.tsx` — add Marketplace nav link (ShoppingBag icon)
3. **Phone UI/UX fixes** — See `docs/PHONE-UX-TODO.md`. Test on real device first, audit each screen.
4. **Add PNG icons** for PWA — generate from `public/icons/icon.svg` at 180×180, 192×192, 512×512 and add to `public/icons/`
5. **Credit gate** — `lib/credits.ts` + gate in `app/api/chat/route.ts` (see Billing Plan)
6. **Admin credits panel** — manual grant UI so you can onboard first customers
7. **Landing page Block G** — Brain section + updated pricing + blog link

### Files touched this session
- `prisma/schema.prisma` — Meeting model added
- `app/api/meetings/route.ts` — NEW
- `app/api/meetings/[id]/route.ts` — NEW
- `lib/chat-tools.ts` — schedule_meeting tool added
- `app/(app)/schedule/page.tsx` — Meetings tab added
- `app/(app)/projects/page.tsx` — Upcoming meetings section added
- `app/api/chat/route.ts` — Coordinator meeting context injection
- `app/(app)/chat/page.tsx` — Meeting reminder banners
- `docs/PHONE-UX-TODO.md` — NEW
- `HANDOFF.md`

---

## Previous Session — 2026-05-18 (session 2)

### Done
- Mobile-first responsive overhaul: MobileNav bottom tab bar, `hidden md:flex` sidebar, all pages `p-4 md:p-6`, chat `h-full` fix, all modal widths responsive
- Marketplace plan reviewed + approved (`docs/MARKETPLACE-PLAN.md`)

---

## Previous Session — 2026-05-18 (session 1)

### Done
- **PWA / iOS "Add to Home Screen"** — manifest, apple meta, icon.svg
  - ⚠️ **Still needed**: PNG icons at 180×180, 192×192, 512×512
- **Direct Agent Editor** — `AgentEditModal` in agent-lab with PATCH/DELETE API
- **Marketplace Plan** — written at `docs/MARKETPLACE-PLAN.md`, reviewed this session, approved

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

**Option B — Crypto manual (current UI, manual verification):**
- Add "I've paid" button on billing page → creates support notification
- Admin verifies on-chain → manually grants credits via Phase 2 panel

**Recommendation:** Build Phase 1 + 2 immediately. Add Stripe when you have 3+ paying customers.

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
- **Mobile-first UI (bottom nav, responsive pages)** ← new this session

### Built but needs env vars ⚠️
- Telegram bot (needs `TELEGRAM_BOT_TOKEN`)
- Email/WhatsApp channels (needs creds)
- MCP endpoint — live but needs API key distributed
- Crypto billing UI (needs wallet addresses updated in `billing/page.tsx`)

### Not built yet ❌
- Marketplace (`docs/MARKETPLACE-PLAN.md` approved — build next)
- Credit gate + credit deduction
- Admin credits panel
- Stripe payment automation
- Landing page Brain section (Block G)
- Admin monitoring panel
- PNG icons for PWA (180/192/512px)
- `agentplayground.net/blog` static page wired to `/api/blog/public`

---

## Agent Teams on VPS

Teams seeded by `scripts/seed-teams.ts`. Run inside Docker:
```bash
ssh -i ~/.ssh/id_ed25519 root@95.217.163.247
docker exec vps-dashboard npx tsx scripts/seed-teams.ts
```

Current teams:
1. Dev Core
2. DevOps & Infrastructure
3. Product & Design
4. Business & Growth
5. Command Center (Coordinator)
6. Marketing Team
7. Blog Team

---

## Quick Reference

| Thing | Where |
|---|---|
| VPS IP | 95.217.163.247 |
| App path on VPS | `/root/opt/vps/` |
| Deploy command | `scp file → restart container` (never git pull) |
| Wallet addresses | `app/(app)/billing/page.tsx` WALLETS constant |
| Marketplace plan | `docs/MARKETPLACE-PLAN.md` |
| Blog post briefs | `docs/BLOGPOSTS.md` |
| Full task queue | `docs/MASTER-TODO.md` |
| Session history | `docs/SESSION-HISTORY.md` |
