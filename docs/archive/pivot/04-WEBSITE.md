# Website — agentplayground.net + library.agentplayground.net

> Updated: 2026-06-25  
> Two web properties: the main site + the Library subdomain.

---

## Property 1 — agentplayground.net (main site)

Download portal, documentation, and resources for developers.

### Page Structure

```
agentplayground.net/
  /                     ← Homepage
  /download             ← Download + install guide
  /docs                 ← User documentation
  /docs/install
  /docs/quickstart
  /docs/playgrounds     ← What Playgrounds are, how to create one
  /resources            ← Developer resources (build a Connected App)
  /resources/api        ← Connected App API reference
  /resources/manifest   ← playground.json + app.json format
  /resources/examples   ← Example repos
  /contact              ← Contact / request custom B2B build
  /llms.txt
  /sitemap.xml
  /robots.txt
```

### Homepage

```
Hero:
  Run your own AI agents.
  Free. Local. Yours.

  [Download]   [Browse the Library →]   [GitHub]

  "Personal AI operating system — local LLMs, agent teams, organized into Playgrounds.
   Free forever. No subscriptions."

Three things:
  Agents       — Build structured teams with skills and memory.
  Playgrounds  — Organize them by context: work, personal, education.
  Library      — Download pre-built Playgrounds built for specific workflows.

How it works:
  1. Download and run with Docker
  2. Build your agent teams or download a pre-built Playground from the Library
  3. Organize into Playgrounds, run tasks, build your AI stack
```

### Resources (`/resources`)

This is the developer section — for people building Connected Apps to submit to the Library.

```
agentplayground.net/resources

  Build on AgentPlayground

  Connected Apps let you pair a custom workflow screen with any Playground.
  Users install your app alongside the agent team you designed it for.

  [API Reference]  [Manifest Format]  [Example Apps on GitHub]  [Submit to Library →]

  ---

  Connected App API
  — what endpoints are available
  — authentication (session token injection)
  — streaming chat, brain search, tasks, events

  Manifest format (app.json)
  — fields, types, permissions list

  Getting started
  — build a bundled app (static HTML/JS/CSS)
  — build an external app (your own server)
  — test against your local AgentPlayground instance
  — submit to the Library
```

Written in clean semantic HTML. No fluff. Structured so an AI agent (or developer's AI assistant) can read it and help build a Connected App.

### Tech (same as before — Option A)
Add `(marketing)` route group to the VPS app. Traefik routes `agentplayground.net` to the dashboard container.

---

## Property 2 — library.agentplayground.net (the Library)

The download store for pre-built Playgrounds. Separate subdomain, separate route group (`app/(library)/`), public-facing.

### Page Structure

```
library.agentplayground.net/
  /                     ← Browse all Playgrounds
  /[category]           ← Category: personal, business, education, legal, finance, dev, ...
  /playground/[id]      ← Individual listing page
  /submit               ← Creator submission form
  /account              ← Creator dashboard (listings, revenue, installs)
```

### Browse Page

```
AgentPlayground Library

[Search...]   [Category ▾]   [Free / Paid]

Free                             Paid
───────────────────────────      ──────────────────────────────
Personal Life Starter            Real Estate Pro         $49
  3 agents · free                  4 agents + workflow app
  [Install]                        [Buy]

Business Ops Starter             Legal Workflow          $79
  4 agents · free                  3 agents + workflow app
  [Install]                        [Buy]

Study Helper                     Marketing Suite         $49
  2 agents · free                  5 agents + workflow app
  [Install]                        [Buy]
```

### Individual Listing Page

```
[Icon]  Real Estate Pro  ·  $49  ·  Business  ·  86 installs

Agents pre-configured for real estate professionals.
Includes a workflow screen: listings pipeline, lead inbox, email drafts.

What's included:
  Agents:  Listings Analyst · Lead Manager · Email Writer · Market Researcher
  Skills:  property-analysis · lead-tracking · email-drafting · market-data
  App:     Real Estate workflow screen (pipeline + inbox + drafts)

[Screenshots of the Connected App]

[Install — $49]   (or [Install Free] for free listings)
```

### Install Flow
- Free: "Install" button → deeplink (`agentplayground://install?id=personal-life-starter`) opens the app and creates the Playground with pre-configured agents
- Paid: "Buy" → Stripe/MercadoPago checkout → license key → same deeplink with key → app validates license on install

### Creator Submission (`/submit`)
- Playground name, description, category, icon
- Agent team configs upload (JSON)
- Skills + Brain seeds upload
- Optional: Connected App — bundled ZIP or external URL + `app.json`
- Price: free or set amount
- Screenshots (up to 5)
- Creator payment info (Stripe Connect for revenue share)
- Review: auto-approved for free + open source; manual review for paid

### Creator Dashboard (`/account`)
- Listings with install counts, revenue, reviews
- License key management
- Payout history

---

## Connecting the App to the Library

Inside AgentPlayground there's a "Library" button (in Playgrounds section or Settings). Clicking it opens `library.agentplayground.net` in a full panel within the app. Installs are triggered via deeplink back to the local app.

For installs from within the app panel: `POST http://localhost:3000/api/library/install` handles the ZIP extraction and Playground creation.

---

## llms.txt (agentplayground.net)

```
# AgentPlayground

Free, open-source AI agent platform. Runs locally via Docker.

## What it does
- Coordinator delegates to structured agent teams
- Brain: vector memory, semantic search, document indexing
- Playgrounds: organize agents by context (Personal, Business, Education)
- Library: download pre-built Playgrounds with optional custom workflow screens

## Download
https://agentplayground.net/download

## Library
https://library.agentplayground.net

## Build a Connected App
https://agentplayground.net/resources

## GitHub
https://github.com/agentplayground/app

## Contact
hello@agentplayground.net
```
