# AgentPlayground — Master Plan & Audit

> Generated: 2026-03-27 | Keep this as the single source of truth.
> Update after each work session. Supersedes scattered notes in WORK_IN_PROGRESS.md.

---

## Current State

| Layer | Completion | Notes |
|-------|-----------|-------|
| UI / Frontend | ~70% | Polished, most pages exist |
| Auth | 95% | NextAuth v5 + bcrypt — solid |
| Database schema | 90% | Billing + pgvector ready, needs migration |
| Chat / Tool-use | 80% | Works end-to-end; minor gaps |
| Task executor | 70% | Runs tasks; no queue, no plan gating |
| File management | 10% | Was an iframe — now being rebuilt natively |
| Billing / Stripe | 5% | Schema + helpers exist; Stripe = 0% |
| Plan enforcement | 0% | Free users have full access right now |
| Agent memory | 0% | Embedding model in schema, not wired |
| Recurring task UI | 30% | Route exists, no enable/disable UI |
| Notifications | 90% | Resend email templates done, needs API key |
| VPS stack | 85% | Docker compose solid, needs deploy run |

---

## Security Audit

### Critical (fix before first paying customer)

| # | Vulnerability | File | Fix |
|---|--------------|------|-----|
| 1 | **No plan limit enforcement** — free users create unlimited teams + call Claude at your cost | `middleware.ts`, all API routes | Wire `canUseClaudeApi()` + `PLANS[plan].maxTeams` in each route |
| 2 | **XSS on chat rendering** — Claude markdown rendered raw | `app/(app)/chat/page.tsx` | Add `react-markdown` + `rehype-sanitize` |
| 3 | **Tools have no user context** — `executeTool()` doesn't know who called it; any user can modify any team | `lib/chat-tools.ts` | Pass `userId` + `session.role` into executeTool |
| 4 | **No login rate limiting** — `LIMITS.auth` defined but never wired | `app/(auth)/login/page.tsx` or auth route | Wire rate limit to login POST |

### High

| # | Vulnerability | File | Fix |
|---|--------------|------|-----|
| 5 | **In-memory rate limiter** — resets on deploy, no multi-instance support | `lib/rate-limit.ts` | Switch to Redis (ioredis) when going multi-instance |
| 6 | **Ollama has no rate limit** — only Anthropic calls are metered | `app/api/chat/route.ts:450` | Apply same `rateLimit()` call for Ollama provider |
| 7 | **`web_browse` uses regex HTML parsing** — crafted pages can inject tool output | `lib/chat-tools.ts` | Replace with Jina Reader API (`r.jina.ai/URL`) or readability |
| 8 | **`trackUsage()` is fire-and-forget** — token counts not passed (always 0) | `app/api/chat/route.ts:456` | Capture `totalInputTokens`/`totalOutputTokens` from streamAnthropic and pass to trackUsage |

### Medium

| # | Vulnerability | Fix |
|---|--------------|-----|
| 9 | No chat message length cap | Add `if (lastMessage.content.length > 100_000) return 400` |
| 10 | `api/health` exposes DB status publicly | Require `Authorization: Bearer $HEALTH_SECRET` or internal-only |
| 11 | No CSRF protection beyond NextAuth defaults | Explicitly set `SameSite=Strict` on auth cookies |
| 12 | `setup.sh` does `curl \| sh` with no integrity check | Add SHA256 checksum verification |

---

## Backend — What Is Missing (Full Checklist)

### Priority 1 — Revenue Blockers

#### 1.1 Plan Limit Enforcement
**Files to edit:** `app/api/teams/route.ts`, `app/api/agents/route.ts`, `app/api/chat/route.ts`

```typescript
// At top of POST /api/teams:
const session = await auth();
const plan = session.user.plan as Plan;
const teamCount = await prisma.agentTeam.count({ where: { /* user's teams */ } });
if (teamCount >= (PLANS[plan].maxTeams ?? Infinity)) {
  return NextResponse.json({ error: "Plan limit reached" }, { status: 403 });
}

// In chat route, before streaming:
const balance = await getCreditBalance(userId);
if (!canUseClaudeApi(plan, balance)) {
  return new Response("Upgrade to Pro to use Claude", { status: 402 });
}
```

