# Base App — Downloadable AgentPlayground

> Session: Pivot-B + Pivot-C  
> Lives at: `../agent-playground-desktop/` (sibling repo, new GitHub repo)  
> Stack: Same as VPS app — Next.js 15, Prisma, Tailwind v4, TypeScript

---

## What It Is

The base app is a **clean, self-contained version of AgentPlayground** that a user can download, run locally with Docker, and connect to the cloud if they upgrade. It is not a fork — it is a fresh project that copies and adapts the core of the VPS app.

Think of it like:
- Claude Desktop: wraps Claude API, stores local conversations
- Open Code Desktop: multiple parallel sessions, project-aware
- AgentPlayground Desktop: all of the above + real agent teams + local LLMs + Brain

---

## What's Included vs Excluded

### Included (core product)
- Chat with coordinator (streaming, tool loop)
- Teams + Agents (create, configure, delegate)
- Brain (vault, semantic search, document indexing)
- Plans (create → council → dispatch → execute)
- Playground (team hub, widget grid)
- Actions (pending action queue)
- Projects + Schedule
- Files (upload to Brain)
- Settings (API keys, appearance, connection)
- First-run setup wizard
- **Multi-workspace tabs** (new — see below)

### Excluded (personal / admin-only)
- /cv, /learn, /notes, /connect — personal pages
- Admin panel — desktop app users are always "owner" of their own instance
- Seed personal teams (CV Advisory, Job Search, Education, Fitness) — these get moved to addons/templates
- Hard-coded wallet addresses / billing page (no shared billing — BYOK)

### Changed vs VPS app
| VPS App | Base App |
|---|---|
| Multi-user (NextAuth roles) | Single-user (owner only) OR team (with invite codes) |
| Personal pages visible to admin | Not present |
| Billing via crypto/Stripe | Not present (BYOK — user pays their own API bills) |
| Fixed VPS Docker network | Local Docker or configurable cloud URL |
| No update mechanism | Polls VPS `/api/version` on startup |

---

## The Key New Feature: Multi-Workspace Tabs

This is the main UX differentiator over the VPS app. Inspired by Open Code Desktop.

### What It Is
- A tab bar at the top of the app (or side panel)
- Each tab = a **Workspace** (isolated chat context + active team)
- Multiple workspaces run simultaneously — agents in workspace 2 keep working while you type in workspace 1
- Workspaces can be named: "Q3 Report", "Client Pitch", "Code Review"
- Agent teams can autonomously create new workspaces for parallel subtasks

### Data Model
```prisma
model Workspace {
  id          String   @id @default(cuid())
  name        String
  teamId      String?  // active team for this workspace
  messages    Message[]
  tasks       Task[]   // tasks running in this workspace
  status      String   @default("idle") // idle | running | waiting
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}
```

### UI
```
[+ New] [Q3 Report ●] [Client Pitch] [Code Review ▶]
─────────────────────────────────────────────────
 Chat area for selected workspace
```

- `●` = workspace has unread messages
- `▶` = agents currently running in this workspace
- Color dot on tab shows workspace status (idle=grey, running=green, waiting=amber)
- Click any tab to switch instantly — no page reload
- Each workspace keeps its own scroll position, draft message

### Agent Teams + Parallel Work
When the coordinator creates a plan with multiple parallel tasks:
1. Each major subtask → opens a new workspace tab automatically
2. Tab shows live progress (SSE)
3. User can open any tab to see what the agent is doing
4. When all done, coordinator synthesizes in the original workspace

This is the "divide the work" feature the user described.

---

## Connection Modes

The base app has two modes, configured during first-run and changeable in Settings:

### Local Mode (default, free)
- Everything runs in Docker on the user's machine
- PostgreSQL, Redis, Ollama all local
- API keys stored in local `.env.local` (never sent anywhere)
- Works offline (for Ollama models — paid API obviously needs internet)

### Cloud Mode (for VPS-plan users)
- App points to a VPS URL (e.g. `https://client123.agentplayground.net`)
- Auth via license key → gets JWT from VPS
- All data lives on the VPS (Brain, Teams, Plans)
- Still uses local UI, but all API calls go to the VPS
- Good for: teams who want shared Brain, 24/7 background agents, managed infra

### Switching Modes
- Settings → Connection → "Local Docker" | "Cloud VPS"
- If switching to cloud: enter VPS URL + license key → validates → shows green checkmark
- All workspaces and data migrate prompt: "Your local data will not sync to cloud. Start fresh?"

---

## First-Run Setup Wizard

Shown when no database is detected (fresh install):

**Step 1 — Welcome**
> "AgentPlayground runs your own AI agents locally or in the cloud."
> [Get Started]

**Step 2 — Connection**
> ○ Local (Docker — free, BYOK)
> ○ Cloud (connect to your VPS plan)

**Step 3 — API Keys** (if local)
> Anthropic API Key: [___________] (required for Claude agents)
> OpenAI API Key: [___________] (optional)
> Ollama: auto-detected if running

**Step 4 — Create Your Account**
> Name: [___] Email: [___] Password: [___]
> (This creates the local owner account in your local DB)

**Step 5 — Choose a Starter Template** (optional)
> ○ Personal productivity (Research + Writing teams)
> ○ Software development (Code + Review teams)  
> ○ Business operations (Sales + Support teams)
> ○ Start blank

Done → opens main app, coordinator sends welcome message.

---

## Repo Structure

```
agent-playground-desktop/
  app/                    ← Next.js app (copied + modified from VPS app)
  lib/                    ← lib/ (same)
  prisma/                 ← Same schema, minus License model
  docker/
    docker-compose.yml    ← Local stack (postgres, redis, ollama, app)
    start.sh              ← Mac/Linux launcher
    start.bat             ← Windows launcher
  installer/
    build-mac.sh          ← Future: build .dmg
    build-win.ps1         ← Future: build .exe
  public/
  INSTALL.md              ← User-facing install instructions
  .env.example            ← Template for local config
```

---

## Branching + Release Strategy

- `main` — stable, released versions
- `dev` — active development
- Version tags: `v0.1.0`, `v0.2.0`, etc.
- GitHub Releases: each tag creates a release with ZIP attached
- The VPS `/api/version` endpoint reads the latest GitHub release tag
- Users download from agentplayground.net (which links to GitHub Releases or serves the file directly)

---

## What to Copy from VPS App

Copy these directories/files verbatim (then strip personal content):
- `app/api/chat/`, `app/api/teams/`, `app/api/agents/`, `app/api/brain/`, `app/api/plans/`, `app/api/actions/`, `app/api/notify/`
- `lib/chat-tools.ts`, `lib/agents/`, `lib/brain/`, `lib/planner/`, `lib/providers/`
- `prisma/schema.prisma` (minus License model)
- `app/globals.css` (design tokens)
- `components/` (UI components)
- `auth.ts`, `middleware.ts`

Do NOT copy:
- `app/(app)/cv/`, `app/(app)/learn/`, `app/(app)/notes/`, `app/(app)/connect/`
- `lib/seed-personal-teams.ts` → move to addon format
- `app/(app)/billing/` → replaced with simple BYOK settings
- `app/admin/` → replaced with simplified owner settings
