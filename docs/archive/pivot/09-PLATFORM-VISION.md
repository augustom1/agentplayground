# AgentPlayground — Platform Vision
> Written: 2026-06-28
> Read this at the start of every Phase 2 and Phase 3 session.

---

## What AgentPlayground Is (the new mental model)

AgentPlayground is a **local AI platform** where the primary unit is the **Playground** —
a self-contained workspace that combines agent teams, scoped knowledge, and custom mini-tools
into a single contextual environment.

It is NOT a dashboard with tabs.
It is NOT an agent manager with a chat window.
It IS: a platform where each Playground feels like its own mini-app.

---

## The Three Top-Level Concepts

### 1. Chat
The global coordinator chat. Always accessible from the main sidebar.
User talks to the coordinator who delegates to any team. Not scoped to a playground.
Good for cross-cutting tasks, general questions, quick delegation.

### 2. Playgrounds
Each Playground is a **contextual workspace**:
- Has its own inner sidebar with context-specific navigation
- Chat inside a playground is scoped to that playground's teams
- Brain is scoped — only documents tagged to this playground surface inside it
- Subapps installed in a playground appear as nav items in its inner sidebar
- Multiple agent teams can collaborate inside one playground

Examples:
- **Dev Playground** — has backend team + DevOps team, scoped to code/infrastructure docs,
  inner sidebar shows: Chat, Dashboard, Brain (dev docs), Server Monitor (subapp), Deploy Log (subapp)
- **Marketing Playground** — has content team + social team, scoped to brand/campaign docs,
  inner sidebar shows: Chat, Dashboard, Brain (brand docs), Social Stats (subapp), Content Calendar (subapp)
- **Research Playground** — has research team + filing team, scoped to research docs,
  inner sidebar shows: Chat, Dashboard, Brain (papers/notes), Reference Library (subapp)

### 3. Overview
A global customizable widget dashboard. Shows cross-playground visibility:
active tasks from all playgrounds, agent status, recent completions, quick chat launcher.
Not scoped — it's the bird's eye view of everything.

---

## Playground Anatomy

```
/playground/[id]/               ← Dashboard (agents, active tasks, skills, recent completions)
/playground/[id]/chat           ← Chat scoped to this playground's teams
/playground/[id]/brain          ← Brain documents tagged to this playground
/playground/[id]/team/[teamId]  ← Individual team view
/playground/[id]/settings       ← Edit name, icon, teams, brain tags
/playground/[id]/app/[appId]    ← Installed subapp (Phase 3)
```

### Inner Sidebar (appears when inside a playground)
```
[Playground name + icon]         ← editable on hover

WORKSPACE
  Dashboard    → /playground/[id]
  Chat         → /playground/[id]/chat
  Brain        → /playground/[id]/brain
  Plans        → /plans (global, filtered to this playground in Phase 3)
  Actions      → /actions (global)

TEAMS (collapsible)
  [Team 1 name]  → /playground/[id]/team/[id]
  [Team 2 name]  → /playground/[id]/team/[id]

APPS (collapsible)                ← Phase 3
  [Installed subapp names]
  + Install App

[Settings]
```

---

## Brain Scoping

Each playground has a `brainTags` array (e.g., `["dev", "backend", "infrastructure"]`).
When the playground Brain page loads, it filters the global Brain to only documents that
have at least one matching tag.

When a user uploads a file inside a playground's Brain view, the playground's tags are
auto-applied to the document.

The global Brain (/files) still exists and shows everything — it's the admin view.
The playground Brain shows only what's relevant.

---

## Subapps (Phase 3)

A subapp is a mini-tool installed into a specific playground. Examples:
- Social Media Stats: shows follower counts, recent posts, engagement metrics
- Server Monitor: ping checks, uptime %, recent alerts
- Deploy Log: last 10 deploys, status, rollback button
- Content Calendar: shows scheduled content across platforms
- Analytics Dashboard: embeds a custom chart from their data

### How Subapps Work
- A subapp is a package (ZIP) with a `manifest.json` + a React component or an iframe URL
- Installed via: /playground/[id]/settings → Install App → upload .zip
- Once installed: appears in the playground's inner sidebar as a nav item
- Subapps can optionally call the coordinator API or read from the playground's Brain

### Open Platform
Any developer can build a subapp-compatible package and:
1. Use it privately in their own playground
2. Share it in the Library (free or paid)
3. Bundle it with a playground package for the Library

SDK docs will live at agentplayground.net/docs. The format is designed so a developer
using Claude Code can reference the docs page and build a compatible subapp without
needing to read the source code.

---

## Default Playgrounds (ship with the app)

When a fresh install completes the setup wizard, 3 default playgrounds are seeded:

