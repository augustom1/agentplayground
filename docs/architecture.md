# Architecture Guide — Agent Playground
> For agents and developers. Read this to understand how the codebase is organized and how to navigate it.
> Last updated: 2026-05-27

---

## What This App Is

A self-hosted AI operations platform. The **Coordinator** (Claude-powered) manages teams of specialized agents, delegates work, tracks everything in the **Brain** (pgvector knowledge base), and surfaces results back to the user.

**Core loop:** User message → Coordinator decides → delegate to team(s) → team runs tool loop → results saved to Brain → coordinator synthesizes → user gets answer + everything archived.

---

## Directory Structure

```
app/
├── (app)/              ← authenticated pages (require session)
│   ├── chat/           ← PRIMARY: streaming chat with coordinator
│   ├── dashboard/      ← drag-drop widgets
│   ├── agent-lab/      ← team/agent/skill management
│   ├── brain/          ← Knowledge tab: vault notes + brain documents
│   ├── playground/     ← Playground Teams: multi-agent chat
│   ├── plans/          ← Plan management + approval
│   ├── projects/       ← Project status dashboard
│   ├── schedule/       ← Calendar + meetings
│   ├── files/          ← File manager + vector embeddings
│   ├── settings/       ← API keys, MCP, notifications, providers
│   ├── billing/        ← Credits (crypto payments)
│   └── tools/          ← Tool catalog + improvements
├── (auth)/             ← public auth pages
│   ├── login/
│   ├── register/
│   └── setup/          ← FIRST-RUN onboarding wizard
├── admin/              ← admin-only panel (role = "admin")
│   ├── analytics/
│   ├── api-monitor/
│   ├── users/
│   └── system/
└── api/
    ├── chat/           ← POST: main chat endpoint (streaming)
    ├── agents/         ← CRUD for agents
    ├── brain/          ← Knowledge/vault API
    ├── plans/          ← Plan CRUD + approval
    ├── projects/       ← Project CRUD + status
    ├── playground/     ← Playground team API
    ├── admin/          ← Admin-only APIs
    ├── notify/         ← GET /stream: SSE for live events
    ├── mcp/            ← MCP JSON-RPC endpoint
    └── cron/           ← Cron job executor

lib/
├── chat-tools.ts       ← ALL 30 chat tools: definitions + executeTool()
├── prisma.ts           ← Singleton Prisma client
├── api-error.ts        ← apiError() helper for all routes
├── brain/
│   ├── index.ts        ← searchVault, readVaultNote, writeVaultNote, getDailyNotes
│   ├── ingest.ts       ← ingestToBrain() — chunk + embed + store to BrainDocument
│   └── query.ts        ← queryBrain() — semantic search over BrainChunks
├── agents/
│   ├── runner.ts       ← runAgentTask() — executes PlanTasks (full tool loop)
│   ├── delegated.ts    ← runDelegatedTask() — executes ad-hoc delegations
│   └── events.ts       ← TaskResult type
├── planner/
│   ├── builder.ts      ← buildPlan() — creates Plan + PlanTasks via Claude
│   └── dispatch.ts     ← dispatchPlan() — runs all tasks in parallel batches
├── council/
│   └── index.ts        ← runCouncil() — multi-perspective deliberation
├── providers/
│   ├── index.ts        ← getProvider(), getEmbedProvider()
│   ├── anthropic.ts    ← Anthropic provider adapter
│   ├── ollama.ts       ← Ollama provider adapter
│   ├── openai.ts       ← OpenAI provider adapter
│   └── types.ts        ← LLMProvider interface
├── memory/
│   ├── store.ts        ← storeMemory() — saves to AgentMemory table
│   └── retrieve.ts     ← retrieveMemories() — fetches relevant memories
├── integrations/
│   ├── telegram/
│   │   ├── bot.ts      ← sendOwnerAlert(), sendGroupNotification(), handleTelegramUpdate()
│   │   └── audio.ts    ← audio transcription via Whisper
│   └── email/
│       └── processor.ts
├── seed-teams.ts       ← seeds Dev Core, DevOps, Product, Business, Command Center
├── seed-defaults.ts    ← seeds default widgets, skills
├── notify/
│   └── sse.ts          ← notifyPlanEvent() — broadcasts to SSE stream
└── optimizer/
    ├── classifier.ts   ← classifies tasks for local vs API LLM
    ├── protocol-writer.ts ← learns + writes TaskProtocol records
    └── scanner.ts      ← weekly scan for optimization opportunities
```

---

## Key Database Models

| Model | Table | Purpose |
|---|---|---|
| `User` | users | Admin + user accounts, roles, credits |
| `AgentTeam` | agent_teams | Teams of agents (Dev Core, Business, etc.) |
| `Agent` | agents | Individual agents with model + system prompt |
| `Task` | tasks | Ad-hoc tasks delegated by coordinator |
| `Plan` + `PlanTask` | plans, plan_tasks | Multi-team execution plans |
| `BrainDocument` + `BrainChunk` | brain_documents, brain_chunks | Knowledge base with pgvector embeddings |
| `VaultNote` | vault_notes | Obsidian vault notes (indexed via n8n) |
| `AgentMemory` | agent_memories | Long-term memory for agents/system |
| `Project` + `ProjectOutput` | projects, project_outputs | Business projects + deliverables |
| `Meeting` | meetings | Scheduled meetings, agent-created |
| `LlmProvider` | llm_providers | Configured AI providers (encrypted keys) |
| `ApiUsage` | api_usage | Per-call token/usage tracking |
| `UserCredits` | user_credits | Credit balance per user |
| `PlaygroundTeam` + `PlaygroundThread` | playground_teams, playground_threads | Multi-agent chat sessions |
| `ActivityLog` | activity_logs | Audit trail of all actions |
| `TaskProtocol` | task_protocols | Learned local-LLM routing protocols |