**Note:** AgentTeam currently has no `userId` — you'll need to add ownership. Add `userId String` + `user User @relation(...)` to `AgentTeam` model + migration.

#### 1.2 Stripe Integration
**New files needed:**
- `app/api/billing/stripe/checkout/route.ts` — create Stripe checkout session
- `app/api/billing/stripe/webhook/route.ts` — handle `payment_intent.succeeded`, `checkout.session.completed`
- `app/(app)/billing/page.tsx` — billing UI (credit balance, packages, invoice history)

**Packages:** `npm install stripe`

**Flow:**
1. User clicks "Buy Credits" → POST `/api/billing/stripe/checkout` → redirect to Stripe hosted checkout
2. Stripe fires webhook → `checkout.session.completed` → call `addCredits(userId, amount, "purchase")`
3. User is redirected back to `/billing?success=true`

**Env vars needed:**
```
STRIPE_SECRET_KEY=sk_live_...
STRIPE_WEBHOOK_SECRET=whsec_...
NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_live_...
```

#### 1.3 Monthly Credit Reset (Cron)
**File:** `app/api/cron/route.ts`

Add to cron handler (runs every minute — skip if not 1st of month at 00:xx):
```typescript
const now = new Date();
if (now.getDate() === 1 && now.getHours() === 0) {
  const users = await prisma.user.findMany({ select: { id: true, plan: true } });
  for (const user of users) {
    await addCredits(user.id, monthlyFreeCredits(user.plan as Plan), "monthly_reset");
  }
}
```

#### 1.4 Team Ownership (Missing from Schema)
The `AgentTeam` model has no `userId`. This means:
- You can't enforce per-user team limits
- All teams are visible to all users (data leak risk in multi-tenant use)

**Migration needed:**
```prisma
model AgentTeam {
  ...
  userId    String?   // null = system/admin team
  user      User?     @relation(fields: [userId], references: [id])
}
```

### Priority 2 — Product Completeness

#### 2.1 Recurring Task UI
**File:** `app/(app)/schedule/page.tsx` (has shell, needs wiring)

The `RecurringTask` model and API exist. Need to add:
- Tab "Recurring" in the schedule page
- Table showing recurring tasks: title, cron expression, enabled toggle, last/next run
- Enable/disable toggle calls `PATCH /api/recurring-tasks/[id]`
- "Run Now" button calls `POST /api/task` with the task's prompt

#### 2.2 Agent Memory (pgvector)
**New file:** `lib/embeddings.ts`

```typescript
export async function embedText(text: string): Promise<number[]> {
  const ollamaUrl = process.env.OLLAMA_BASE_URL || "http://ollama:11434";
  const res = await fetch(`${ollamaUrl}/api/embeddings`, {
    method: "POST",
    body: JSON.stringify({ model: "nomic-embed-text", prompt: text }),
  });
  const { embedding } = await res.json();
  return embedding; // 768-dim
}

export async function semanticSearch(query: string, sourceType?: string, limit = 5) {
  const queryVec = await embedText(query);
  // Raw SQL for pgvector cosine distance
  return prisma.$queryRaw`
    SELECT id, content, "sourceType", "sourceId", metadata,
           1 - (vector <=> ${queryVec}::vector) AS similarity
    FROM file_embeddings
    ${sourceType ? Prisma.sql`WHERE "sourceType" = ${sourceType}` : Prisma.sql``}
    ORDER BY vector <=> ${queryVec}::vector
    LIMIT ${limit}
  `;
}
```

After each chat conversation, embed the last N messages for agent recall.

#### 2.3 Notifications (Nearly Done)
Only missing: `RESEND_API_KEY` env var. The templates, client, and send functions are complete.

Also add: notify on task failure + low credit balance warning email.

#### 2.4 Login Rate Limiting
**File:** `app/api/auth/[...nextauth]/route.ts` or auth.ts

Wire the existing `rateLimit("login:" + ip, LIMITS.auth.limit, LIMITS.auth.windowMs)` before credential check.

#### 2.5 Chat XSS Fix
**File:** `app/(app)/chat/page.tsx`

```bash
npm install react-markdown rehype-sanitize remark-gfm
```

