# Technical Summary — Agent Playground

> **Note (2026-07-02):** Pricing and business-model details in this file are historical. The current model (open source core; custom playgrounds $350-500; full installations $1,000-1,500; managed hosting ~$100 / ~$180-200 / ~$250-300 per month; Playground Library) lives in `00-overview.md` and `03-services-pricing.md` - use those numbers. The AR site is now a lead-gen page: no listed prices, no MercadoPago checkout.

For developers joining the project, technical co-founders, or investors who want the details.

---

## What It Is

Agent Playground is an open-source-friendly, self-hosted AI agent management platform.
It is a production-ready Next.js application bundled with a full infrastructure stack
deployable to any Linux VPS via a single bootstrap script.

Unlike tools like Dify or Flowise (which are standalone LLM app builders), Agent Playground
is a *platform for managing AI operations*: creating agent teams, scheduling recurring jobs,
running tool-use conversations, and automating cross-system workflows via n8n.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────┐
│  Browser                                                │
│  Next.js App (app.yourdomain.com)                       │
│  ┌───────────────────────────────────────────────────┐  │
│  │  App Router Pages          Auth (NextAuth v5 JWT) │  │
│  │  - /dashboard              - Credentials provider │  │
│  │  - /chat                   - bcrypt passwords     │  │
│  │  - /agent-lab              - Role: admin/user/    │  │
│  │  - /schedule                 viewer               │  │
│  │  - /settings                                      │  │
│  │  - /users (admin only)                            │  │
│  └───────────────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────────────┐  │
│  │  API Routes (app/api/)                            │  │
│  │  teams · agents · tasks · chat · cron · health   │  │
│  │  skills · cliFunctions · schedule · metrics       │  │
│  │  conversations · import-team · export-team        │  │
│  └───────────────────────────────────────────────────┘  │
└────────────────────────┬────────────────────────────────┘
                         │
          ┌──────────────┼──────────────────┐
          │              │                  │
   ┌──────▼──────┐ ┌─────▼─────┐  ┌────────▼────────┐
   │ PostgreSQL  │ │   Redis   │  │  Ollama (LLM)   │
   │ + pgvector  │ │  (cache)  │  │  qwen2.5:3b/7b  │
   └─────────────┘ └───────────┘  └─────────────────┘
          │
   ┌──────▼──────────────────────────────────────────┐
   │  External AI Providers                         │
   │  Anthropic API (Claude)  ·  OpenAI (optional)  │
   └─────────────────────────────────────────────────┘
```

---

## Stack Details

### Frontend
- **Framework:** Next.js 15.x with App Router
- **UI Library:** React 19.x (Server Components by default)
- **Styling:** Tailwind CSS v4 (utility-first, dark theme)
- **Icons:** lucide-react
- **State:** React Server Components + form actions (no client state manager)
- **Auth Client:** next-auth/react SessionProvider

### Backend
- **Runtime:** Node.js 20 (LTS) via node:20-slim Docker image
- **API:** Next.js Route Handlers (app/api/* directories)
- **ORM:** Prisma 7 with @prisma/adapter-pg
- **Auth:** NextAuth v5 (beta) — JWT strategy, Credentials provider, bcrypt
- **Streaming:** Native ReadableStream for chat streaming responses
- **Validation:** Manual (no Zod yet — planned addition)

### Database
- **Primary:** PostgreSQL 16 via pgvector/pgvector:pg16 Docker image
- **Extensions:** pgvector (1536-dim, ada-002 compatible)
- **Schema:** 16 models (see prisma/schema.prisma)
- **IDs:** CUID (collision-resistant, URL-safe)
- **Cache/Queue:** Redis 7 (available, not yet used in application logic)

### AI
- **Primary:** Anthropic SDK (@anthropic-ai/sdk) — Claude models with tool-use loop
- **Local:** Ollama via REST API — qwen2.5:3b (fast) + qwen2.5:7b (quality)
- **Optional:** OpenAI-compatible API (gpt-4o)
- **Tool system:** 15+ tools defined in lib/chat-tools.ts, executed via lib/db-agent.ts
  - create_team, create_agent, create_task, schedule_job
  - query_teams, query_tasks, get_activity_log
  - web_search, web_browse
  - delegate_to_team

### Infrastructure (Production Stack)
- **Container runtime:** Docker + Docker Compose
- **Reverse proxy:** Traefik v2 (automatic Let's Encrypt SSL)
- **Automation:** n8n (self-hosted, Postgres-backed)
- **LLM UI:** Open WebUI (for Ollama)
- **File management:** FileBrowser
- **Docker management:** Portainer CE
- **Static hosting:** Nginx (client websites)

---

## Database Schema — 16 Models

```
User                — auth, roles (admin/user/viewer), plans
AgentTeam           — team config, status, permissions
Agent               — individual agents (model, prompt, temperature)
Task                — one-off tasks with status tracking
RecurringTask       — cron-scheduled tasks
ScheduledJob        — calendar events (daily/weekly/monthly)
Skill               — named capabilities with instructions
CliFunction         — CLI command definitions
Improvement         — learning/improvement logs
Widget              — dashboard widget configuration
ActivityLog         — audit log of all team actions
ChatConversation    — chat session container
ChatMessage         — individual chat messages (user/assistant)
PlaygroundRun       — agent lab run history
AgentTeamConfig     — import/export JSON configs
Embedding           — vector embeddings (pgvector, 1536-dim)
```

---

## Key Code Paths

### Chat with tool use
```
POST /api/chat
  → streamAnthropic() in app/api/chat/route.ts
  → tool_use block detected → executeTool() in lib/chat-tools.ts
  → reads/writes DB via lib/db-agent.ts (permission-gated)
  → continues loop until stop_reason = "end_turn"
  → streams text back to client via ReadableStream
