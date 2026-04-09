# ROADMAP.md — AgentPlayground: Project → Business

> Last updated: 2026-04-08
> This is the single source of truth for what to build next and why.
> Cross-reference CLAUDE.md for current implementation status and BUSINESS-ROADMAP.md for go-to-market strategy.

---

## Current Honest State (2026-04-08)

### Works end-to-end
- Chat with Claude (streaming, tool-calling, coordinator/Keeper mode)
- Agent teams, agents, skills, CLI functions management
- Dashboard with drag-drop widgets
- Scheduling (one-off and recurring tasks)
- File management with vector embeddings
- Billing UI (balance display, credit packages UI)
- Stripe checkout API — code complete, just needs keys
- Stripe webhook — code complete, will credit user on payment
- Credit deduction — `trackUsage()` called in chat route, debits wallet
- User management at `/users` (admin only)

### Built but needs env keys to activate
- Stripe payments — needs `STRIPE_SECRET_KEY` + `STRIPE_WEBHOOK_SECRET` + webhook registered in Stripe dashboard
- BitPay — needs `BITPAY_API_KEY`
- Email notifications — needs `RESEND_API_KEY`

### Not yet built (schema or stub only)
- Plan enforcement — free users can call Claude unlimited right now
- Admin monitoring panel — no visibility into other users' usage
- Monthly credit reset — function exists, nothing calls it
- Self-registration — users must be created manually by admin
- Agent memory — schema exists, not wired to chat
- Telegram bridge — stub exists, not wired

---

## How It Works For You (Admin)

As the admin/owner on your own VPS:
- You pay nothing — you use Ollama (local) for free, or Claude at your own API cost
- No credit limits apply to your account (once plan enforcement is added, admins bypass it)
- You create/manage all other users manually at `/users`
- You set their plan (`free`, `pro`, `enterprise`) and can grant credits manually
- You see your own usage at `/billing` — once the admin panel is built, you'll see everyone's

---

## Phase 1 — Protect the Platform
**Goal:** Stop free users from draining your Anthropic bill. Admin bypasses all limits.
**Time estimate:** 1-2 days

### 1.1 Plan enforcement in chat route
**File:** `app/api/chat/route.ts`

Add before the streaming starts (after session check):
```typescript
import { getCreditBalance } from "@/lib/usage-tracker";
import { canUseClaudeApi } from "@/lib/pricing";

const plan = session.user.plan as string;
const provider = body.provider ?? "anthropic";

// Admin always passes
if (session.user.role !== "admin" && provider === "anthropic") {
  const balance = await getCreditBalance(userId);
  if (!canUseClaudeApi(plan, balance)) {
    return new Response(
      JSON.stringify({ error: "No credits remaining. Top up at /billing to continue using Claude." }),
      { status: 402, headers: { "Content-Type": "application/json" } }
    );
  }
}
```

### 1.2 Monthly credit reset in cron
**File:** `app/api/cron/route.ts`

Add logic so on the 1st of each month at midnight, all users get their plan's monthly free credits:
```typescript
import { addCredits } from "@/lib/usage-tracker";
import { PLANS } from "@/lib/pricing";

const now = new Date();
if (now.getDate() === 1 && now.getHours() === 0) {
  const users = await prisma.user.findMany({ select: { id: true, plan: true } });
  for (const user of users) {
    const planConfig = PLANS[user.plan as keyof typeof PLANS] ?? PLANS.free;
    if (planConfig.monthlyFreeCredits > 0) {
      await addCredits(user.id, planConfig.monthlyFreeCredits, "monthly_reset");
    }
  }
}
```

### What "done" looks like
- Free users hitting Claude get a 402 with a clear upgrade message
- Admin account is never blocked
- On the 1st of each month, all users receive their plan credits automatically

---

## Phase 2 — Accept Money
**Goal:** Stripe payments fully live so users can buy credits.
**Time estimate:** 1 day (mostly configuration, code is already written)

### 2.1 Add Stripe keys to `.env.local`
```bash
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
```

### 2.2 Register webhook in Stripe dashboard
- URL: `https://app.agentplayground.net/api/webhooks/stripe`
- Event: `checkout.session.completed`
- Copy the webhook signing secret → `STRIPE_WEBHOOK_SECRET`