Replace raw markdown rendering with:
```tsx
import ReactMarkdown from "react-markdown";
import rehypeSanitize from "rehype-sanitize";
import remarkGfm from "remark-gfm";

<ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeSanitize]}>
  {message.content}
</ReactMarkdown>
```

### Priority 3 — Growth Features

#### 3.1 API Keys for Programmatic Access
New schema model:
```prisma
model ApiKey {
  id        String   @id @default(cuid())
  userId    String
  user      User     @relation(...)
  name      String
  keyHash   String   @unique  // bcrypt hash
  lastUsed  DateTime?
  active    Boolean  @default(true)
  createdAt DateTime @default(now())
}
```

#### 3.2 Marketplace / Team Templates
- `GET /api/marketplace` — list public `AgentTeamConfig` records
- `POST /api/marketplace` — publish a team config (make it public)
- UI: `/marketplace` page with one-click import

#### 3.3 White-Label Config
```typescript
// lib/theme.ts
export const BRAND = {
  name: process.env.NEXT_PUBLIC_BRAND_NAME || "AgentPlayground",
  logo: process.env.NEXT_PUBLIC_BRAND_LOGO || "/logo.svg",
  primaryColor: process.env.NEXT_PUBLIC_BRAND_COLOR || "#a78bfa",
};
```

---

## File Management — Architecture (Newly Built)

### What was there: FileBrowser iframe (useless for agents)
### What was built: Native file manager with agent integration

**Storage:** Docker volume `filedata` → mounted at `/app/data/files/` in dashboard container
  Also mounted at `/srv/files` in FileBrowser (still available as external tool if needed)

**API Routes:**
| Route | Method | What it does |
|-------|--------|-------------|
| `/api/files` | GET | List directory contents with metadata |
| `/api/files` | POST | Create a new directory |
| `/api/files` | DELETE | Delete file or directory |
| `/api/files/upload` | POST | Upload one or more files (multipart) |
| `/api/files/download` | GET | Stream file download |
| `/api/files/embed` | POST | Embed file content into pgvector via Ollama |

**Chat Tools (agents can now):**
- `list_files(path?)` — list files/folders
- `read_file(path)` — read text file content (max 50KB)
- `write_file(path, content)` — create/overwrite a text file
- `delete_file(path)` — delete a file
- `search_files(query)` — semantic search across embedded files

**Embedding:** Uses Ollama `nomic-embed-text` model (768-dim vectors, free, local)
  Falls back gracefully if Ollama is not running.

---

## VPS — Ideal Workflow

### Recommended: Develop on VPS with Claude Code CLI

This is **far better** than developing locally because:
- Files live where they run — no sync, no Docker path confusion
- `docker compose` commands work directly
- Prisma migrations run against the real DB
- Can `curl` your own endpoints to test
- Claude Code can read logs, restart services, test changes end-to-end

**Step-by-step:**

```bash
# 1. Pick a VPS (recommended: Hetzner CX22 — €5/mo, 4 vCPU, 8 GB RAM)
# 2. SSH in as root
ssh root@YOUR_VPS_IP

# 3. Install tools
apt update && apt install -y git curl

# 4. Clone your repo (make it private first on GitHub)
git clone https://github.com/YOUR_USERNAME/agent-dashboard-ui-app.git /opt/vps
cd /opt/vps

# 5. Run setup
bash setup.sh  # prompts for domain, passwords, API keys

# 6. Install Claude Code CLI
npm install -g @anthropic-ai/claude-code

# 7. Set API key for Claude Code
export ANTHROPIC_API_KEY=sk-ant-...

# 8. Start Claude Code in the project directory
cd /opt/vps
claude

# 9. Claude Code can now:
#    - Edit files directly
#    - Run `docker compose` commands
#    - Run `npx prisma migrate dev`
#    - Test endpoints with curl
#    - Read container logs
```

**Development loop on VPS:**
```
Make change → `docker compose restart dashboard` → test at https://app.yourdomain.com
```

For DB changes:
```
Edit schema → npx prisma migrate dev --name description → restart dashboard
```

### Alternative: Local dev + deploy
Slower but works. Use `git push` → pull on VPS → `docker compose up --build`.

