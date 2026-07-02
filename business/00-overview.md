# Agent Playground — Business Overview
> Updated: 2026-07-02. This file is the authoritative description of the business model.
> It follows `docs/VISION.md` §1 (the product/technical source of truth).
> Where older files in this folder disagree with this one, this one wins.

## What This Is

Agent Playground is a **self-hosted AI operations platform**. A user deploys it on their own VPS
and gets a system of AI agent teams, coordinated by a central orchestrator (the **Playground Keeper**),
that does real work on real infrastructure — not a chatbot that suggests things, but agents that execute:
n8n workflows, Telegram bots, services, files, documents — without a human developer in the loop,
except for a small set of protected actions (payments, private keys, destructive operations).

## The Business Model

**Open source core → paid services → recurring hosting.**

### 1. Open source core (adoption engine)
- The platform itself is open source. This drives adoption, credibility, and content.
- Content: video miniseries showing agents operating real infrastructure.
- The open core is the top of the funnel — it is never crippled to force upgrades.

### 2. Paid services (one-off revenue)

| Service | Price |
|---|---|
| Custom playground (built to client spec) | $350–500 |
| Full framework installation + custom playground | $1,000–1,500 one-off |

### 3. Recurring revenue (managed hosting)

| Tier | Price | What they get |
|---|---|---|
| Basic managed hosting | ~$100/mo | Their stack, hosted and maintained |
| Hosting + Playground Library | ~$180–200/mo | Above + browse/try/deploy library playgrounds |
| Dedicated infrastructure | ~$250–300/mo | Own server, isolation, priority support |

### 4. The Playground Library (the compounding asset)
- A catalog of ready-made playgrounds (personal and business) that subscribed clients can
  browse, try, and deploy to their own installation.
- **Rule: every custom client project should, where possible, produce a generic, anonymized
  template for the library.** Custom work compounds into product.

## Operating Principles

- **Multi-tenant from the start:** multiple client stacks on one powerful server — per-client
  Docker Compose stacks, resource caps, separate Docker networks, Traefik routing per domain.
- **Per-client API keys:** client LLM usage runs on the client's own key (or metered with
  explicit markup). We never silently absorb client token costs.
- **Budget visibility over frugality:** token spend is expected; invisible or wasted spend is not.
  Per-agent budgets, burn-rate reports, and kill-switches are product features — and later a
  sellable client-facing dashboard.
- **Generic platform features, never one-off scripts:** if code only serves one demo, it's scope creep.
- **Internal use = product QA:** we run the company on the platform itself (scheduling, publishing
  pipelines, budget dashboards, template deployment). Everything built for ourselves must be a
  platform feature a client could also use.

## Sales Channels

- `agentplayground.net` — marketing + download (open source funnel)
- `ar.agentplayground.net` — Spanish-language lead-gen page for AR services market
  (chatbot + contact; no listed prices — pricing happens in conversation)
- Content (miniseries, blog) → inbound leads

## How Day-to-Day Company Work Runs

The company itself is operated through the platform:
1. Owner talks to the **Playground Keeper** (coordinator) — single interface for business + dev work.
2. Keeper delegates to agent teams (business, marketing, dev) for execution.
3. Client delivery work follows `04-vps-client-playbook.md` and `delivery/checklist.md`.
4. Each custom delivery ends with: "can this become a library template?" If yes, anonymize and add.

## File Map (this folder)

| File | What |
|---|---|
| `00-overview.md` | This file — authoritative model |
| `01-business-plan.md` | Long-form plan (historical framing, banner notes what changed) |
| `02-pitch-deck.md` | Pitch narrative (update numbers from this file before using) |
| `03-services-pricing.md` | Current service catalog + prices |
| `04-vps-client-playbook.md` | Step-by-step client VPS delivery |
| `05-website-sales.md` | Sales site copy reference |
| `06-website-app.md` | App/marketing site structure |
| `07-future-roadmap.md` | Business roadmap by horizon |
| `08-project-technical.md` | Technical description used in proposals |
| `delivery/checklist.md` | Client delivery checklist |
| `marketing/` | Strategy + email templates |
