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

## Current Session — 2026-05-18 (session 2)

### Done this session
- **Mobile-first responsive overhaul (iOS/PWA)**
  - `components/MobileNav.tsx` — NEW: iOS-style bottom tab bar with 4 primary tabs (Home, Chat, Teams, Brain) + "More" bottom-sheet drawer for all other pages. In-flow (not fixed) so it never overlaps content. Respects `env(safe-area-inset-bottom)` for iPhone home indicator.
  - `app/(app)/layout.tsx` — Sidebar wrapped in `hidden md:flex` (desktop only). Layout restructured to flex-column: `main` (flex-1) + `MobileNav` (in-flow shrink-0). No hacky pb offsets needed.
  - `app/(app)/chat/page.tsx` — Outer div `h-screen` → `h-full` so chat fills the constrained main height instead of breaking out to 100vh. Header padding `px-6` → `px-4 md:px-6`.
  - `app/(app)/dashboard/page.tsx` — Widget picker modal fixed `width:480px` → `w-full max-w-[480px] mx-4`. Page `p-6` → `p-4 md:p-6`.
  - `app/(app)/agent-lab/page.tsx` — TeamBuilder left preview panel `hidden md:flex` on mobile. Modal header/form padding responsive. Page `p-6` → `p-4 md:p-6`.
  - All 11 other page containers — `p-6` → `p-4 md:p-6` (billing, blog, brain/capture, connect, optimize, projects, schedule, server, settings, tools, users, websites).
  - `app/layout.tsx` — Added `viewport: Viewport` export with `viewportFit: "cover"` for iPhone notch/safe-area support.
  - Committed, pushed to GitHub, deployed to VPS (tar → scp → docker rebuild).
- **Marketplace plan reviewed**
  - Plan at `docs/MARKETPLACE-PLAN.md` — approved for next session
  - Suggested improvement: add `featured: boolean` to package JSON for curation; dedup check on `packageId` at install time before needing a DB table

### Immediate next steps (priority order)
1. **Build Marketplace** — `docs/MARKETPLACE-PLAN.md` is approved. ~4-6h. Files to create:
   - `data/packages/*.json` — 8 package JSON files
   - `app/(app)/marketplace/page.tsx` — browse UI
   - `app/api/marketplace/route.ts` — GET list
   - `app/api/marketplace/install/route.ts` — POST install
   - `components/Sidebar.tsx` — add Marketplace nav link (ShoppingBag icon)
2. **Add PNG icons** for PWA — generate from `public/icons/icon.svg` at 180×180, 192×192, 512×512 and add to `public/icons/`
3. **Credit gate** — `lib/credits.ts` + gate in `app/api/chat/route.ts` (see Billing Plan)
4. **Admin credits panel** — manual grant UI so you can onboard first customers
5. **Landing page Block G** — Brain section + updated pricing + blog link

### Files touched this session
- `components/MobileNav.tsx` — NEW
- `app/(app)/layout.tsx`
- `app/(app)/chat/page.tsx`
- `app/(app)/dashboard/page.tsx`
- `app/(app)/agent-lab/page.tsx`
- `app/(app)/billing/page.tsx`
- `app/(app)/blog/page.tsx`
- `app/(app)/brain/capture/page.tsx`
- `app/(app)/connect/page.tsx`
- `app/(app)/optimize/page.tsx`
- `app/(app)/projects/page.tsx`
- `app/(app)/schedule/page.tsx`
- `app/(app)/server/page.tsx`
- `app/(app)/settings/page.tsx`
- `app/(app)/tools/page.tsx`
- `app/(app)/users/page.tsx`
- `app/(app)/websites/page.tsx`
- `app/layout.tsx`
- `HANDOFF.md`

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
