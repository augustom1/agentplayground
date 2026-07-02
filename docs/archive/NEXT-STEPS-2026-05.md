# NEXT-STEPS.md — Agent Playground
> Read this at the start of every Claude Code session alongside HANDOFF.md.
> This document defines the full roadmap for the next development cycle.
> It consolidates: Playground Teams (Phase A), Admin Panel (Phase B),
> and the pending HANDOFF phases (Phase C) — in the correct build order.

---

## Stack Constraints (never violate these)

- **Next.js** App Router, `output: "standalone"`, multi-stage Dockerfile
- **Prisma 7** with `@prisma/adapter-pg` — never switch the adapter
- **NextAuth v5 beta** for auth — `session.user.role` for access control
- **Tailwind CSS v4** + **shadcn/ui** for all UI
- **Valibot** for all validation — **do NOT introduce Zod**
- **Laptop mode must stay intact** — SQLite / in-memory queue path; Redis features degrade gracefully when `REDIS_URL` is absent
- **No Docker build breaks** — all new env vars need safe defaults; new Prisma models go through migrations, not manual schema edits
- `eslint: { ignoreDuringBuilds: true }` and `typescript: { ignoreBuildErrors: true }` are already set — don't remove them

---

## Phase A — Playground Teams (build first, it's the core UX change)

### What changes

The **Playground tab currently redirects to sub-pages** — this behavior is replaced entirely. The Playground tab becomes a **Teams Hub**: a canvas where the user creates named Agent Teams, chats with the whole team through a unified interface, and configures each team through a mini admin panel built by chatting with the LLM.

This is the highest-priority UI change because everything else (admin panel, API monitor) sits on top of this structure.

---

### A1 — Database: Team & Membership Models

Add to `prisma/schema.prisma`:

```prisma
model AgentTeam {
  id          String   @id @default(cuid())
  name        String                         // "Business", "Personal", "DevOps"
  description String?
  emoji       String?                        // user-chosen icon e.g. "💼"
  color       String?                        // hex accent color for the card
  userId      String                         // owner
  user        User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  config      Json     @default("{}")        // LLM-generated team config (system prompt, routing rules, tool access)
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt

  members     AgentTeamMember[]
  threads     TeamThread[]

  @@index([userId])
}

model AgentTeamMember {
  id        String    @id @default(cuid())
  teamId    String
  team      AgentTeam @relation(fields: [teamId], references: [id], onDelete: Cascade)
  agentId   String
  agent     Agent     @relation(fields: [agentId], references: [id], onDelete: Cascade)
  role      String?   // e.g. "lead", "specialist", "reviewer" — freeform label
  addedAt   DateTime  @default(now())

  @@unique([teamId, agentId])
  @@index([teamId])
}

model TeamThread {
  id        String    @id @default(cuid())
  teamId    String
  team      AgentTeam @relation(fields: [teamId], references: [id], onDelete: Cascade)
  userId    String
  title     String?
  messages  Json      @default("[]")        // same message shape as existing chat threads
  createdAt DateTime  @default(now())
  updatedAt DateTime  @updatedAt

  @@index([teamId])
  @@index([userId])
}
```

> If `Agent` model doesn't already have a `teams AgentTeamMember[]` relation, add it to the existing Agent model.

---

### A2 — API Routes for Teams

Create `app/api/teams/`:

- `GET /api/teams` — list all teams for the current user (with member count, last activity)
- `POST /api/teams` — create a new team `{ name, description, emoji, color, agentIds[] }`
- `GET /api/teams/[id]` — get team details + members + recent threads
- `PATCH /api/teams/[id]` — update name, description, emoji, color, config
- `DELETE /api/teams/[id]` — delete team and all its threads

- `POST /api/teams/[id]/members` — add agent to team `{ agentId, role? }`
- `DELETE /api/teams/[id]/members/[agentId]` — remove agent from team

- `GET /api/teams/[id]/threads` — list threads for this team
- `POST /api/teams/[id]/threads` — create new thread
- `GET /api/teams/[id]/threads/[threadId]` — get thread with messages
- `POST /api/teams/[id]/threads/[threadId]/messages` — send a message to the team (see A3)

