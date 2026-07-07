# CLAUDE.md — Agent Playground · Business Context

> This folder is the business brain of Agent Playground.
> Open a Claude session here to work on strategy, marketing, sales, and operations.
> The technical platform lives one level up at `/` (monorepo root).
> **Read order:** this file → `00-overview.md` (authoritative model) → whatever the task needs.
> Product/technical source of truth: `../docs/VISION.md`. Where anything here conflicts with it, VISION wins.
> Updated: 2026-07-02 — replaced the old MercadoPago tier model ($49/$149/$299) with the current model.

---

## What This Business Is

Agent Playground is a **self-hosted AI operations platform** with an **open source core**.
Users deploy it on their own VPS and get AI agent teams, coordinated by the Playground Keeper,
that operate real infrastructure — n8n workflows, Telegram bots, deployments, documents —
without a developer in the loop except for protected actions.

**Revenue model (updated 2026-07-06, private-server-first — full detail in `00-overview.md` and `03-services-pricing.md`):**

| Stream | Price |
|---|---|
| **Private Server Deployment (flagship)** — own VPS + stack + custom playground(s), scoped by apps + users | $1,000–2,000 one-off |
| Recurring on deployments — server passthrough + ~30% brokerage (when brokered) + maintenance + future per-app fees | composed monthly (~$95–120/mo typical) |
| Custom playground (existing installation) | $350–500 one-off |
| Assisted VPS install (side business, zero config support) | $50 one-off |
| Shared/multi-tenant hosting | NOT offered yet (owner 2026-07-06) |

**The compounding asset:** the Playground Library — every custom client project produces
(where possible) a generic anonymized template that library-tier subscribers can deploy.

**Key differentiators:**
- Client owns their infrastructure forever (no SaaS lock-in); open source core means they can leave anytime
- Local LLMs via Ollama = zero per-token cost for routine tasks; Claude API for complex reasoning
- Client brings their own API keys — their token spend is theirs, always visible
- Agents that execute (workflows, bots, deployments), not chatbots that suggest
- Permission rings + audit log + one-tap Telegram approval = safe autonomy (the trust pitch)

---

## Sales Channels (current state, July 2026)

1. **`agentplayground.net`** — marketing site + `/download` (open source funnel). Live.
2. **`ar.agentplayground.net`** — Spanish-language **lead-gen page**: chatbot widget + contact
   section, 4-step process, FAQ. **No listed prices, no MercadoPago checkout** (removed in the
   Session 31 rebuild — pricing now happens in conversation after a lead comes in).
3. **Content** — planned video miniseries: agents operating real infrastructure. Each platform
   roadmap stage (n8n tools, Telegram bots, permission rings, deployments) is an episode.

**Sales flow now:** lead arrives via AR chatbot/contact → discovery call → quote from
`03-services-pricing.md` catalog → invoice (method agreed per client; MercadoPago available
for AR clients but no longer the automated site checkout) → delivery per
`04-vps-client-playbook.md` + `delivery/checklist.md` → template extraction for the Library.

---

## The Stack Being Sold

What runs on a client's VPS after a full installation:

| Service | Purpose |
|---|---|
| Agent Playground | AI agent dashboard + Playground Keeper (the product) |
| n8n | Visual workflow automation — agents create their own workflows via MCP tools (roadmap) |
| Ollama | Local LLM server — routine tasks at zero token cost |
| PostgreSQL + pgvector | Database + Brain vector search |
| Redis | Cache + queues |
| Traefik | Reverse proxy + automatic HTTPS |

Recommended VPS: Hetzner (~€9–19/mo, client pays provider directly).
Multi-tenant managed hosting: several client stacks on one powerful server — per-client
Docker Compose stack, separate network, resource caps, Traefik per domain.

---

## Target Customers

1. **Freelancer/developer (AR + global)** — buys install or self-hosts the open core; may resell
   playgrounds to their own clients.
2. **Small agency (5–20 people)** — internal AI ops; hosting + library tier is the natural fit.
3. **Solo founder, non-technical** — full installation + managed hosting; needs the Keeper to be
   the whole interface.
4. **Technical CTO** — evaluates the GitHub repo, buys time savings; entry via open source.

---

## Operating Rules

- Every custom delivery ends with the template question (Library rule).
- Client keys, client infrastructure, client spend — never absorbed, never hidden.
- RED-ring actions (payments, private keys, destructive ops) always stay with the client/owner.
- The company runs on the platform itself: owner ↔ Playground Keeper ↔ agent teams.
  If an internal process can't run through the platform, that's a missing platform feature.
- Prices are quoted in USD.

---

## Files in This Folder

```
business/
├── CLAUDE.md                ← You are here. READ FIRST.
├── 00-overview.md           ← Authoritative business model (updated 2026-07-02)
├── 01-business-plan.md      ← Long-form plan (historical framing; banner notes what changed)
├── 02-pitch-deck.md         ← Pitch narrative (pull numbers from 00/03 before using)
├── 03-services-pricing.md   ← Current service catalog + prices (updated 2026-07-02)
├── 04-vps-client-playbook.md← Step-by-step client VPS delivery
├── 05-website-sales.md      ← Sales site copy reference (AR site is now lead-gen, no prices)
├── 06-website-app.md        ← App/marketing site structure
├── 07-future-roadmap.md     ← Business roadmap by horizon (updated 2026-07-02)
├── 08-project-technical.md  ← Technical description for proposals
├── delivery/checklist.md    ← Master delivery checklist
└── marketing/               ← strategy.md + email-templates.md
```
