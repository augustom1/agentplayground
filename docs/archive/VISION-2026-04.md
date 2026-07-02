# VISION.md — Agent Playground

> **Read this file at the start of every Claude Code session.**
> It defines the product vision, the current state of the codebase, deployment
> constraints, and what to build next. All code changes must align with this doc.

---

## SECTION 1: INSTRUCTIONS FOR CLAUDE CODE

### Current Stack (what already exists and works)

```
Framework:      Next.js 16 (App Router) with output: "standalone"
Runtime:        React 19 / Node 20+
Database:       PostgreSQL 16 + pgvector via Prisma 7
                Prisma uses @prisma/adapter-pg (driver adapter, NOT the default engine)
AI:             Anthropic Claude SDK (@anthropic-ai/sdk) + OpenAI SDK
Local LLM:      Ollama (separate container, qwen2.5 models)
Auth:           NextAuth v5 (beta.30) with bcryptjs
Styling:        Tailwind CSS v4
Validation:     Valibot (NOT Zod — do not introduce Zod)
Email:          Resend SDK
Testing:        Vitest + Testing Library + jsdom
Linting:        ESLint 9 + eslint-config-next
Build:          Multi-stage Dockerfile → standalone output → entrypoint.sh runs prisma db push → node server.js
Containers:     docker-compose.yml (dev) + docker-compose.prod.yml (production with Traefik)
Services:       PostgreSQL, Redis, Ollama, n8n, Nginx, FileBrowser, Portainer, Cron
```

### Build & Deploy Facts

- `next.config.ts` has `output: "standalone"`, `eslint: { ignoreDuringBuilds: true }`, `typescript: { ignoreBuildErrors: true }`
- The Dockerfile is a 3-stage build: deps → builder (prisma generate + next build) → runner (alpine, non-root user `nextjs`)
- The runner copies `.next/standalone`, `.next/static`, full `node_modules` (for prisma CLI), and `prisma/` dir
- `entrypoint.sh` validates AUTH_SECRET, warns if ANTHROPIC_API_KEY missing, runs `prisma db push --skip-generate`, then `exec node server.js`
- Production uses Traefik for HTTPS/SSL with Let's Encrypt, subdomains for each service
- `scripts/init-db.sh` creates separate databases per service on the shared PostgreSQL

### Critical Rules

1. **Do NOT break the Docker build.** After any change, verify mentally that:
   - `npm run build` will succeed (or at least not regress)
   - `prisma generate` will work with the current schema
   - `entrypoint.sh` will still run `prisma db push` successfully
   - The standalone output includes all necessary files

2. **Do NOT add heavy dependencies.** Every new npm package adds to the Docker image size and memory footprint. Justify any addition. Prefer built-in Node.js APIs and existing deps. The target is a lean image under 300 MB.

3. **Do NOT introduce Zod.** The project uses Valibot for validation. Do not mix validation libraries.

4. **Do NOT change the Prisma adapter pattern.** The project uses `@prisma/adapter-pg` (PostgreSQL driver adapter). Do not switch to the default Prisma query engine or introduce a different database driver unless implementing the laptop mode SQLite fallback described below.

5. **Do NOT use `\n` for Next.js version assumptions.** This project runs Next.js 16 which may differ from your training data. Check `node_modules/next/dist/docs/` before writing routing or API code if unsure.

6. **Preserve the entrypoint pattern.** The app auto-migrates on startup via `prisma db push`. Do not change this to `prisma migrate deploy` without discussion — the current approach is deliberate for the VPS use case.

7. **Keep all environment variables documented.** If you add a new env var, add it to `.env.local.example` and document it in DEPLOYMENT.md.

8. **Test before suggesting done.** Run `npm run build` if possible. Run `npx tsc --noEmit` to catch type errors. Run `vitest run` if tests exist for the area you changed.

### Current File Structure

