# AgentPlayground Pivot — Master Overview

> Created: 2026-06-18 | Updated: 2026-06-25  
> Status: Planning phase — no code changed yet  
> Read this first, then follow session order in `07-SESSIONS.md`

---

## What We're Building

AgentPlayground is a **free, downloadable app** that runs locally via Docker. It is a personal AI operating system: coordinator, agent teams, brain, plans, parallel workspaces.

The app organizes agents into **Playgrounds** — simple dashboards grouping agents by context (Personal Life, Business, Education). You build them yourself, name them, add teams. The view is always the same: your agents, tasks, skills, and projects for that context in one place.

The **Library** (`library.agentplayground.net`) is where you download pre-built Playgrounds. Free ones are just agent configs. Paid ones include a **Connected App** — a custom workflow screen for a specific use case (real estate pipeline, legal workflow, marketing suite). The Connected App is the premium offering; the base Playground is always simple.

The business runs on:
1. **Library downloads** — free + paid pre-built Playgrounds with optional Connected Apps
2. **B2B custom builds** — tailor-made Playgrounds (and optionally Connected Apps) for businesses, hosted or self-hosted

---

## The Three Things That Coexist

### 1. The App (downloadable, free, open-source)
- Runs locally via Docker: PostgreSQL + Redis + Ollama + Next.js all bundled
- BYOK: bring your own Anthropic/OpenAI keys, or use Ollama for free
- First-run wizard on fresh install
- Multi-workspace tabs: parallel agent sessions
- **Playgrounds**: organizational dashboards grouping agents by context
- **Library integration**: install downloaded Playgrounds directly into the app
- No locked features — entirely free

### 2. The Library (`library.agentplayground.net`)
- Separate subdomain — a standalone website, not a page in the app
- Browse pre-built Playgrounds by category
- **Free**: agent team configs + skills + Brain seeds — installs as a standard Playground dashboard
- **Paid**: agent configs + Connected App (custom workflow screen) — $19–$99 one-time
- Third-party creators can publish (80% revenue share)
- Installing from the Library creates a Playground in your app with the right agents pre-configured

### 3. B2B Custom Builds (service layer)
- Build a custom Playground (and optionally a Connected App) for a business client
- They use it on whatever hosting fits: shared VPS, dedicated VPS, or self-hosted
- White-label option: their brand, their domain, no AgentPlayground branding visible to their employees
- See `08-PLAYGROUND-PRODUCT.md` for detail

---

## Key Concept Distinctions

| Thing | What it is | Where it lives |
|---|---|---|
| **Playground** | Organizational container — groups agents by context | In the app |
| **Playground dashboard** | Standard view: agents, tasks, skills, projects | In the app |
| **Connected App** | Custom workflow screen for a specific use case | Optional, inside the Playground |
| **Library** | Download store for pre-built Playgrounds | `library.agentplayground.net` |
| **Resources** | Developer docs for building Connected Apps | `agentplayground.net/resources` |

---

## What Stays the Same

- VPS stack (Docker Compose + Traefik + Postgres + Redis + Ollama)
- Core architecture (Next.js App Router, Prisma, Tailwind v4)
- Coordinator + agent delegation system
- The Brain
- CLAUDE.md hard constraints (no Zod, no `any`, etc.)

---

## Build Order

1. **Phases 1-2** (now): Make the app downloadable and ship it. Playground dashboard is part of Phase 1 — it's a simple organizational view, not a complex feature.
2. **Phase 3** (after traction): Library website + Connected App loader + first paid listings.
3. **Phase 4** (after Library): B2B custom builds with the full Playground interface for non-technical employees.

---

## File Map

```
docs/pivot/
  00-OVERVIEW.md              ← this file
  01-VPS-ROLE.md              ← VPS cleanup + new responsibilities
  02-BASE-APP.md              ← Base app scope, tech decisions, feature set
  03-INSTALLER.md             ← Packaging, Docker, distribution
  04-WEBSITE.md               ← agentplayground.net + library subdomain + resources
  05-BUSINESS-MODEL.md        ← Revenue: Library downloads + B2B builds
  06-PLAYGROUND-PLATFORM.md  ← Playground dashboard + Connected App + Library spec
  07-SESSIONS.md              ← Session-by-session execution plan
  08-PLAYGROUND-PRODUCT.md   ← B2B: hosting options, white-label, delivery
```