### 2.3 Test the full flow
1. Log in as a non-admin user
2. Go to `/billing` → click a credit package → complete Stripe checkout
3. Verify balance increases in `/billing`
4. Check `docker logs vps-dashboard` for `[stripe-webhook] Added X credits`

### What "done" looks like
- Users can buy credits with a card at `/billing`
- Credits appear in their balance within seconds of payment
- You receive the money in your Stripe account

---

## Phase 3 — Admin Monitoring Panel
**Goal:** Full visibility into every user's activity, usage, and credits — from a single admin page.
**Time estimate:** 2-3 days

### New page: `/admin`
**File to create:** `app/(app)/admin/page.tsx`
**Middleware:** Already protects admin-only routes — add `/admin` to the admin-only list in `middleware.ts`

#### Tab 1 — Overview
Platform-wide stats:
- Total users (active vs disabled)
- Total API spend this month (sum of all `ApiUsage.credits` for current month)
- Your Anthropic cost this month (credits × $0.000001 per credit ≈ real cost)
- Most active users (top 5 by credits used this month)
- New users in last 7 days

API endpoint needed: `GET /api/admin/overview`
```typescript
// Returns: { totalUsers, activeUsers, totalCreditsUsed, topUsers[], newUsersThisWeek }
```

#### Tab 2 — Users + Usage
Extends the existing `/users` page with two extra columns:
- **Balance** — current credit balance
- **This month** — credits used this month

Also add a "Grant Credits" button per user (calls existing `addCredits()` logic).

API endpoint needed: `GET /api/admin/users` (admin version of users list with billing data joined)

#### Tab 3 — Activity Feed
Recent `ApiUsage` records across all users:
- Who called what
- How many credits
- Which model/endpoint
- Timestamp

API endpoint needed: `GET /api/admin/activity?limit=50`

### Files to create/edit
```
app/(app)/admin/page.tsx          — new admin panel page
app/api/admin/overview/route.ts   — platform metrics
app/api/admin/users/route.ts      — users list with usage data
app/api/admin/activity/route.ts   — recent activity feed
middleware.ts                      — add /admin to admin-only gate
components/Sidebar.tsx             — add Admin link (visible only to admin role)
```

### What "done" looks like
- You open `/admin` and see exactly who is using the platform and how much it's costing you
- You can grant credits to any user from the UI
- You can disable a user instantly if something looks wrong

---

## Phase 4 — User Onboarding
**Goal:** Users can register themselves and receive a welcome email. You don't have to create accounts manually.
**Time estimate:** 1-2 days

### 4.1 Self-registration page
**New file:** `app/(auth)/register/page.tsx`

- Email + password + name form
- Creates user with `role: "user"`, `plan: "free"`
- Auto-creates a `UserCredits` record with the free plan's monthly starting credits
- Redirects to login (or auto-logs in)

**New file:** `app/api/auth/register/route.ts`
- POST endpoint for registration
- Add to public routes in `middleware.ts`

### 4.2 Welcome email
**File:** `lib/notify.ts` (create if not exists)

After user creation, send a welcome email via Resend:
- Subject: "Welcome to AgentPlayground"
- Body: login link + quick start guide

Requires `RESEND_API_KEY` in `.env.local`.

### What "done" looks like
- Anyone can visit `https://app.agentplayground.net/register` and sign up
- They start with free tier credits and Ollama-only access
- They receive a welcome email
- You can still manually upgrade their plan at `/users`

---

## Phase 5 — Real Integrations in Agent Teams
**Goal:** The 5 pre-built agent teams have actual tools wired to real APIs, making them genuinely useful products.
**Time estimate:** Ongoing — 1-3 days per team

### How to add an API tool (pattern)

**Step 1** — Add tool definition to `lib/chat-tools.ts`:
```typescript
{
  name: "your_tool_name",
  description: "What it does",
  input_schema: {
    type: "object",
    properties: {
      param: { type: "string", description: "..." }
    },
    required: ["param"]
  }
}
```