All routes: validate with Valibot, check `session.user.id` ownership.

---

### A3 — Team Chat: Message Routing Logic

When a message is sent to a team thread (`POST /api/teams/[id]/threads/[threadId]/messages`):

1. **Classify intent** — use the Playground Keeper (coordinator) to read the message and decide which team member(s) should respond. Pass the team's `config.systemPrompt` and the list of member agents with their roles and descriptions.
2. **Delegate** — call the selected agent(s) using the existing runner/delegation pipeline (the same path as individual agent chat, but the routing decision is made by the Keeper first).
3. **Synthesize** — if multiple agents respond, the Keeper produces a unified reply that attributes each agent's contribution. Format: inline attribution, e.g. *"[Architect]: ..."* then *"[Legal]: ..."* or a synthesized summary with agent callouts.
4. **Stream** — stream the final response back using the same SSE pattern as the existing chat.

The team's `config` JSON (set at creation or via LLM-personalization chat — see A5) controls:
- `systemPrompt`: team-level instructions all members follow
- `routingRules`: hints for the Keeper on which agent handles what
- `toolAccess`: which tools are available in this team context
- `responseStyle`: "individual" (each agent speaks) vs "synthesized" (Keeper unifies)

---

### A4 — Playground Tab: Teams Hub UI

**Route:** `app/playground/page.tsx` — replaces the current redirect behavior entirely.

**Layout:**

```
/playground
├── Teams Hub (default view)  ← replaces redirect
│   ├── Header: "Playground" + "+ New Team" button (top right)
│   ├── Team Cards grid (one card per team)
│   │   ├── Emoji + color accent
│   │   ├── Team name + description
│   │   ├── Member avatars (stacked, max 5 shown)
│   │   ├── Last active timestamp
│   │   └── "Open" button → goes to /playground/[teamId]
│   └── Empty state: friendly prompt to create first team
│
└── /playground/[teamId]  ← individual team workspace
    ├── Left sidebar
    │   ├── Team name + emoji (editable inline)
    │   ├── Thread list (recent conversations)
    │   │   └── "+ New Chat" button
    │   ├── Members section
    │   │   ├── Agent chips with role labels
    │   │   └── "+ Add Agent" button → agent picker modal
    │   └── "Team Settings" button → opens settings panel
    │
    ├── Main area: Team Chat
    │   ├── Thread title (editable)
    │   ├── Message list
    │   │   └── Messages show which agent responded (small attribution label)
    │   └── Input bar (same component as existing chat, but sends to team endpoint)
    │
    └── Right panel (collapsible): Team Admin Panel (see A5)
```

**"+ New Team" flow:**

A modal with:
1. Name + emoji picker + color swatch
2. Description (optional)
3. Agent multi-select (checkbox list of existing agents, searchable)
4. Role label per agent (optional freetext, e.g. "Lead", "Researcher")
5. Submit → creates team → navigates to `/playground/[teamId]`

---

### A5 — LLM-Powered Team Personalization

Each team has a **right-panel Team Admin** that is itself a chat interface. The user types what they want — the LLM reads the current team config and modifies it.

**How it works:**

- A dedicated `POST /api/teams/[id]/configure` endpoint receives a natural-language instruction and the current team config.
- The LLM (Claude via the existing Anthropic SDK integration) rewrites the relevant parts of the config JSON.
- The updated config is saved back via `PATCH /api/teams/[id]`.
- The user sees a confirmation of what changed: *"Updated: routing rules now send legal questions to Lex first, research tasks to Scout."*

**Examples of what the user can say:**
- *"Make this team more focused on business strategy. Legal questions go to Lex, financial questions go to Clio."*
- *"Change the response style so each agent speaks individually, don't synthesize."*
- *"Give this team access to the VPS exec tool."*
- *"Write a system prompt that makes all agents respond concisely, no bullet points."*

**UI:** A small chat panel in the right sidebar of the team workspace, labeled "Configure Team". It shows a history of configuration changes as a timeline below the chat input.

---

### A6 — Implementation Order for Phase A

