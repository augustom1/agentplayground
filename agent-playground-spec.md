# Agent Playground — Full Architecture & Implementation Spec
> Hand this document to Claude Code to implement, update, and extend the app.

---

## 0. North Star Vision

Agent Playground is **not a Claude Desktop clone**. It is a self-hosted AI operations platform where:

- The user has a **direct, low-latency connection** to their databases, files, and VPS — no round-trip through a cloud API for every file read.
- Agents are **co-located with the data**: pgvector, Redis, FileBrowser, n8n, and Ollama all run on the same Docker network. An agent reading a file or querying the DB pays zero network hops.
- The UX is **simplified and opinionated**: one sidebar, one chat pane, one status bar. No feature sprawl.
- Everything the system learns is **written back to the brain** so future runs are cheaper, faster, and smarter.

The guiding metaphor: a smart operations room where the tools, files, and databases are on the desk — not across the city.

---

## 1. Tech Stack (locked — do not change without a migration plan)

| Layer | Technology | Notes |
|---|---|---|
| Frontend | Next.js 16 (App Router), TypeScript | Standalone Docker output |
| Styling | Tailwind CSS v4 | No CSS modules |
| Auth | NextAuth v5 beta | Do not downgrade |
| Validation | Valibot | No Zod — hard constraint |
| DB ORM | Prisma 7 + `@prisma/adapter-pg` | Direct pg adapter, not connection pooling middleware |
| Primary DB | PostgreSQL + pgvector | Single instance on Docker network |
| Cache / Queue | Redis | BullMQ for job queues |
| Embeddings | Ollama (local) or configurable remote | `nomic-embed-text` default |
| Orchestration | n8n | Runs as a sidecar container |
| File browser | FileBrowser | Exposes VPS filesystem to agents |
| Reverse proxy | Traefik or Nginx | TLS termination |
| Container | Docker Compose | Multi-stage Dockerfile, standalone Next.js |
| Laptop mode | SQLite + in-memory queue | Zero-config, activated by `LAPTOP_MODE=true` |

---

## 2. Repository Structure

```
agent-playground/
├── app/                          # Next.js App Router
│   ├── (auth)/                   # Login, register
│   ├── (dashboard)/              # Main app shell
│   │   ├── layout.tsx            # Sidebar + status bar
│   │   ├── page.tsx              # Home / recent activity
│   │   ├── chat/[sessionId]/     # Chat pane
│   │   ├── plans/                # Plan management
│   │   ├── agents/               # Agent team config
│   │   ├── brain/                # Brain explorer (files, vectors, memories)
│   │   └── settings/             # LLM providers, MCP, notifications
│   └── api/
│       ├── chat/                 # Streaming chat endpoint
│       ├── plans/                # CRUD for plans
│       ├── agents/               # Agent dispatch
│       ├── brain/                # RAG ingest + query
│       ├── notify/               # Webhook receiver (Telegram)
│       └── mcp/                  # MCP proxy endpoints
├── lib/
│   ├── brain/                    # RAG engine (see §6)
│   ├── agents/                   # Agent runner + teams (see §7)
│   ├── council/                  # LLM Council (see §9)
│   ├── planner/                  # Plan builder + approval gate (see §8)
│   ├── notify/                   # Notification system (see §10)
│   ├── queue/                    # BullMQ workers
│   ├── db/                       # Prisma client singleton
│   ├── redis/                    # Redis client singleton
│   └── providers/                # LLM provider adapters (see §4)
├── components/
│   ├── ui/                       # Base design system components
│   ├── chat/                     # Chat bubble, input, streaming
│   ├── plan/                     # PlanCard, ApprovalBanner
│   ├── brain/                    # BrainExplorer, VectorSearch
│   └── agents/                   # TeamCard, StatusBadge
├── prisma/
│   └── schema.prisma
├── docker-compose.yml
├── docker-compose.laptop.yml     # Laptop mode override
├── Dockerfile
└── .env.example
```

