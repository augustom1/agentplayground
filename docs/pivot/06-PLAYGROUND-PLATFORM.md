# Playground + Library Spec

> Updated: 2026-06-25  
> Playground = organizational tool in the app. Library = download store on the website.

---

## Playground (in the app)

A Playground is an **organizational container** that groups your agents, skills, tasks, and projects by context. Nothing more.

You might have:
- **Personal Life** — Trainer, Nutritionist, Finance Advisor, Schedule Manager
- **Business** — Sales Agent, Content Writer, Operations Analyst
- **Education** — Study Assistant, Test Generator, Research Agent

Each Playground has a **standard dashboard view** — the same template for every Playground:
- Agent cards: each agent in this Playground, their role, current status
- Active tasks: what's running or scheduled right now
- Projects: grouped work in this context
- Skills: which skills are available here
- Quick-add: create a task, start a chat, add a new agent

There is no custom interface per Playground. It's just a dashboard. The point is organization and visibility, not a unique UI.

### Creating a Playground (user-built)
Any user can create a Playground:
1. Name it
2. Add agent teams to it (teams already exist in the app — you're just grouping them)
3. Optionally: pin specific projects, set a color/icon

### DB Model
```prisma
model Playground {
  id          String   @id @default(cuid())
  name        String
  icon        String?
  color       String?
  teamIds     String[]         // which teams belong here
  connectedApp ConnectedApp?   // optional — only present on library downloads that include one
  createdAt   DateTime @default(now())
  userId      String
  user        User     @relation(fields: [userId], references: [id])
}

model ConnectedApp {
  id           String     @id @default(cuid())
  playgroundId String     @unique
  playground   Playground @relation(fields: [playgroundId], references: [id])
  name         String
  type         String     // "bundled" | "external"
  url          String?    // for external type
  bundlePath   String?    // for bundled type: public/apps/[id]/
}
```

### UI Structure
```
Sidebar:
  Chat
  Teams
  Brain
  Plans
  ──────────
  Playgrounds
  > Personal Life
  > Business
  > Education
  + New Playground

Main panel when a Playground is selected:
  ┌─────────────────────────────────────────────────────┐
  │  Personal Life                          [Open App ▶] │  ← only shown if ConnectedApp exists
  ├───────────────┬───────────────┬─────────────────────┤
  │  Agents (4)   │  Active (2)   │  Projects (3)       │
  │  ─────────    │  ─────────    │  ─────────────       │
  │  Trainer      │  Meal plan    │  Q1 Fitness Plan    │
  │  Nutritionist │  Budget rev.  │  Budget 2026        │
  │  Finance Adv. │               │  Learning Goals     │
  │  Scheduler    │               │                     │
  ├───────────────┴───────────────┴─────────────────────┤
  │  Skills: nutrition-analysis, budget-tracking, +6 more│
  └─────────────────────────────────────────────────────┘
```

If the Playground has a Connected App, an "Open App" button appears in the top right. Clicking it opens the app in the main panel — replacing the dashboard view for that session.

---

## Connected App (optional, library only)

A Connected App is a **custom interface bundled with some library downloads**. It is not part of the base Playground concept — regular user-created Playgrounds do not have one. Only library Playgrounds that explicitly include one will show the "Open App" button.

A Connected App is built by a developer (you or a third party) for a specific workflow. Example: a real estate workflow screen showing current listings, lead pipeline, and email drafts — all powered by the agents in that Playground. The agents still live in AgentPlayground, but the Connected App gives a purpose-built UI for working with them.

### Two types

**Bundled** — static HTML/JS/CSS installed locally
- Installed with the Playground ZIP
- Served by AgentPlayground at `/apps/[id]/`
- Works offline
- Good for: simple workflow tools, dashboards, forms

**External** — hosted by the creator on their own server
- Only the manifest URL is saved locally
- Loaded in a full panel inside AgentPlayground
- Good for: complex tools with their own backend, real-time features

### Connected App API
A Connected App communicates with AgentPlayground via a small set of API endpoints. On load, it receives a scoped session token injected into the URL params.

```
GET  /api/app/me                  → current user
POST /api/app/chat                → send message to an agent team, streaming
GET  /api/app/brain/search?q=...  → semantic search in Brain
POST /api/app/brain/add           → add a document to Brain
POST /api/app/tasks/create        → create a task on a team
GET  /api/app/tasks               → tasks created by this app
GET  /api/app/events              → SSE: task completions, agent status
```

All calls are authenticated with the session token. The token is scoped to the permissions declared in the app's manifest. The user approves these permissions on install.

---

## The Library (library.agentplayground.net)

The Library is a **separate subdomain** where users browse and download pre-built Playgrounds. It is not a tab or page inside the app — it's its own website.

### What's in the Library

**Free Playgrounds** — just agent team configs + skills + Brain seeds
- User installs → a Playground is created in their app with pre-configured agents
- Standard dashboard view, no Connected App
- Good for: jump-starting a new context without building agents from scratch

**Paid Playgrounds** — agent configs + Connected App (custom workflow screen)
- Same install + also gets the Connected App
- The Connected App is what makes it worth paying for — purpose-built interface for that workflow
- One-time price: $19–$99 depending on complexity

### Browse Page
```
AgentPlayground Library

[Search...]  [Category ▾: Business / Personal / Education / Dev / Legal / Finance]
             [Type ▾: Free / Paid]

Free                        Paid
────────────────────────    ──────────────────────────
Personal Life Starter       Real Estate Pro     $49
Business Ops Starter        Legal Workflow      $79
Study Helper                Marketing Suite     $49
Dev Team Starter            Financial Analyst   $99
```

### Individual Listing Page
```
[Icon] Real Estate Pro
by AgentPlayground  |  $49  |  Business  |  86 installs

Agents + a purpose-built workflow screen for real estate professionals.

What's included:
- Agent team: Listings Analyst, Lead Manager, Email Writer, Market Researcher
- Skills: property-analysis, lead-tracking, email-drafting, market-data
- Connected App: workflow screen with listings pipeline, lead inbox, email drafts

[Screenshots of Connected App]

[Install — $49]
```

### Install Flow
1. Free: "Install" button → deeplink opens app, creates Playground with agents/skills/brain seeds
2. Paid: "Buy" → Stripe checkout → license key → deeplink install → license validated on install

---

## Resources (agentplayground.net/resources)

A section on the main website for developers who want to build Connected Apps.

Content:
- What a Connected App is and how it connects to AgentPlayground
- The Connected App API reference (all `/api/app/*` endpoints)
- Authentication: how the session token is injected and used
- The manifest format (`app.json`)
- Building a bundled app (static build)
- Building an external app (your own server)
- How to submit to the Library
- Example app repos (GitHub links)

This is written so that an agent (your coordinator, or a third-party AI tool) can read it and help a developer build a Connected App. Semantic HTML, clear structure, no fluff.

---

## Publishing to the Library

For pre-built Playgrounds (just agent configs — no Connected App):
1. Define the agent team configs in JSON
2. Add skills + Brain seed docs
3. Create a `playground.json` manifest
4. Submit to the Library

For Playgrounds with Connected Apps:
1. All of the above
2. Build the Connected App (bundled or external)
3. Create an `app.json` manifest for the app
4. Submit — manual review for paid listings, auto-approved for free + open source

Third-party creators can submit. Revenue share: 80% to creator, 20% platform fee.