1. Prisma migration — add `AgentTeam`, `AgentTeamMember`, `TeamThread`
2. API routes — teams CRUD + thread CRUD
3. Team message routing logic (`/api/teams/[id]/threads/[threadId]/messages`)
4. Teams Hub page (`/playground`) — grid of cards + create modal
5. Team workspace page (`/playground/[teamId]`) — sidebar + chat + right panel stub
6. Wire team chat to existing agent runner/delegation pipeline
7. LLM configuration endpoint + right panel UI
8. Stream responses with agent attribution

---

## Phase B — Admin Panel

> This is a direct continuation of the plan in `admin-panel-plan.md`.
> Build Phase A first. Phase B depends on the auth/role system being solid.

### B1 — Prerequisite: Role Field

Add `role String @default("user")` to the `User` model if not already present.
Set admin users via: `UPDATE "User" SET role = 'admin' WHERE email = 'your@email.com';`

### B2 — Route Protection

`app/admin/layout.tsx` — server component, checks `session.user.role === 'admin'`, redirects to `/` if not admin. Every `app/api/admin/*` route also checks this and returns 403 if not admin.

### B3 — Analytics Tab

Full spec is in `admin-panel-plan.md` → Part 1. Summary:

- Prisma models: `PageView`, `AnalyticsEvent`
- Client beacon script injected in root layout (`POST /api/admin/analytics/event` — public, rate-limited with Redis, degrades gracefully without Redis)
- UA parsing: `ua-parser-js`; geo: `CF-IPCountry` header or `geoip-lite`
- Query routes: `GET /api/admin/analytics/overview` and `/page`
- UI: MetricCards, TimeseriesChart (recharts), TopPagesTable, ReferrersTable, DeviceDonutChart, CountryBarChart
- DateRangePicker with presets: Today / 7d / 30d / 90d / custom
- Data via `useSWR`, manual refresh button, realtime polling every 30s

### B4 — API Monitor Tab

Full spec is in `admin-panel-plan.md` → Part 2. Summary:

- Prisma models: `ApiClient`, `ApiRequest`
- `ApiClientType` enum: `CLAUDE_MOBILE | EXTERNAL_APP | AGENT | WEBHOOK`
- `withApiLogger` HOF wraps API route handlers — logs every request to `ApiRequest`
- API keys: bcrypt-hashed (rounds=10), shown plaintext only once at creation, prefix stored for display
- Rate limiting: Redis sliding window on beacon and API routes; skipped gracefully if Redis absent
- UI: ClientList panel + ClientDetail panel (timeseries, status breakdown, latency, top endpoints, error log, rate limit bar)
- "Add Client" modal generates key, shows copy-once dialog
- `GET /api/admin/api-monitor/global` for cross-client aggregate stats

### B5 — Admin Sidebar Navigation

```
/admin                → redirect to /admin/analytics
/admin/analytics      → Analytics tab
/admin/api-monitor    → API Monitor tab

Stubbed routes (create empty pages, content later):
/admin/users          → user management
/admin/agents         → agent run history
/admin/system         → Redis, Ollama, Docker health
```

### B6 — Dependencies to Install

```bash
npm install ua-parser-js geoip-lite bcryptjs recharts
npm install -D @types/ua-parser-js @types/geoip-lite @types/bcryptjs
```

Do NOT install Zod. Validate all inputs with Valibot.

### B7 — Implementation Order for Phase B

1. Add `role` to `User` model + migration
2. Admin layout + route protection
3. Prisma models: `PageView`, `AnalyticsEvent`, `ApiClient`, `ApiRequest`
4. Analytics beacon route (public) + query routes (admin)
5. `withApiLogger` HOF — apply to at least one existing API route as proof of concept
6. API monitor CRUD routes + stats routes
7. Analytics UI
8. API Monitor UI

---

## Phase C — Pending HANDOFF Phases (from last Claude Code session)

> These are the phases from the HANDOFF.md left by the previous session.
> Build them after Phase A and B are stable.

### C1 — Phase 1 (from HANDOFF): Wire the Delegation

**This is the unlock for the whole vision — do this before C2-C5.**