---

## 3. UI/UX Design Principles

> Claude Code: when redesigning the UI, use the `frontend-design` skill.
> Skill location: `/mnt/skills/public/frontend-design/SKILL.md`

### Layout — three-column shell

```
┌─────────────────────────────────────────────────────────────┐
│  SIDEBAR (240px fixed)  │  MAIN PANE (flex)  │  CONTEXT (320px, collapsible) │
│                         │                    │                               │
│  ▸ Chat                 │  [Chat / Plan /    │  Brain status                 │
│  ▸ Plans                │   Brain view]      │  Active agents                │
│  ▸ Agents               │                    │  Pending notifications        │
│  ▸ Brain                │                    │  Council status               │
│  ▸ Settings             │                    │                               │
│                         │                    │                               │
│  ── Status bar ──────── │ ─────────────────  │ ─────────────────────────     │
│  Keeper: idle           │                    │  VPS: connected               │
│  Queue: 0               │                    │  pgvector: 12,441 vectors     │
└─────────────────────────────────────────────────────────────┘
```

### Design tokens

- Font: System sans-serif stack (no web font load). Monospace for code/IDs.
- Colors: Single accent color (configurable, default indigo-600). Neutral grays for surfaces.
- Density: Compact. This is an ops tool, not a consumer product. No hero images, no animations except subtle loading states.
- Dark mode: First-class. Default to system preference.

### Key UX rules

1. **No modals for destructive actions** — use inline confirmation banners.
2. **Streaming is always visible** — token-by-token output in chat pane, never a spinner replacing text.
3. **Plan approval is a first-class view** — not a dialog. Full-width card with the plan tree, Council notes, and Approve / Request changes buttons.
4. **Brain explorer** — left panel shows indexed documents/files as a tree. Right panel shows vector similarity search with a relevance score bar. Clicking any node shows its chunks.
5. **Agent status** — always visible in the context panel. Each team has a colored status dot: idle / running / blocked / done.
6. **Notification banner** — appears at the top of the main pane when an agent is blocked. Inline form for filling missing info. Does not navigate away.

---

## 4. LLM Provider System

### Provider adapter interface

```typescript
// lib/providers/types.ts
export interface LLMProvider {
  id: string
  name: string
  models: () => Promise<string[]>
  complete: (params: CompletionParams) => AsyncIterable<string>
  embed: (text: string) => Promise<number[]>
}

export interface CompletionParams {
  model: string
  messages: Message[]
  system?: string
  temperature?: number
  maxTokens?: number
  tools?: Tool[]
}
```

### Built-in adapters

- `AnthropicProvider` — uses `@anthropic-ai/sdk`
- `OpenAIProvider` — uses `openai` SDK, also covers OpenAI-compatible APIs (Together, Groq, etc.)
- `OllamaProvider` — HTTP to `http://ollama:11434` on the Docker network — **zero external latency**
- `CustomProvider` — base URL + API key, OpenAI-compatible

### Provider selection logic

The user sets a **default provider** per role in settings:
- `keeper_provider` — Playground Keeper orchestrator
- `agent_provider` — individual agent task completion
- `embed_provider` — embeddings (default: Ollama `nomic-embed-text`)
- `council_provider` — LLM Council debates

All provider configs are stored in the `llm_providers` table (encrypted at rest).

---

## 5. Database Schema