**Step 2** — Add handler in `executeTool()` in `lib/chat-tools.ts`:
```typescript
case "your_tool_name": {
  const res = await fetch("https://api.example.com/endpoint", {
    headers: { "Authorization": `Bearer ${process.env.YOUR_API_KEY}` },
    ...
  });
  return JSON.stringify(await res.json());
}
```

**Step 3** — Add env var to `.env.local` and `.env.example`

**Step 4** — Update the relevant team in `scripts/seed-teams.ts` to mention this skill

### Teams → Integrations to build

| Team | Tools to wire | API keys needed |
|------|--------------|----------------|
| Dev Core | GitHub API (issues, PRs, repos) | `GITHUB_TOKEN` |
| DevOps | Server health check, docker stats via SSH | `SSH_HOST`, `SSH_KEY` |
| Product | Linear/Jira API for issue tracking | `LINEAR_API_KEY` |
| Business | Google Analytics, Search Console | `GOOGLE_SERVICE_ACCOUNT_JSON` |
| Command Center | All of the above + Telegram alerts | `TELEGRAM_BOT_TOKEN` |

### High-value standalone tools
- **Serper.dev** — real Google search results ($0.001/query, way better than current `web_search`)
- **Jina Reader** (`r.jina.ai/URL`) — clean page text extraction (free, replace current brittle web_browse)
- **Resend** — send emails from agents

---

## Phase 6 — Admin API Keys for Programmatic Access
**Goal:** Power users and developers can call the platform via API (not just browser).
**Time estimate:** 2-3 days

### New schema model
```prisma
model ApiKey {
  id        String    @id @default(cuid())
  userId    String
  user      User      @relation(fields: [userId], references: [id])
  name      String
  keyHash   String    @unique
  lastUsed  DateTime?
  active    Boolean   @default(true)
  createdAt DateTime  @default(now())
}
```

### New routes
- `GET /api/keys` — list user's API keys
- `POST /api/keys` — generate new key (returns plaintext once, stores hash)
- `DELETE /api/keys/[id]` — revoke key

### Middleware change
Accept `Authorization: Bearer <apikey>` as an alternative to session cookie in API routes.

---

## Phase 7 — Scale & White-Label
**Goal:** Sell the platform to agencies who run it for their clients under their own brand.
**Time estimate:** 3-5 days

### White-label config
**New file:** `lib/theme.ts`
```typescript
export const BRAND = {
  name: process.env.NEXT_PUBLIC_BRAND_NAME ?? "AgentPlayground",
  primaryColor: process.env.NEXT_PUBLIC_BRAND_COLOR ?? "#a78bfa",
};
```

Add these to `.env.example` and wire `BRAND.name` into the layout title and sidebar.

### Team templates marketplace
- `GET /api/marketplace` — list public `AgentTeamConfig` records
- `POST /api/marketplace` — publish a team config
- UI: `/marketplace` page, one-click import via existing `/api/import-team`

---

## Execution Order (recommended)

```
Week 1:  Phase 1 (plan enforcement)  ← prevents abuse before you have users
Week 1:  Phase 2 (Stripe keys)       ← 30 min of configuration
Week 2:  Phase 3 (admin panel)       ← gives you visibility
Week 3:  Phase 4 (self-registration) ← now you can have real users
Ongoing: Phase 5 (integrations)      ← what makes teams actually useful
Later:   Phase 6, 7                  ← when you have traction
```

---

## Security Gaps to Fix Before Public Launch

| Priority | Issue | File | Fix |
|----------|-------|------|-----|
| Critical | No plan limit enforcement | `app/api/chat/route.ts` | Phase 1 above |
| High | Tools have no user context — any user can modify any team | `lib/chat-tools.ts` | Pass `userId` + `role` into `executeTool()` |
| High | No login rate limiting | `auth.ts` | Wire `rateLimit()` to credential check |
| Medium | XSS on chat markdown rendering | `app/(app)/chat/page.tsx` | Add `react-markdown` + `rehype-sanitize` |
| Medium | `web_browse` uses brittle regex HTML parsing | `lib/chat-tools.ts` | Replace with Jina Reader API |
| Medium | Token counts not passed to trackUsage (always 0) | `app/api/chat/route.ts` line ~500 | Pass `totalInputTokens`/`totalOutputTokens` from `streamAnthropic()` return value |