```
app/
  api/          ← REST API routes
  agent-lab/    ← merged playground + teams UI
  chat/         ← AI chat (primary interface)
  dashboard/    ← customizable widget dashboard
  schedule/     ← monthly calendar
  settings/     ← configuration pages
lib/
  modules/      ← extractable modules for reuse
  prisma.ts     ← database client
  chat-tools.ts ← Claude tool definitions
  db-agent.ts   ← database access layer
prisma/
  schema.prisma ← database schema
components/     ← shared React components
scripts/        ← setup, backup, seeding scripts
docs/           ← architecture documentation
public/         ← static assets
test/           ← test files
```

### What to Work on Right Now

**Priority: Get the existing app deploying cleanly to VPS.**

If there are build errors, type errors, or runtime failures, fix those FIRST
before adding any new features. The deployment pipeline is:

```
git push → ssh to VPS → git pull → docker compose up -d --build
```

The build must succeed. The containers must start. The health checks must pass.

**Common deployment issues to watch for:**
- Prisma schema changes that break `prisma db push` against existing data
- Missing environment variables in production
- Import paths that work in dev but break in standalone output
- Server components importing client-only code
- API routes that fail because Ollama/Redis/other services aren't ready yet

---

## SECTION 2: PRODUCT VISION

### What Agent Playground Is

Agent Playground is a self-hosted AI operations platform where you talk to one
entity — the **Playground Keeper** — and it handles everything. You don't pick
features from a menu. You tell the Keeper what you need and it assembles the
right agents, creates the right projects, connects the right tools, and works.

The platform can be anything: a content studio, a DevOps control center, a sales
engine, a research lab, a development environment. It becomes what the user needs
by growing organically through conversation.

### Two Deployment Modes

The app must run in two environments. This is a hard constraint — every feature
must work in both modes or degrade gracefully.