```prisma
// prisma/schema.prisma

model User {
  id            String    @id @default(cuid())
  email         String    @unique
  passwordHash  String
  name          String?
  settings      Json      @default("{}")
  sessions      Session[]
  plans         Plan[]
  createdAt     DateTime  @default(now())
}

model Session {
  id        String   @id @default(cuid())
  userId    String
  user      User     @relation(fields: [userId], references: [id])
  messages  Message[]
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt
}

model Message {
  id         String   @id @default(cuid())
  sessionId  String
  session    Session  @relation(fields: [sessionId], references: [id])
  role       String   // user | assistant | system | tool
  content    String
  metadata   Json     @default("{}")
  createdAt  DateTime @default(now())
}

model Plan {
  id          String      @id @default(cuid())
  userId      String
  user        User        @relation(fields: [userId], references: [id])
  title       String
  description String
  status      PlanStatus  @default(DRAFT)
  tasks       Task[]
  councilNotes String?
  approvedAt  DateTime?
  createdAt   DateTime    @default(now())
  updatedAt   DateTime    @updatedAt
}

enum PlanStatus {
  DRAFT
  COUNCIL_REVIEW
  PENDING_APPROVAL
  APPROVED
  RUNNING
  BLOCKED
  DONE
  REJECTED
}

model Task {
  id           String     @id @default(cuid())
  planId       String
  plan         Plan       @relation(fields: [planId], references: [id])
  title        String
  description  String
  teamId       String
  team         AgentTeam  @relation(fields: [teamId], references: [id])
  status       TaskStatus @default(PENDING)
  dependencies String[]   // Task IDs
  result       String?
  blockedBy    String?    // Description of block
  createdAt    DateTime   @default(now())
  updatedAt    DateTime   @updatedAt
}

enum TaskStatus {
  PENDING
  RUNNING
  BLOCKED
  DONE
  FAILED
}

model AgentTeam {
  id           String   @id @default(cuid())
  name         String   @unique  // content | research | ops | dev | custom
  description  String
  capabilities String[] // MCP server names + skill names
  systemPrompt String
  tasks        Task[]
}

model BrainDocument {
  id          String   @id @default(cuid())
  title       String
  source      String   // file path, URL, or manual
  content     String
  metadata    Json     @default("{}")
  chunks      BrainChunk[]
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}

model BrainChunk {
  id         String       @id @default(cuid())
  documentId String
  document   BrainDocument @relation(fields: [documentId], references: [id])
  content    String
  embedding  Unsupported("vector(1536)")?
  metadata   Json         @default("{}")
  createdAt  DateTime     @default(now())

  @@index([embedding], type: Hnsw(distanceOps: "vector_cosine_ops"))
}

model Notification {
  id          String             @id @default(cuid())
  taskId      String?
  planId      String?
  type        NotificationType
  message     String
  data        Json               @default("{}")
  status      NotificationStatus @default(PENDING)
  resolvedAt  DateTime?
  createdAt   DateTime           @default(now())
}

enum NotificationType {
  MISSING_INFO
  AGENT_BLOCKED
  PLAN_READY
  COUNCIL_COMPLETE
  TASK_DONE
  ERROR
}

enum NotificationStatus {
  PENDING
  SENT
  RESOLVED
  DISMISSED
}

model LlmProvider {
  id          String  @id @default(cuid())
  name        String
  type        String  // anthropic | openai | ollama | custom
  baseUrl     String?
  apiKeyEnc   String? // encrypted
  models      String[]
  isDefault   Boolean @default(false)
  role        String? // keeper | agent | embed | council
}

model Report {
  id         String   @id @default(cuid())
  planId     String
  teamId     String
  content    String
  metrics    Json     @default("{}")
  embedding  Unsupported("vector(1536)")?
  createdAt  DateTime @default(now())

  @@index([embedding], type: Hnsw(distanceOps: "vector_cosine_ops"))
}
```

---

## 6. Brain — RAG Engine

The brain is the central memory of the system. Every document, file, report, and plan is indexed here. The design goal is **low-latency, high-relevance retrieval** — agents should get useful context in under 200ms.

### 6.1 Ingestion pipeline

```
Raw input (file / URL / text)
  → Normalize (strip formatting, extract plain text)
  → Chunk (recursive character splitter, 512 tokens, 64 overlap)
  → Embed (Ollama nomic-embed-text or configured provider)
  → Upsert to BrainChunk with metadata
  → Update BrainDocument record
```

