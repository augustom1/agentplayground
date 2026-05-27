# System Protocols — Agent Playground
> Defines the automated behaviors baked into the platform.
> Last updated: 2026-05-27

---

## What Is a Protocol?

A protocol is a rule that the system follows automatically — not something the user has to ask for. Protocols ensure that data, context, and history accumulate without manual effort, so the platform gets smarter over time.

---

## P1: Research Archive Protocol

**Trigger:** Any `web_search` or `web_browse` tool call.
**Behavior:** After returning results to Claude, the tool automatically indexes the content into the Brain (`BrainDocument` with `sourceType: "research"`).
**Why:** Every search or page visited is potential future context. If you research a topic today, agents should be able to recall it later without re-searching.
**Config:** Controlled by env var `RESEARCH_AUTO_ARCHIVE` (default: `true`). Set to `false` to disable.
**Data stored:** query + results summary (search) or URL + extracted text (browse).
**Retention:** Follows global `DATA_RETENTION` setting (see P7).

---

## P2: Task Result Archive Protocol

**Trigger:** Any `delegate_to_team` tool call that completes successfully.
**Behavior:** After task completes, the result is indexed into the Brain with `sourceType: "task-result"` and metadata `{teamName, taskTitle, taskId}`.
**Why:** Task outputs are valuable knowledge. A research task from last month, a draft written by an agent — these should be searchable and reusable.
**Data stored:** Task title + full result text + team name + timestamp.

---

## P3: Session Report Protocol

**Trigger:** End of each working session (human-initiated via `generate_session_report` tool or direct coordinator call).
**Behavior:**
1. Coordinator compiles: what was planned, what was done, status vs plan, next priorities
2. Report written to `docs/reports/YYYY-MM-DD.md`
3. Report indexed to Brain with `sourceType: "session-report"`
4. `HANDOFF.md` "Last Session" block updated
**Why:** Prevents context loss between sessions. Gives future agents (and the user) a clear audit trail of what happened.
**Template:**
```markdown
# Session Report — YYYY-MM-DD
## What Was Planned | ## What Was Done | ## Status | ## Key Files | ## Next Session
```

---

## P4: Knowledge Population Protocol

**Trigger:** Admin calls `POST /api/admin/index-docs` OR on first boot after setup.
**Behavior:** All `.md` files in `docs/`, `CLAUDE.md`, `HANDOFF.md`, and `README.md` (if present) are indexed into the Brain.
**Why:** Agents should be able to search the codebase documentation, protocols, and plans using natural language. This makes the Brain the true knowledge base of the entire operation.
**Deduplication:** `ingestToBrain()` uses SHA-256 content hashing — unchanged files are skipped.
**Re-run:** Safe to call repeatedly (idempotent). Always call after adding new docs.

---

## P5: Agent Evolution Protocol

**Trigger:** After repeated successful use of an agent.
**Behavior:**
1. The optimizer (in `lib/optimizer/`) detects patterns in tasks handled by a team
2. Creates a `TaskProtocol` record: what the task type is, which local LLM handles it, what system prompt to use
3. Future similar tasks are routed to the local LLM instead of Claude API (zero cost)
4. Coordinator monitors success rate — if a protocol fails, it escalates back to Claude
**Why:** Every repetitive task should eventually cost $0. The system learns.
**Status:** Classifier + protocol-writer built. Auto-routing partially implemented.

---

## P6: Human Intervention Protocol

**Trigger:** Agent calls `request_human_input` tool during task execution.
**Behavior:**
1. Task is paused and marked `blocked`
2. SSE event `MISSING_INFO` fires → coordinator receives question
3. Coordinator surfaces question to user in chat with clear context
4. If Telegram is configured, `sendOwnerAlert()` fires immediately (DM to owner)
5. User answers → coordinator re-delegates task with answer included in description
**Why:** Agents should never silently fail when they need human input. Every pause should be surfaced clearly with enough context to act.

---

## P7: Data Retention Protocol

**Config:** Saved to `AgentMemory` at `ownerType: "system", ownerId: "config"`, `memoryType: "preference"`, key `data_retention`.

| Level | What's kept |
|---|---|
| `full` | Everything: all task results, research, chat summaries, token logs, session reports |
| `results_only` | Final task/plan results only — no intermediate steps, no raw research |
| `minimal` | Session reports + plan results only — minimal Brain footprint |

**Default:** `full` (recommended for personal use).
**Server space note:** 1 GB handles ~100k chunks. At 500 tokens/chunk, that's ~50M tokens of stored context.

---

## P8: Token Usage Protocol

**Trigger:** Every Claude API call.
**Behavior:**
1. `ApiUsage` record created per call: userId, service, model, inputTokens, outputTokens, credits
2. `UserCredits.balance` decremented
3. Weekly scan: `OptimizationScan` record shows API vs local LLM split + credits saved
**Reporting:** Visible at `/admin` → usage tab. Coordinator can report via `query_data` tool.

---

## P9: Onboarding Protocol

**Trigger:** First time the app is launched (0 users in DB → `/setup` page).
**Steps:**
1. Create admin account (email + password)
2. Select use case: Personal OS / Business Platform / Client Hosting / AI Lab
3. Select agent teams to generate (multi-select from catalog)
4. Set data retention preference (full / results_only / minimal)
5. Set LLM preference (Ollama / Claude API / mixed)
**Behavior after submit:**
- Admin user created
- Selected teams seeded into DB
- Preferences saved to `AgentMemory` (system config)
- Docs indexed into Brain (background)
- 5,000 starter credits granted

---

## P10: Webapp Hosting Protocol

**Status:** Planned (not built).
**Trigger:** User asks coordinator to build + host a web app.
**Planned flow:**
1. Dev Core team generates the app (Next.js or static HTML)
2. App saved to `/app/data/sites/<subdomain>/`
3. Nginx config generated and saved to `/sites/<subdomain>.conf`
4. VPS reloads nginx
5. App live at `<subdomain>.agentplayground.net` or client domain
6. `HostedApp` record created in DB with status, managing agent, file path
**Why:** The platform should be able to build and deploy products, not just answer questions.

---

## P11: Coordinator Self-Improvement Protocol

**Status:** Partially built (optimizer layer).
**Behavior:**
- After every Anthropic call, `evaluateAndWriteProtocol()` checks if the task could be handled by a local LLM
- If yes, creates or updates a `TaskProtocol` with pattern, system prompt, and local model
- Coordinator reads `TaskProtocol` records at start of relevant tasks to route locally
- Weekly scan generates `OptimizationScan` with: API vs local split, credits saved, new protocols
**Goal:** 80%+ of routine tasks handled by local Ollama models at zero cost.

---

## Quick Reference: What Gets Saved Where

| Event | Saved to | Source type |
|---|---|---|
| Web search | BrainDocument | `research` |
| Web browse | BrainDocument | `research` |
| Task completed | BrainDocument | `task-result` |
| Plan + results | BrainDocument | `plan` |
| Session report | BrainDocument + `docs/reports/` | `session-report` |
| Vault note | VaultNote | — |
| File converted | BrainDocument | `file` |
| Memory saved | AgentMemory | — |
| Token usage | ApiUsage | — |