**Laptop Mode** — try it without a VPS:
- Runs with `npm run dev` or a single Docker container
- SQLite instead of PostgreSQL (via Prisma's multi-provider support)
- In-memory queue instead of Redis + BullMQ
- node-cron instead of Docker cron container
- No Nginx, Traefik, Portainer, FileBrowser needed
- Local filesystem for files instead of FileBrowser
- Ollama optional (user installs separately if they want local LLM)
- Minimum: 4 GB RAM, 2 cores, 2 GB disk

**VPS Mode** — full production (current default):
- Full Docker Compose stack
- PostgreSQL + pgvector, Redis + BullMQ, Ollama
- Traefik for HTTPS, n8n for automation
- Target: runs comfortably in 4 GB RAM

**Mode switching:**
```
PLAYGROUND_MODE=laptop   → SQLite, in-memory queue, node-cron
PLAYGROUND_MODE=vps      → PostgreSQL, Redis/BullMQ, Docker cron (default)
```

When implementing laptop mode, use Prisma's multi-provider capability. The
schema stays the same, the datasource switches. Features that require pgvector
(semantic search) fall back to keyword search in laptop mode.

### Lean Memory Architecture

The platform must be frugal with RAM. Target: full VPS stack in 4 GB.

**Memory budget (VPS mode):**
| Service          | Target    |
|------------------|-----------|
| Next.js app      | 200-400 MB |
| PostgreSQL       | 200-400 MB |
| Redis            | 50-100 MB  |
| Ollama (idle)    | 100-200 MB |
| Ollama (active)  | 1-3 GB (small models only) |
| BullMQ Worker    | 100-200 MB |
| OS + Docker      | 300-500 MB |

**Rules (enforce these in all code):**
1. No unbounded in-memory arrays. Paginate everything from the database.
2. Redis keys must have TTLs. Nothing lives forever.
3. Ollama: `OLLAMA_KEEP_ALIVE=5m`, `OLLAMA_MAX_LOADED_MODELS=1`. Models unload when idle.
4. Prisma connection pool: max 5 connections (not the default).
5. Activity logs auto-prune after 90 days.
6. Chat history: load last 50 messages, paginate on scroll.
7. Dashboard widgets lazy-load and paginate.
8. Optional services use Docker Compose profiles — don't start what isn't configured.

**Docker Compose profiles for optional services:**
```yaml
telegram-bridge:
  profiles: ["telegram"]
discord-bridge:
  profiles: ["discord"]
n8n:
  profiles: ["automation"]
filebrowser:
  profiles: ["files"]
portainer:
  profiles: ["management"]
```

Bare `docker compose up -d` starts only the essentials (~1.5 GB).

### The Playground Keeper

The Keeper is the central intelligence. Every user interaction starts here.

**What the Keeper does:**
- Receives all messages from all channels (web, Telegram, Discord, API, etc.)
- Understands context: projects, active agents, running tasks
- Routes tasks to the right agent teams
- Creates new agents, teams, and projects on demand
- Automates recurring work ("weekly sales report" → sets it up)
- Reports on system state by querying other agents
- Manages agent lifecycle: activate, retire, reassign

**The Keeper is the only agent the user needs to know about.** Users don't learn
internal routing. They talk to the Keeper and things happen.

### Projects

A **project** is the primary organizing unit.

- Groups agents, tasks, data, and outputs around a goal
- Has assigned agent teams who collaborate through shared project context
- Can be: `one-time`, `recurring`, or `permanent`
- Status: `active`, `paused`, `completed`, `archived`
- Outputs delivered to a configurable channel (chat, Telegram, email)

**Examples:**
- "Scrape emails for VPS outreach" → Research + Marketing teams, one-time
- "Manage company website" → DevOps team, permanent
- "Weekly sales report" → Analytics agent, recurring
- "YouTube content pipeline" → Content team, recurring
- "Server monitoring" → DevOps team, permanent

**How projects get created:** User describes what they want → Keeper creates the
project, assigns teams, starts work. No manual project creation required.

### Agent Teams

Teams are groups of agents with complementary skills.

**States:**
- **Active** — assigned to project(s), working
- **Standby** — available but not assigned
- **Retired** — deactivated, config and memory preserved, reactivable

**Management via Keeper:**
- "What teams do I have?" → lists all with status
- "Retire the Research team" → deactivates, preserves config
- "Bring back the Research team" → reactivates with memory intact
- "Which teams are idle?" → shows unused teams with last activity

**Permanent operations teams:**
- Server Management — health, updates, Docker
- Website Management — sites, deployments, SSL
- Channel Management — Telegram/Discord bots, email routing

### Skill Registry & Ecosystem

Skills are packaged tools that agents use. A skill = tool definition + handler + docs.

**Discovery flow:** Local registry → built-in skills → marketplace search → create custom.

**Creating skills via Keeper:** User describes what they need → Keeper generates
tool definition + handler → tests in sandbox → installs.

**Safe skill rules (enforced):**
- Declare all access (filesystem, network, database, shell)
- Network: whitelist domains
- Shell: command allowlists
- Database: Prisma ORM only, no raw SQL
- Rate limits per skill
- Cost caps for paid-API skills
- All executions logged

**Marketplace:** Community shares and sells skills. 70/30 revenue split (creator/platform).

### Guided Growth

The platform doesn't force choices. The Keeper suggests growth paths based on usage:

"You're posting content manually. I can connect Twitter for auto-posting."
"No backup schedule yet. Want me to set up daily backups?"
"Research team has been idle 2 weeks. Retire or give them a new project?"

Growth guides are embedded in the Keeper's knowledge, not external docs.

### UI Theming

Two themes, switchable in settings or via Keeper ("switch to dark mode"):

- **Light:** white/gray backgrounds, dark text
- **Dark:** black/dark-gray backgrounds, white text

Implement with CSS custom properties on `[data-theme]`. Never hardcode colors.

---

## SECTION 3: ARCHITECTURE & SCHEMA

### Architecture

```
EXTERNAL CHANNELS (Web · Telegram · Discord · Email · Webhooks · API)
         │
         ▼
   PLAYGROUND KEEPER
   Classifies · Routes · Creates projects · Manages teams
         │
    ┌────┼────────────┐
    ▼    ▼            ▼
 PROJECT A   PROJECT B   PERMANENT OPS
 Teams +     Teams +     Server/Website/
 Context     Context     Channel Mgmt
    │         │            │
    ▼         ▼            ▼
      SKILL REGISTRY
      Built-in · User · Marketplace
              │
              ▼
       EXECUTION LAYER
       Shell · Docker · APIs · DB · Files
       (sandboxed, logged, cost-tracked)
              │
              ▼
       INFRASTRUCTURE
       PostgreSQL · Redis · Ollama · n8n · Docker
```

### Database Schema Additions

Add these models to the existing `prisma/schema.prisma`. All include `tenantId`
for future multi-tenant support. Do NOT remove or modify existing models.

```prisma
// ── Projects ──────────────────────────────────────────────
model Project {
  id              String    @id @default(cuid())
  tenantId        String    @default("default")
  name            String
  description     String?
  status          String    @default("active")    // active, paused, completed, archived
  type            String    @default("one-time")   // one-time, recurring, permanent
  schedule        Json?                             // {cron, lastRun, nextRun}
  deliveryChannel String?                           // where to send outputs
  createdAt       DateTime  @default(now())
  updatedAt       DateTime  @updatedAt
}

model ProjectTeam {
  id        String   @id @default(cuid())
  projectId String
  teamId    String
  role      String?
  joinedAt  DateTime @default(now())
  @@unique([projectId, teamId])
}

model ProjectOutput {
  id        String   @id @default(cuid())
  projectId String
  type      String                                  // report, content, data, file
  title     String?
  content   Json?
  filePath  String?
  agentId   String
  createdAt DateTime @default(now())
}

// ── Channels & Routing ───────────────────────────────────
model Channel {
  id        String   @id @default(cuid())
  tenantId  String   @default("default")
  type      String                                  // telegram, discord, email, webhook
  name      String
  config    Json                                    // encrypted credentials
  active    Boolean  @default(true)
  createdAt DateTime @default(now())
}

model ChannelMessage {
  id             String   @id @default(cuid())
  tenantId       String   @default("default")
  channelId      String
  direction      String                             // inbound, outbound
  externalUserId String?
  content        String
  metadata       Json?
  agentId        String?
  projectId      String?
  createdAt      DateTime @default(now())
}

model RoutingRule {
  id              String  @id @default(cuid())
  tenantId        String  @default("default")
  channelId       String?
  pattern         String?
  intentClass     String?
  targetAgentId   String?
  targetProjectId String?
  priority        Int     @default(0)
  active          Boolean @default(true)
}

// ── Skills ───────────────────────────────────────────────
model Skill {
  id           String   @id @default(cuid())
  tenantId     String?                              // NULL = global
  name         String
  description  String
  version      String   @default("1.0.0")
  author       String
  category     String
  toolDef      Json
  handlerCode  String
  readme       String?
  agentGuide   String?
  accessDecl   Json?
  pricing      String   @default("free")
  pricePerCall Float?
  source       String                               // builtin, user, marketplace
  installed    Boolean  @default(true)
  createdAt    DateTime @default(now())
}

// ── Agent Memory ─────────────────────────────────────────
model AgentMemory {
  id         String    @id @default(cuid())
  tenantId   String    @default("default")
  ownerType  String                                 // agent, team, project, system
  ownerId    String
  content    String
  memoryType String                                 // fact, preference, decision, output
  importance Float     @default(0.5)
  createdAt  DateTime  @default(now())
  accessedAt DateTime  @default(now())
  expiresAt  DateTime?
  // NOTE: Add vector column manually in VPS mode after migration:
  // ALTER TABLE "AgentMemory" ADD COLUMN embedding vector(1536);
  // Do NOT put Unsupported("vector") in schema — breaks laptop SQLite mode
}

// ── Content Pipeline ─────────────────────────────────────
model ContentItem {
  id        String   @id @default(cuid())
  tenantId  String   @default("default")
  projectId String?
  type      String                                  // post, image, video, article
  title     String?
  body      String?
  mediaUrls String[]
  status    String   @default("draft")
  brandId   String?
  agentId   String
  createdAt DateTime @default(now())
}

model ContentSchedule {
  id          String    @id @default(cuid())
  tenantId    String    @default("default")
  contentId   String
  platform    String
  accountId   String
  scheduledAt DateTime
  publishedAt DateTime?
  status      String   @default("pending")
  result      Json?
}

model SocialAccount {
  id          String  @id @default(cuid())
  tenantId    String  @default("default")
  platform    String
  handle      String
  credentials Json
  brandId     String?
  active      Boolean @default(true)
}

model BrandProfile {
  id         String   @id @default(cuid())
  tenantId   String   @default("default")
  name       String
  tone       String?
  style      String?
  colors     Json?
  hashtags   String[]
  audience   String?
  guidelines String?
}

// ── CRM ──────────────────────────────────────────────────
model Contact {
  id        String   @id @default(cuid())
  tenantId  String   @default("default")
  name      String
  email     String?
  phone     String?
  company   String?
  source    String?
  tags      String[]
  notes     String?
  score     Int      @default(0)
  createdAt DateTime @default(now())
}

model OutreachSequence {
  id       String  @id @default(cuid())
  tenantId String  @default("default")
  name     String
  steps    Json
  active   Boolean @default(true)
}

model OutreachMessage {
  id         String    @id @default(cuid())
  tenantId   String    @default("default")
  contactId  String
  sequenceId String?
  channel    String
  content    String
  sentAt     DateTime
  openedAt   DateTime?
  repliedAt  DateTime?
  status     String
}

// ── Operations ───────────────────────────────────────────
model ActivityLog {
  id         String   @id @default(cuid())
  tenantId   String   @default("default")
  projectId  String?
  agentId    String
  teamId     String?
  action     String
  toolName   String?
  input      Json?
  output     Json?
  tokensUsed Int?
  costUsd    Float?
  durationMs Int
  success    Boolean
  error      String?
  channel    String?
  createdAt  DateTime @default(now())
}

model Integration {
  id              String    @id @default(cuid())
  tenantId        String    @default("default")
  type            String
  name            String
  config          Json
  status          String   @default("active")
  lastHealthCheck DateTime?
  createdAt       DateTime @default(now())
}
```

**Important for deployment:** These models use `@default("default")` for tenantId
so they work immediately with `prisma db push` against the existing database
without requiring data migration. The `String[]` type works in both PostgreSQL
(native array) and SQLite (JSON-serialized by Prisma). The `AgentMemory` model
does NOT use `Unsupported("vector")` — the vector column is added manually via
raw SQL in VPS mode only, so the schema stays compatible with SQLite.

### New Directories to Create

When building new features, create these directories as needed:

```
lib/
  config/
    mode.ts               ← PLAYGROUND_MODE detection & feature flags
  keeper/
    index.ts              ← Playground Keeper orchestration
    classify.ts           ← intent classification (local LLM or rules)
    route.ts              ← message → project/team routing
    project-manager.ts    ← create/update/archive projects
    team-manager.ts       ← activate/retire/assign teams
    status.ts             ← system state queries for Keeper
  router/
    normalize.ts          ← platform-specific → AgentMessage
    dispatch.ts           ← push to agent queues
    respond.ts            ← route responses back to channels
  integrations/
    interface.ts          ← Integration interface definition
    telegram/             ← Telegram bot bridge
    discord/              ← Discord bot bridge
    shell-executor/       ← sandboxed shell commands
  skills/
    registry.ts           ← local skill registry
    sandbox.ts            ← safe skill execution
    builder.ts            ← guided skill creation
  memory/
    store.ts              ← write memories (pgvector or keyword fallback)
    retrieve.ts           ← semantic or keyword search
  queue/
    index.ts              ← BullMQ (VPS) or in-memory (laptop) queue
    workers/              ← job processors
```

---

## SECTION 4: DEVELOPMENT PHASES

**Phase 0 — Deployment Stability (NOW)**
- [ ] Fix any build errors preventing `docker compose up -d --build`
- [ ] Verify `prisma db push` works against production database
- [ ] Verify health check endpoint (`/api/health`) responds
- [ ] Verify chat interface connects to Claude API
- [ ] Verify Ollama connection works from the dashboard
- [ ] Confirm all containers start and stay healthy
- [ ] Document any missing env vars in `.env.local.example`

**Phase 1 — Keeper & Projects**
- [ ] Create `lib/config/mode.ts` with PLAYGROUND_MODE detection
- [ ] Add Project, ProjectTeam, ProjectOutput models to schema
- [ ] Run `prisma db push` — verify no breakage with existing data
- [ ] Implement Playground Keeper as the central chat handler
- [ ] Keeper creates projects from natural language
- [ ] Keeper lists projects, teams, and their states
- [ ] Keeper retires/reactivates teams
- [ ] Team status tracking (active/standby/retired)
- [ ] Add ActivityLog model, start logging agent actions
- [ ] UI: theme toggle (light/dark with CSS custom properties)

**Phase 2 — External Channels**
- [ ] Add Channel, ChannelMessage, RoutingRule models to schema
- [ ] Create Integration interface in `lib/integrations/interface.ts`
- [ ] Implement message normalization (AgentMessage format)
- [ ] Build Telegram bridge (first external channel)
- [ ] Keeper routes Telegram messages to correct project/team
- [ ] Responses flow back to originating channel
- [ ] Add Docker Compose profile for telegram-bridge

**Phase 3 — Skills & Tools**
- [ ] Add Skill model to schema
- [ ] Implement local skill registry
- [ ] Build 5-10 built-in skills (web search, image gen API, email, shell)
- [ ] Skill execution sandbox
- [ ] Skill creation wizard via Keeper chat
- [ ] Access declaration enforcement

**Phase 4 — Memory & Autonomy**
- [ ] Add AgentMemory model to schema
- [ ] Implement memory store/retrieve (keyword search in laptop, pgvector in VPS)
- [ ] Project-scoped shared memory
- [ ] Shell executor with sandboxing and audit log
- [ ] Docker management tools
- [ ] Self-review agent (scheduled reports)
- [ ] Cost tracking per agent/tool/project

**Phase 5 — Content & Publishing**
- [ ] Add ContentItem, ContentSchedule, SocialAccount, BrandProfile models
- [ ] Image generation skill (API-based)
- [ ] Social media publisher skills (Twitter, Instagram, LinkedIn)
- [ ] Content calendar and scheduling
- [ ] Brand profiles for tone/style per account
- [ ] YouTube pipeline (script → voice → video → upload)

**Phase 6 — Outreach & CRM**
- [ ] Add Contact, OutreachSequence, OutreachMessage models
- [ ] Web scraper integration (Playwright-based)
- [ ] CRM tools for Keeper
- [ ] Email outreach with automated sequences
- [ ] Lead scoring

**Phase 7 — Ecosystem & Replication**
- [ ] Skill marketplace backend
- [ ] Multi-tenant isolation (tenantId enforcement across all queries)
- [ ] Config export/import scripts for VPS replication
- [ ] Growth path system
- [ ] Discord bot with moderation
- [ ] Laptop mode: SQLite provider, in-memory queue, node-cron

---

## SECTION 5: INTEGRATION INTERFACES

### Standard Message Format
```typescript
interface AgentMessage {
  id: string
  source: 'web' | 'telegram' | 'discord' | 'email' | 'webhook' | 'api' | 'cron'
  channelId: string
  userId: string
  tenantId: string
  content: string
  attachments: Attachment[]
  metadata: Record<string, any>
  timestamp: Date
  replyTo?: string
  projectId?: string
}
```

### Integration Interface
```typescript
interface Integration {
  id: string
  name: string
  type: 'channel' | 'publisher' | 'tool' | 'data'
  setup(config: Record<string, any>): Promise<void>
  teardown(): Promise<void>
  healthCheck(): Promise<{ healthy: boolean; details?: string }>
  startListening?(): Promise<void>
  stopListening?(): Promise<void>
  sendMessage?(channelId: string, message: OutboundMessage): Promise<void>
  getTools?(): ToolDefinition[]
  handleWebhook?(req: Request): Promise<Response>
  getConfigSchema(): ConfigSchema
}
```

### Task Queue
```typescript
// Use BullMQ in VPS mode, in-memory Map-based queue in laptop mode
interface AgentJob {
  id: string
  type: string
  projectId?: string
  agentId: string
  tenantId: string
  payload: Record<string, any>
  priority: 'high' | 'default' | 'low'
  retries: number
  timeout: number
  schedule?: string          // cron expression for recurring
  callbackChannel?: string
}
```