- `runner.ts` gets a full tool loop (not just one tool call per run)
- `delegate_to_team` actually executes delegation — currently it routes but doesn't run
- Add `run_plan` tool: coordinator receives a plan object and kicks off parallel team execution
- Add `get_task_result` tool: coordinator polls or awaits team results and brings them back into the thread
- Raise coordinator iteration limit to **25** (currently too low for multi-team tasks)

**Test:** Tell the coordinator *"create a plan with a dev task and a research task, run it"* — both teams should execute with tools and results should come back in chat. If that works, delegation is live.

### C2 — Phase 2 (from HANDOFF): Skill Pack + Auto-Convert

- Small business skill pack in `default-skills.ts`:
  - Draft invoice, follow up on unpaid client, summarize weekly tasks, write a proposal, log a decision
- **UI/UX Pro Max skill** — a system prompt + tool config that enables design critique and component generation in the app's own chat (not an Ollama skill — routes to Claude API)
- **MarkItDown auto-convert on upload** — when any file is uploaded to a thread or agent context, run it through MarkItDown (Python, already installed or install via `pip install markitdown --break-system-packages`) before the LLM sees it. Store the markdown output alongside the original. This drastically reduces token usage and improves agent comprehension of PDFs, Word docs, PowerPoints.

### C3 — Phase 3 (from HANDOFF): Google & Microsoft as Chat Tools

Wire these as tools the coordinator and agents can call from any chat:

**Google:**
- `gmail_search(query)` — search inbox
- `gmail_send(to, subject, body)` — send email
- `gcal_list(from, to)` — list events
- `gcal_create(title, start, end, attendees?)` — create event
- `gdrive_search(query)` — search files
- `gdrive_read(fileId)` — read file content

**Microsoft:**
- `outlook_search(query)`
- `outlook_send(to, subject, body)`
- `onedrive_search(query)`
- `teams_send(channelId, message)`

Use OAuth2 with tokens stored encrypted in the `ApiClient` or a dedicated `OAuthToken` table. Expose as tools through the existing tool registry pattern.

### C4 — Phase 4 (from HANDOFF): Claude Desktop via MCP

Wire Claude Desktop to the app so it can call the Playground Keeper and agent teams as MCP tools. This is ~30 minutes of work — it's a config-only change:

1. Add an MCP server endpoint to the app: `GET /api/mcp/manifest` returns the tool manifest, `POST /api/mcp/call` routes to the correct handler
2. The tools exposed: `ask_team(teamId, message)`, `run_agent(agentId, message)`, `search_brain(query)`, `create_task(title, description, teamId?)`
3. Add the server to Claude Desktop's `claude_desktop_config.json`

Authentication: use an `ApiClient` of type `CLAUDE_MOBILE` (tracked in the API Monitor from Phase B).

### C5 — Phase 5 (from HANDOFF): Expand Coordinator System Prompt

Update the Playground Keeper's system prompt to be aware of everything added in C1-C4:

- Available agent teams and how to route to them
- Google and Microsoft tools and when to use them
- MarkItDown: always convert uploaded files before processing
- MCP: how external callers (Claude Desktop, Telegram, etc.) arrive and what context they carry
- VPS exec: when it's appropriate to run shell commands vs delegating to the DevOps team
- Council reasoning: when to invoke multi-LLM debate vs single-agent response

---

## Full Build Order Summary

```
Phase A  →  Phase B  →  Phase C1  →  Phase C2  →  Phase C3  →  Phase C4  →  Phase C5
Teams       Admin        Wire          Skills        Google/MS     MCP           Keeper
Hub         Panel        delegation    + convert     as tools      bridge        prompt
```

Do not skip ahead. Each phase depends on the auth model (NextAuth + roles), the delegation pipeline, and the tool registry being stable from the phase before it.

---

## Files Created This Planning Cycle

- `admin-panel-plan.md` — full detail spec for Phase B (Analytics + API Monitor)
- `NEXT-STEPS.md` — this file, master build order

When handing off to a new Claude Code session, say:
> "Read NEXT-STEPS.md and HANDOFF.md. We are on Phase [X]. Start there."