Key metadata fields per chunk:
- `source` — file path or URL
- `type` — `report | plan | file | web | manual`
- `team` — which team created it (for filtered retrieval)
- `planId` — links chunks to a specific project
- `createdAt` — for recency weighting

### 6.2 Retrieval strategy

**Hybrid search** — combine vector similarity with keyword filtering:

```typescript
// lib/brain/query.ts
export async function queryBrain(params: {
  query: string
  topK?: number          // default 8
  filter?: {
    type?: string[]
    team?: string[]
    planId?: string
    since?: Date
  }
  rerank?: boolean       // default true
}): Promise<BrainChunk[]>
```

Implementation:
1. Embed the query with the configured embed provider
2. Run pgvector cosine similarity search with optional metadata filters
3. If `rerank: true`, run a lightweight cross-encoder re-rank pass (local Ollama model)
4. Return top-K chunks with relevance scores

### 6.3 Brain optimization

**HNSW index** — already in schema. Tune parameters:
```sql
CREATE INDEX brain_chunk_embedding_idx
ON "BrainChunk" USING hnsw (embedding vector_cosine_ops)
WITH (m = 16, ef_construction = 64);
```

**Chunking strategy** — use recursive splitter, not fixed-size:
- Target: 400-600 tokens per chunk
- Overlap: 10% (64 tokens)
- Prefer splitting at paragraph boundaries

**Deduplication** — before inserting, compute a content hash. If an identical hash exists, skip insertion (prevents re-indexing the same file).

**Metadata pre-filtering** — always apply `planId` and `type` filters before vector search. A 90% reduction in candidate set size makes the vector search 10× faster.

**Recency boost** — apply a time-decay weight to the similarity score:
```
final_score = cosine_similarity * (1 + 0.1 * recency_factor)
where recency_factor = exp(-days_since_creation / 30)
```

**Report-to-context loop** — after every task report is saved, re-embed its key learnings as standalone chunks tagged `type: "learning"`. This makes past optimizations automatically surface in future RAG queries.

### 6.4 Direct VPS file access

Because FileBrowser runs on the same Docker network, agents can read files directly:

```typescript
// lib/brain/filebrowser.ts
export class FileBrowserClient {
  // Base URL: http://filebrowser:80 (internal Docker network — zero latency)
  async listDir(path: string): Promise<FileEntry[]>
  async readFile(path: string): Promise<string>
  async writeFile(path: string, content: string): Promise<void>
  async ingestDirectory(path: string, options: IngestOptions): Promise<void>
}
```

**Auto-ingest rule**: any file written to `/brain/inbox/` on the VPS is automatically picked up by a file watcher (chokidar in a BullMQ worker) and ingested into the brain. This is the fastest path to getting data into the system — no upload UI needed.

---

## 7. Agent Teams

### 7.1 Team registry

Teams are stored in the `AgentTeam` table. Seed data:

| Team | Capabilities | Primary tasks |
|---|---|---|
| `content` | web-browser, gmail, social-mcp, filebrowser | Write, edit, post content |
| `research` | web-search, filebrowser, brain-query | Gather, synthesize, analyse |
| `ops` | n8n-api, gmail, calendar, filebrowser, shell | Automate, schedule, integrate |
| `dev` | shell, github, filebrowser, code-execution | Code, test, deploy |
| `keeper` | all | Orchestration only — does not do leaf tasks |

### 7.2 Agent runner

```typescript
// lib/agents/runner.ts
export class AgentRunner {
  constructor(
    private task: Task,
    private team: AgentTeam,
    private provider: LLMProvider
  ) {}

  async run(): Promise<TaskResult> {
    // 1. Pull relevant brain context
    const context = await queryBrain({
      query: this.task.description,
      filter: { planId: this.task.planId },
      topK: 6
    })

    // 2. Build system prompt from team config + context
    const systemPrompt = buildAgentSystemPrompt(this.team, context)

    // 3. Run completion loop with tool calls
    const result = await this.runLoop(systemPrompt)

    // 4. Save result to task
    // 5. Emit BlockedEvent if missing info detected
    // 6. Return result

    return result
  }
}
```