---

## Databases Setup

### What You Need

| Database | Purpose | Status |
|----------|---------|--------|
| PostgreSQL `agent_dashboard` | Main app DB | Auto-created by Docker |
| PostgreSQL `n8n` | n8n automation data | Auto-created by `scripts/init-db.sh` |
| pgvector extension | Vector similarity search | Enabled in `init-db.sh` |
| Redis | Rate limiting, cache, queues | Auto-created by Docker |

### You Do NOT Need

- External vector DB (Pinecone, Weaviate, etc.) — pgvector handles this
- External cache (Upstash, etc.) — Redis in Docker handles this for single-instance
- External search (Elasticsearch, etc.) — pgvector semantic + Prisma full-text is enough

### Database Setup Script
Run `bash scripts/setup-databases.sh` after first `docker compose up` to:
1. Create `n8n` database
2. Enable pgvector extension
3. Run Prisma migrations
4. Seed default admin user
5. Seed 5 default agent teams
6. Verify all tables exist

### After Schema Changes
```bash
# Run on VPS (or wherever Docker is running):
npx prisma migrate dev --name your-description
docker compose restart dashboard
```

### Pending Migrations
```bash
npx prisma migrate dev --name add-file-management     # FileRecord + FileEmbedding models
npx prisma migrate dev --name add-team-ownership      # AgentTeam.userId field
npx prisma migrate dev --name add-indexes             # DB indexes from Track C
npx prisma migrate dev --name add-api-keys            # ApiKey model (when building)
```

---

## API Keys You Need

### Required (app won't work without these)
| Key | Where to get | Used for |
|-----|-------------|---------|
| `ANTHROPIC_API_KEY` | console.anthropic.com → API Keys | Claude chat, task executor |
| `POSTGRES_PASSWORD` | You generate | Database auth |
| `AUTH_SECRET` | `openssl rand -hex 32` | NextAuth JWT signing |
| `CRON_SECRET` | `openssl rand -hex 32` | Cron endpoint auth |
| `N8N_ENCRYPTION_KEY` | `openssl rand -hex 32` | n8n workflow encryption |

### Required for Revenue
| Key | Where to get | Used for |
|-----|-------------|---------|
| `STRIPE_SECRET_KEY` | dashboard.stripe.com → Developers | Payment processing |
| `STRIPE_WEBHOOK_SECRET` | Stripe CLI or dashboard | Verify webhook events |
| `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` | Stripe dashboard | Frontend checkout |

### Nice to Have
| Key | Where to get | Used for |
|-----|-------------|---------|
| `RESEND_API_KEY` | resend.com | Email notifications (task complete, etc.) |
| `NOTIFICATION_EMAIL` | Your email | Recipient for all alerts |
| `OPENAI_API_KEY` | platform.openai.com | GPT models + OpenAI embeddings (optional) |

### You Do NOT Need
- AWS / GCP / Azure keys (self-hosted stack)
- Pinecone / Weaviate keys (pgvector handles embeddings)
- Upstash keys (Redis in Docker)
- Cloudflare API key (DNS only, done via dashboard)

---

## Open Source Strategy

### What to Open Source (free tier hook)
The dashboard shell WITHOUT pre-built teams. Users get:
- The full UI
- Auth + user management
- Chat with their own API key
- File manager
- n8n integration
- Ollama local model support
- 1-command VPS install

### What to Sell (paid)
1. **Pre-built team templates** — SEO Team, Lead Gen Team, Social Media Team, etc.
   Each comes with: system prompts, skills catalog, CLI functions, pre-wired API tools
2. **Managed hosting** — "We run it for you" — $29-99/mo
3. **White-label license** — Agencies resell it as their own — $200-500/mo
4. **Custom team development** — Build a team for a specific client workflow — $500-2000/project

### GitHub Repo Strategy
```
main branch        → latest stable (what gets deployed)
open-source branch → community version (no premium teams)
README             → "Deploy in 1 command" + screenshots + video demo
```

---

## Pre-Made Agent Teams (Revenue Roadmap)

### Immediate (Build First)