---

## Chat System Flow

```
POST /api/chat  (body: { messages, provider, model, teamId, attachments })
  ↓ auth check + rate limit
  ↓ buildSystemPrompt(teamId)
       "coordinator" → buildCoordinatorContext() → COORDINATOR_INTRO + teams + projects + memories
       teamId        → buildTeamContext(teamId)   → team agents + skills + CLI functions
       none          → BASE_SYSTEM
  ↓ vault context injection (if VAULT_CONTEXT_ENABLED=true)
  ↓ stream to one of:
       streamAnthropic → tool loop (up to 25 iterations)
       streamOpenAI    → tool loop (up to 10 iterations)
       streamOllama    → tool loop (up to 10 iterations)
           each tool call → executeTool() in lib/chat-tools.ts
           streams text tokens back to client in real time
  ↓ trackUsage() → ApiUsage record
  ↓ deductCredits() → UserCredits update
  ↓ evaluateAndWriteProtocol() → may create TaskProtocol for future local routing
```

---

## Tool System

All 30 tools are in `lib/chat-tools.ts`.

| Category | Tools |
|---|---|
| Team management | create_team, create_agent, add_skill, add_cli_function, update_team, update_agent, create_chatbot |
| Task execution | delegate_to_team, schedule_task, request_human_input |
| Planning | create_plan, run_plan, get_task_result, plan_task |
| Projects | create_project, list_projects, get_project_status, update_project, log_project_output |
| Knowledge/Brain | vault_search, vault_read, vault_write |
| Research | web_search, web_browse |
| Files | list_files, read_file, write_file, delete_file, search_files |
| Memory | save_memory, recall_memories |
| System | query_data, list_available_skills, list_team_details, council_reason, vps_exec, schedule_meeting |
| Conversion | convert_to_markdown |
| Tooling | search_tools, install_tool, log_improvement, generate_tool |
| Reporting | generate_session_report |

**Adding a tool:** (1) add definition to `CHAT_TOOLS[]`, (2) add switch case to `executeTool()`, (3) add handler function at bottom of file.

---

## Brain (Knowledge Base) Architecture

Two knowledge stores, both searchable from `/brain`:

**VaultNotes** (`vault_notes`)
- Source: Syncthing ↔ Obsidian → n8n indexer → `POST /api/brain/index`
- Embeddings: 768-dim nomic-embed-text (Ollama)
- Search: `searchVault(query, topK)`

**BrainDocuments + BrainChunks** (`brain_documents`, `brain_chunks`)
- Source: `ingestToBrain()` called from tools, task completions, reports, research archive
- Chunking: 500-token chunks, 64-token overlap, paragraph-aware splitting
- Embeddings: 768-dim nomic-embed-text via `getEmbedProvider()`
- Search: `queryBrain(query, topK, filter)`
- Source types: `vault | file | web | plan | report | manual | research | task-result | session-report`

---

## Agent Execution Architecture

### Coordinator (chat, 25 iterations)
In `app/api/chat/route.ts`. Decides: handle directly, delegate to one team, or create multi-team plan.

### Delegated Task (ad-hoc, `delegate_to_team` tool)
`lib/agents/delegated.ts` → claude-haiku-4-5, 10 iterations, team-scoped tools, supports `request_human_input` checkpoint.

### Plan Task (structured, `create_plan` → `run_plan`)
`lib/agents/runner.ts` → claude-sonnet-4-6, 10 iterations, Brain context injected.

### Parallel Dispatch
`lib/planner/dispatch.ts` → dependency-aware batches, SSE events per task.

---

## SSE Events (Real-Time)

`GET /api/notify/stream` — authenticated SSE.
Events via `notifyPlanEvent()`: `TASK_STARTED | TASK_DONE | MISSING_INFO | ERROR | PLAN_DONE | PROJECT_UPDATE`

---

## Authentication

NextAuth v5, JWT. `auth()` in route handlers.
- Public: `/login`, `/setup`, `/register`, `/api/auth/*`, `/api/health`, `/api/cron`, `/api/brain/index`, `/api/mcp`
- Admin-only: `/admin/*`, `/api/admin/*`

---

## Permission Model

| Preset | Read Own | Write Own | Read All | Write All | Files | CLI | Teams |
|---|---|---|---|---|---|---|---|
| admin | ✓ | ✓ | ✓ | ✓ | R/W | ✓ | C/D |
| builder | ✓ | ✓ | ✓ | | R/W | ✓ | C |
| standard | ✓ | ✓ | | | R | | |
| readonly | ✓ | | | | R | | |

---

## Deployment Stack

```
Internet → Traefik (HTTPS)
  app.agentplayground.net     → vps-dashboard (Next.js :3000)
  n8n.agentplayground.net     → vps-n8n (:5678)
  files.agentplayground.net   → vps-filebrowser (:8083)
  manage.agentplayground.net  → vps-portainer (:9000)

vps-dashboard depends on:
  vps-postgres  (PostgreSQL 16 + pgvector)
  vps-redis     (cache + rate limiting)
  vps-ollama    (local LLMs: qwen2.5:3b, qwen2.5:7b)
  vaultdata     (Syncthing vault volume)
  filedata      (user files volume)
```

VPS: 95.217.163.247 · App path: `/root/opt/vps/`