### 7.3 BlockedEvent — missing info interrupt

When an agent cannot proceed (missing credential, ambiguous value, unclear requirement):

```typescript
// lib/agents/events.ts
export interface BlockedEvent {
  taskId: string
  teamId: string
  reason: string
  requiredFields: {
    key: string
    label: string
    type: 'text' | 'password' | 'number' | 'select'
    options?: string[]
  }[]
}
```

The Playground Keeper listens for `BlockedEvent` via Redis pub/sub. It batches events arriving within a 5-second window (to avoid spamming the user with one notification per blocked agent), then creates a single `Notification` record and sends it via Telegram and/or in-app banner.

When the user fills in the missing info, the data is:
1. Stored in Redis with a TTL of 1 hour (not persisted to DB for security)
2. The blocked task is re-queued
3. The agent runner retrieves the value from Redis at run time

### 7.4 Tool manifest

Each team declares which tools it can call. Tools are registered as MCP servers:

```typescript
// lib/agents/tools.ts
export const TEAM_TOOLS: Record<string, MCPServer[]> = {
  content: [
    { name: 'filebrowser', url: 'http://filebrowser:80/mcp' },
    { name: 'gmail',       url: process.env.GMAIL_MCP_URL! },
  ],
  research: [
    { name: 'web-search',   url: 'http://searxng:8080/mcp' },  // local SearXNG
    { name: 'filebrowser',  url: 'http://filebrowser:80/mcp' },
  ],
  ops: [
    { name: 'n8n',          url: 'http://n8n:5678/mcp' },
    { name: 'filebrowser',  url: 'http://filebrowser:80/mcp' },
    { name: 'shell',        url: 'http://localhost/mcp/shell' }, // sandboxed
  ],
  dev: [
    { name: 'shell',        url: 'http://localhost/mcp/shell' },
    { name: 'filebrowser',  url: 'http://filebrowser:80/mcp' },
    { name: 'github',       url: process.env.GITHUB_MCP_URL! },
  ],
}
```

**Internal MCP servers** (same Docker network) have zero external latency. This is the key advantage over a cloud-hosted agent platform.

---

## 8. Planner — Plan Builder & Approval Gate

### 8.1 Plan creation flow

```
User sends goal in chat
  → Playground Keeper pulls brain context (RAG query)
  → Keeper drafts a Plan with Tasks
  → LLM Council reviews (§9)
  → Council amendments folded in
  → Plan status: PENDING_APPROVAL
  → User sees Plan view (not a dialog — full page)
  → User approves / requests changes / rejects
```

### 8.2 Plan schema (runtime object, not DB)

```typescript
interface PlanDraft {
  title: string
  description: string
  tasks: {
    title: string
    description: string
    team: string          // content | research | ops | dev
    dependencies: string[] // task titles of blockers
    estimatedDuration?: string
    requiredInputs?: string[] // things agent will need from user
  }[]
  councilNotes?: string
  riskFlags?: string[]
}
```

### 8.3 Approval gate

The approval gate is a **first-class route**: `/plans/[planId]/approve`.

UI elements:
- Plan title + description
- Task list as a dependency graph (DAG visualization, simple SVG)
- Council notes panel (collapsible)
- Risk flags highlighted in amber
- **Approve** button (saves plan, dispatches tasks)
- **Request changes** button (opens inline comment field, re-runs Keeper)
- **Reject** button (archives plan with reason)

Approval can also come via **Telegram**:
- Bot sends a summary + inline keyboard with Approve / Reject / Review
- Webhook at `/api/notify/telegram` processes the callback
- Approval is recorded identically to in-app approval

### 8.4 Task dispatch