#### 1. SEO & Content Team
**Purpose:** Keyword research → content brief → draft → publish
**API Tools to wire:**
- Serper.dev API — Google search results ($0.001/query)
- Jina Reader — URL → clean text (free)
- Ahrefs API — keyword data (if budget allows)
**Skills:** keyword research, content outline, meta tags, internal linking
**Price:** $49/mo add-on

#### 2. Lead Generation Team
**Purpose:** ICP definition → prospect list → enrichment → outreach draft
**API Tools to wire:**
- Apollo.io API — contact/company data
- Hunter.io — email finder
- LinkedIn API (via PhantomBuster or Apify)
**Skills:** ICP research, prospect scoring, email personalization
**Price:** $79/mo add-on

#### 3. Client Reporting Team
**Purpose:** Pull analytics data → generate monthly report PDF
**API Tools to wire:**
- Google Analytics 4 API
- Google Search Console API
- Puppeteer (for PDF generation — already on VPS)
**Skills:** data analysis, report writing, PDF generation
**Price:** $39/mo add-on

#### 4. Social Media Team
**Purpose:** Content calendar → write posts → schedule
**API Tools to wire:**
- Buffer API or Hootsuite API
- Twitter/X API
- Unsplash API (images)
**Skills:** tone-of-voice matching, hashtag research, platform-specific formatting
**Price:** $39/mo add-on

### How to Add Your API Tools

1. Add tool definition to `lib/chat-tools.ts`:
```typescript
{
  name: "serper_search",
  description: "Search Google via Serper.dev and return top results",
  input_schema: {
    type: "object",
    properties: {
      query: { type: "string" },
      num: { type: "number", description: "Number of results (default 10)" }
    },
    required: ["query"]
  }
}
```

2. Add handler in `executeTool()`:
```typescript
case "serper_search": {
  const res = await fetch("https://google.serper.dev/search", {
    method: "POST",
    headers: { "X-API-KEY": process.env.SERPER_API_KEY!, "Content-Type": "application/json" },
    body: JSON.stringify({ q: input.query, num: input.num ?? 10 }),
  });
  return JSON.stringify(await res.json());
}
```

3. Add `SERPER_API_KEY` to `.env.local`
4. Seed a team with this skill in `scripts/seed-teams.ts`

---

## Docker Stack — Final Layout (OpenWebUI Removed)

```
Internet
  ↓ :443  → Traefik (TLS termination, Let's Encrypt)
              ├── app.DOMAIN    → Agent Dashboard  :3000  ← YOUR PRODUCT
              ├── n8n.DOMAIN    → n8n automation   :5678
              ├── files.DOMAIN  → FileBrowser       :80   ← external access
              ├── manage.DOMAIN → Portainer         :9000
              └── DOMAIN / www  → Nginx             :80   ← marketing site

Internal only:
  PostgreSQL :5432  ← Dashboard, n8n
  Redis      :6379  ← Rate limiting, cache
  Ollama     :11434 ← Dashboard (chat + embeddings), agents
```

**Removed:** Open WebUI — AgentPlayground chat IS the Ollama interface.

---

## Session Work Log

### 2026-03-27 — This session
- [x] Created this document (MASTER_PLAN.md)
- [x] Removed OpenWebUI from Docker stack
- [x] Added FileRecord + FileEmbedding to Prisma schema
- [x] Created /api/files routes (list, upload, download, delete, embed)
- [x] Rebuilt /files page as native file manager
- [x] Added file tools to chat-tools.ts (list_files, read_file, write_file, delete_file, search_files)
- [x] Created scripts/setup-databases.sh

### Pending Migrations (run these on VPS or local DB)
```bash
npx prisma migrate dev --name add-file-management
```

### Still To Do (next sessions)
- [ ] Wire plan limit enforcement into team/agent API routes
- [ ] Add team ownership (AgentTeam.userId) to schema + routes
- [ ] Stripe checkout + webhook routes
- [ ] Billing UI page (/billing)
- [ ] Monthly credit reset in cron
- [ ] Fix chat XSS (react-markdown + rehype-sanitize)
- [ ] Wire login rate limiting
- [ ] Recurring task UI in schedule page
- [ ] Seed demo data script
- [ ] Pre-built SEO team with Serper.dev tools
- [ ] Open-source README + install script