```

### Agent permissions
```
lib/agent-permissions.ts defines scopes:
  admin    → full read/write/CLI/teams
  builder  → read all, write own, files R/W, CLI, create teams
  standard → read/write own, files read
  readonly → read own only

lib/db-agent.ts enforces these before any DB operation
```

### Deployment flow
```
docker compose up -d --build
  → builds node:20-slim runner (Dockerfile)
  → builds ollama/ollama + entrypoint (Dockerfile.ollama)
  → entrypoint.sh: starts ollama → waits ready → prisma db push → node server.js
  → ollama-entrypoint.sh: starts ollama serve → pulls OLLAMA_AUTO_PULL models
```

---

## Test Coverage

- Framework: Vitest 3 + jsdom + Testing Library
- 20 tests across: API routes, React components, pages
- Coverage areas: Schedule API, StatusBadge component, Schedule page interactions
- Run: `npm run test`

Gaps (planned):
- API auth check tests for all routes
- Chat streaming tests
- Agent permission enforcement tests

---

## Security Model

- All routes require NextAuth JWT session (enforced in middleware.ts)
- Passwords hashed with bcrypt (cost factor 12)
- Role-based access: admin gates in middleware + individual route handlers
- Secrets in .env.local only (gitignored)
- CRON_SECRET for machine-to-machine /api/cron calls
- No secrets in docker-compose.yml
- DB queries via Prisma (parameterized, no SQL injection risk)
- Known gap: no rate limiting yet (planned for Redis integration)

---

## Development Setup

```bash
# Prerequisites: Node.js 20, Docker

# 1. Install dependencies
npm install

# 2. Start database
docker compose -f docker-compose.dev.yml up -d

# 3. Push schema
npx prisma db push

# 4. Seed agent teams
npm run seed:teams

# 5. Start dev server
npm run dev
# → http://localhost:3000
# → First visit: /setup to create admin account
```

Required env vars (copy .env.example → .env):
```
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/agent_dashboard?schema=public
AUTH_SECRET=any-32-char-random-string
NEXTAUTH_URL=http://localhost:3000
ANTHROPIC_API_KEY=sk-ant-...   (optional)
OLLAMA_BASE_URL=http://localhost:11434   (optional)
```

---

## Repository Structure (Key Files)

```
Dockerfile              Multi-stage Next.js build (node:20-slim runner)
Dockerfile.ollama       Custom Ollama with auto-pull entrypoint
ollama-entrypoint.sh    Ollama startup: waits ready, pulls OLLAMA_AUTO_PULL models
entrypoint.sh           Container startup: Ollama + prisma db push + node server.js
docker-compose.yml      Full production stack
docker-compose.prod.yml Traefik HTTPS overlay
docker-compose.dev.yml  Dev: postgres + pgvector only
setup.sh                VPS one-command bootstrap
backup-db.sh            pg_dump → timestamped .sql.gz

app/                    Next.js App Router
  (app)/                Authenticated pages
  (auth)/               Login + Setup
  api/                  All API route handlers

lib/
  prisma.ts             Singleton Prisma client
  chat-tools.ts         All Claude tool definitions
  db-agent.ts           Permission-gated DB operations
  ai-providers.ts       Anthropic SDK wrapper
  agent-permissions.ts  Permission scope definitions

prisma/
  schema.prisma         16-model database schema

scripts/
  seed-teams.ts         Seeds 5 agent teams (Dev Core, DevOps, Product, Business, Command Center)
  init-db.sh            Creates n8n database on first Postgres start

business/               This folder — business plan, pitch, roadmap
```

---

## What's Not Built Yet (Honest Assessment)

| Feature | Status | Priority |
|---|---|---|
| Rate limiting | Not built | High (before public launch) |
| Email notifications | Not built | Medium |
| pgvector search | Schema ready, not wired | Medium |
| Redis usage | Container running, not used | Medium |
| Stripe billing | Not built | High (before scaling) |
| Multi-tenancy | Single-tenant per deploy | Long-term |
| Real-time updates | Polling only | Medium |
| Input validation (Zod) | Manual only | Medium |
| API documentation | Not written | Low |
| Audit log UI | Logged to DB, no UI | Low |