After approval:
```typescript
async function dispatchPlan(plan: Plan) {
  // 1. Save plan to brain (type: "plan")
  await ingestToBrain({ content: JSON.stringify(plan), type: 'plan', planId: plan.id })

  // 2. Topological sort of tasks by dependencies
  const orderedTasks = topologicalSort(plan.tasks)

  // 3. Enqueue tasks — parallel where no dependency, sequential where dependent
  for (const batch of orderedTasks) {
    await Promise.all(batch.map(task => taskQueue.add(task)))
  }
}
```

---

## 9. LLM Council

The Council is a structured multi-agent debate that runs at two moments:
1. **Plan review** — before the plan is shown to the user for approval
2. **Scheduled meeting** — triggered by n8n on a cron, or manually from the UI

### 9.1 Council participants

One representative agent per active team, plus the Keeper as facilitator.

```typescript
// lib/council/index.ts
export interface CouncilMeeting {
  context: string        // plan JSON or progress snapshot
  topic: string          // "review plan" | "mid-project sync" | custom
  participants: string[] // team IDs
  rounds: number         // default 2
}

export async function runCouncil(meeting: CouncilMeeting): Promise<CouncilOutput>

export interface CouncilOutput {
  amendments: Amendment[]
  riskFlags: string[]
  consensusScore: number  // 0-1
  transcript: string      // full debate, saved to brain
}

export interface Amendment {
  taskRef: string
  type: 'add' | 'remove' | 'modify' | 'reorder'
  description: string
  proposedBy: string      // team ID
  accepted: boolean
}
```

### 9.2 Council prompt design

**Facilitator system prompt (Keeper)**:
```
You are the Playground Keeper facilitating a Council review.
Your job: extract concrete amendments and risk flags from the debate.
Do not add your own opinions. Summarize and converge.
Output only valid JSON matching the CouncilOutput schema.
```

**Participant system prompt template**:
```
You are the {{team_name}} team lead in a Council meeting.
Your team handles: {{team_capabilities}}.
Review the following plan from your team's perspective.
Identify: missing tasks for your domain, risks, dependencies not listed, missing inputs.
Be specific. Propose concrete amendments. Keep responses under 150 words.
```

**Debate structure**:
- Round 1: Each participant reviews the plan independently and posts amendments
- Keeper synthesizes and identifies conflicts
- Round 2: Each participant responds to conflicts only
- Keeper produces final `CouncilOutput`

### 9.3 Council transcript storage

Every Council meeting is saved to the brain:
```typescript
await ingestToBrain({
  content: councilOutput.transcript,
  type: 'council_meeting',
  metadata: { planId, topic, date: new Date() }
})
```

This means future Keepers can query: *"what did the Council flag last time we ran a similar plan?"*

---

## 10. Notification System

### 10.1 In-app notifications

Notifications are streamed to the frontend via **Server-Sent Events** (SSE) at `/api/notify/stream`.

```typescript
// lib/notify/sse.ts
export class NotificationStream {
  // Publishes to Redis channel `notifications:{userId}`
  static async publish(userId: string, notification: Notification)

  // SSE endpoint subscribes to Redis channel
  static subscribe(userId: string): ReadableStream
}
```

In-app banner rules:
- `MISSING_INFO` / `AGENT_BLOCKED` → red banner, inline form, blocks UX until resolved
- `PLAN_READY` → amber banner, click to go to approval view
- `TASK_DONE` → green toast (auto-dismisses after 4s)
- `ERROR` → red toast, persistent

### 10.2 Telegram integration

Setup:
1. Create a bot via BotFather, store token in `TELEGRAM_BOT_TOKEN`
2. Store the user's chat ID in `TELEGRAM_CHAT_ID`
3. Webhook registered at `/api/notify/telegram`

Outbound format (blocked agent example):
```
🔴 Agent blocked — Ops team

Task: "Set up weekly email digest"
Missing: Gmail OAuth token

Reply with the value or tap:
[✅ Provide in app] [❌ Skip task]
```