| Playground | Icon | Teams matched | Brain tags |
|---|---|---|---|
| Development | 💻 | teams with "dev", "code", "tech", "engineer" in name | dev, code, development |
| Research | 🔬 | teams with "research", "study", "learn" in name | research, study, notes |
| Business | 💼 | teams with "business", "ops", "finance", "marketing", "sales" in name | business, ops, finance, marketing |

If no matching teams exist, the playground is created empty (user adds teams later).
These replace the old scattered tabs. The functionality that was in those tabs
(server pages, websites, blog, files, etc.) will eventually become subapps installed
into the relevant playground by default.

---

## Playground Creation Flow

Clicking "+ New Playground" in the sidebar opens a **chat-based creation panel**.
The coordinator acts as a setup assistant:

1. Assistant: "What would you like to use this playground for?"
2. User: describes intent ("a marketing workspace for client campaigns")
3. Assistant: proposes a config — name, icon, which existing teams to include, whether to
   create new teams, which Brain tags to apply
4. User: confirms or asks for changes
5. Assistant: creates the playground and navigates to it

Users can also:
- Import a playground package (.zip) from the Library
- Duplicate an existing playground

---

## Playground Creation Chat Tools

Three tools the assistant uses during playground creation:

```
list_teams           → returns all user teams with name + agent count
suggest_playground_config(userIntent) → LLM-generated proposed config as JSON
create_playground_from_config(name, icon, teamIds, brainTags, newTeams) →
  1. Create any newTeams
  2. Create the playground
  3. Return playgroundId
```

---

## Business Model (how Playgrounds generate revenue)

### Personal users (free)
- Download the app, create playgrounds from templates or from scratch
- Pay only for their own API usage (OpenAI/Anthropic)
- Platform is free forever

### Library (revenue stream 1)
- Free playground packages: basic agent configs + brain seeds
- Paid playground packages ($19–99): includes pre-built subapps (custom tools)
- Third-party creators: 80/20 revenue split
- Marketing Suite with social stats subapp = example of a paid playground

### B2B custom builds (revenue stream 2)
- Build a custom playground (specific agent configs + custom subapps) for a business
- Deploy on shared VPS ($150–250/mo) or dedicated VPS ($299–499/mo)
- White-labeled: client's branding, their own domain
- The playground IS the product the client's employees use
- Custom subapps (e.g., their CRM stats, their project tracker) make it uniquely theirs

### SDK / developer ecosystem (long-term)
- Developers build subapps and publish to Library
- AgentPlayground takes 20% of paid listings
- Drives platform stickiness: the more subapps exist, the more valuable the platform

---

## What Exists vs. What Needs Building

### Already built ✅
- Playground model (id, name, icon, color, teamIds, userId) in Prisma
- GET/POST/PATCH/DELETE /api/playgrounds and /api/playgrounds/[id]
- Playground list in sidebar (Sidebar.tsx) — links to /spaces/[id] (needs rename)
- /spaces/[id] dashboard (4-quadrant grid: agents, tasks, skills, completions)
- Create playground modal (name, icon, team multi-select)
- Brain / files system (global, not scoped)
- Chat (coordinator), plans, actions, agent lab, tools

### Needs building (Phase 2)
- Rename /spaces/[id] → /playground/[id]
- New sidebar structure (remove 3-tab system, flat Chat | Overview | Playgrounds)
- Playground inner sidebar (per-playground contextual nav)
- Playground scoped chat (/playground/[id]/chat)
- Playground scoped Brain (/playground/[id]/brain) with tag filtering
- brainTags field on Playground model
- Default playground seeding (3 defaults on fresh install)
- Playground creation assistant (chat panel with 3 tools)
- Overview widget dashboard (6 widgets, fixed grid)
- Settings: provider + model selector

### Needs building (Phase 3)
- Subapp model + install system
- Subapp package format (manifest.json + component/iframe)
- First subapps (social stats, server monitor)
- Open platform SDK docs at agentplayground.net/docs
- Library: playgrounds can bundle subapps
- B2B provisioning flow in /admin

---

## Key Design Principles

**Playgrounds are environments, not pages.** When you're in a playground, the content area
and the inner sidebar are contextually aware of that playground. Nothing bleeds in from
outside unless you go back to the global chat.

**The Brain is always scoped.** Users should never see "all 200 documents" when they're
working in a dev playground. They see the 20 docs relevant to dev. The global Brain is
an admin/power-user view.

**Creation is a conversation.** Filling out a form to create an agent team or playground
is developer UX. The target user is a non-technical professional. They should be able to
describe what they want in plain language and have the system figure out the rest.

**Subapps make playgrounds sticky.** A playground with a social stats subapp that shows
exactly your client's metrics is worth 10x more than a playground that just has chat.
This is where the B2B product lives.

**The platform is invisible for clients.** When you build a playground for a client,
they see their branded environment. AgentPlayground is the framework, not the product.