Inbound (plan approval):
```
[✅ Approve] [✏️ Request changes] [❌ Reject]
```

---

## 11. Laptop Mode

Activated by `LAPTOP_MODE=true` in `.env`.

Changes:
- PostgreSQL → SQLite (via Prisma adapter swap)
- Redis + BullMQ → in-memory queue (p-queue)
- Ollama assumed running locally on `localhost:11434`
- FileBrowser disabled (use local filesystem directly)
- No Traefik/Nginx (Next.js dev server or `next start`)

```typescript
// lib/db/index.ts
export const db = process.env.LAPTOP_MODE === 'true'
  ? new PrismaClient({ adapter: new PrismaLibSQL(tursoClient) })
  : new PrismaClient({ adapter: new PrismaPg(pgPool) })
```

Laptop mode is for local development and onboarding only. It does not support multi-user or production workloads.

---

## 12. Docker Compose

```yaml
# docker-compose.yml
version: '3.9'
services:
  app:
    build: .
    restart: unless-stopped
    environment:
      DATABASE_URL: postgresql://postgres:${POSTGRES_PASSWORD}@db:5432/agentplayground
      REDIS_URL: redis://redis:6379
      OLLAMA_BASE_URL: http://ollama:11434
      FILEBROWSER_URL: http://filebrowser:80
      N8N_URL: http://n8n:5678
    depends_on: [db, redis, ollama]
    labels:
      - "traefik.enable=true"
      - "traefik.http.routers.app.rule=Host(`${APP_DOMAIN}`)"

  db:
    image: pgvector/pgvector:pg16
    restart: unless-stopped
    environment:
      POSTGRES_DB: agentplayground
      POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}
    volumes:
      - pg_data:/var/lib/postgresql/data

  redis:
    image: redis:7-alpine
    restart: unless-stopped
    volumes:
      - redis_data:/data

  ollama:
    image: ollama/ollama:latest
    restart: unless-stopped
    volumes:
      - ollama_data:/root/.ollama
    # GPU: uncomment below for CUDA
    # deploy:
    #   resources:
    #     reservations:
    #       devices:
    #         - capabilities: [gpu]

  filebrowser:
    image: filebrowser/filebrowser:latest
    restart: unless-stopped
    volumes:
      - /:/srv  # Mount entire VPS filesystem — agents can read/write anywhere
    environment:
      FB_NOAUTH: "true"  # Auth handled by app layer

  n8n:
    image: n8nio/n8n:latest
    restart: unless-stopped
    environment:
      N8N_BASIC_AUTH_ACTIVE: "false"
      WEBHOOK_URL: http://n8n:5678
    volumes:
      - n8n_data:/home/node/.n8n

  traefik:
    image: traefik:v3
    restart: unless-stopped
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - /var/run/docker.sock:/var/run/docker.sock:ro
      - traefik_data:/etc/traefik/acme

volumes:
  pg_data:
  redis_data:
  ollama_data:
  n8n_data:
  traefik_data:
```

---

## 13. Skills to Download and Use

Claude Code should download and use the following skills:

### 13.1 Skills for immediate use

| Skill | Location | When to use |
|---|---|---|
| `frontend-design` | `/mnt/skills/public/frontend-design/SKILL.md` | **Use this for all UI work** — redesigning the app shell, components, pages |
| `mcp-builder` | `/mnt/skills/examples/mcp-builder/SKILL.md` | Building internal MCP servers (shell, filebrowser, n8n bridges) |
| `skill-creator` | `/mnt/skills/examples/skill-creator/SKILL.md` | Creating new agent skills for the skill marketplace |
| `web-artifacts-builder` | `/mnt/skills/examples/web-artifacts-builder/SKILL.md` | Complex multi-component UI sections |

### 13.2 Instructions for Claude Code

```
Before any UI work:
  READ /mnt/skills/public/frontend-design/SKILL.md
  Apply all design tokens, component patterns, and dark mode rules from that skill.

Before building any MCP server:
  READ /mnt/skills/examples/mcp-builder/SKILL.md
  Use FastMCP (Python) for quick bridges, MCP SDK (TypeScript) for production.

Before creating agent skills:
  READ /mnt/skills/examples/skill-creator/SKILL.md
  Each skill must have: description, triggers, SKILL.md, and an eval set.
```

### 13.3 Internal MCP servers to build (use mcp-builder skill)

1. **Shell MCP** — sandboxed bash execution with allowlist of safe commands
2. **FileBrowser MCP** — wraps the FileBrowser API for agent file operations
3. **N8N MCP** — triggers n8n workflows, reads execution logs
4. **Brain MCP** — query and ingest to the brain from any agent or external client
5. **Notification MCP** — allows agents to send structured notifications

---

## 14. Implementation Order for Claude Code

Work in this sequence to avoid breaking the Docker build at any step:

1. **DB schema** — run `prisma migrate dev` with the schema from §5
2. **Brain ingest pipeline** — `lib/brain/ingest.ts` and `lib/brain/query.ts`
3. **LLM provider adapters** — `lib/providers/` with the four built-in adapters
4. **Agent runner** — `lib/agents/runner.ts` and team tool manifest
5. **Planner** — `lib/planner/` with Keeper prompt and plan builder
6. **Council** — `lib/council/` with debate loop
7. **Notification system** — Redis pub/sub + SSE + Telegram webhook
8. **API routes** — `/api/chat`, `/api/plans`, `/api/agents`, `/api/brain`
9. **UI redesign** — use `frontend-design` skill. Implement the three-column shell, then: chat pane, plan approval view, brain explorer, agent status panel
10. **Internal MCP servers** — use `mcp-builder` skill for shell, filebrowser, n8n, brain bridges
11. **Docker Compose** — validate full stack boots cleanly
12. **Laptop mode** — test with `LAPTOP_MODE=true`

---

## 15. Hard Constraints (never violate)

- **No Zod** — use Valibot for all validation
- **No breaking the Docker build** — every commit must produce a working container
- **No external calls from the agent runner** — all tool calls go through MCP servers on the Docker network. The app layer never calls external APIs directly on behalf of agents.
- **No credentials in brain chunks** — the notification system handles missing credentials via Redis with TTL. Never persist passwords, tokens, or API keys to the brain or DB in plaintext.
- **pgvector HNSW index must exist** before any embedding inserts — run the index creation migration before seeding.
- **Prisma adapter must stay as `@prisma/adapter-pg`** — do not switch to connection pooling middleware (PgBouncer etc.) without a full adapter test.

---

## 16. Environment Variables Reference

```bash
# .env.example

# Core
DATABASE_URL=postgresql://postgres:password@localhost:5432/agentplayground
REDIS_URL=redis://localhost:6379
NEXTAUTH_SECRET=changeme
NEXTAUTH_URL=https://yourdomain.com
APP_DOMAIN=yourdomain.com

# Laptop mode
LAPTOP_MODE=false

# LLM Providers (configure at least one)
ANTHROPIC_API_KEY=
OPENAI_API_KEY=
OLLAMA_BASE_URL=http://ollama:11434

# Internal services (auto-resolved in Docker, override for local dev)
FILEBROWSER_URL=http://localhost:8080
N8N_URL=http://localhost:5678

# Telegram
TELEGRAM_BOT_TOKEN=
TELEGRAM_CHAT_ID=

# Encryption key for stored API keys
ENCRYPTION_KEY=  # 32 random bytes, base64

# Optional: external SearXNG for research team
SEARXNG_URL=http://localhost:8888
```

---

*Last updated: May 2026. Give this file to Claude Code with the instruction: "Implement the Agent Playground according to this spec. Read the referenced skill files before starting any UI or MCP work."*
