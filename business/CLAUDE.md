# CLAUDE.md — AgentPlayground AR · Business Context

> This folder is the business brain of AgentPlayground AR.
> Open a Claude session here to work on strategy, marketing, product design, and operations.
> The technical platform that powers this business lives one level up at `/` (the monorepo root).

---

## What This Business Is

**AgentPlayground AR** is a managed service that installs and configures a full AI automation stack on clients' VPS servers — charging a one-time setup fee, paid through MercadoPago.

The core product is **labor**: we set up a complex, multi-service Docker stack so the client doesn't have to. The client pays once, gets a working AI platform on their own server, and we never touch it again unless they upgrade.

**Key differentiators:**
- The client owns their infrastructure forever (no SaaS lock-in)
- Local LLMs via Ollama = zero per-token cost for routine tasks
- Claude API available for complex reasoning (client brings their own key)
- n8n gives no-code workflow automation on top of the AI stack
- Self-improving: the platform learns to route cheap tasks to local models

**Current sales channel:** `ar.agentplayground.net` — Spanish-language static page with MercadoPago Checkout Pro.

---

## The Technical Stack Being Sold

When a client buys any of our services, here is what runs on their VPS:

| Service | Purpose | URL pattern |
|---|---|---|
| AgentPlayground | AI agent dashboard (the "brain") | app.DOMAIN |
| n8n | Visual workflow automation, 400+ connectors | n8n.DOMAIN |
| Ollama | Local LLM server (Qwen, Llama, Mistral) | internal only |
| PostgreSQL + pgvector | Database + vector search | internal only |
| Redis | Cache + task queues | internal only |
| Traefik | Reverse proxy + automatic HTTPS (Let's Encrypt) | routes all above |
| FileBrowser | Web-based file manager | files.DOMAIN |
| Portainer | Docker management GUI | manage.DOMAIN |
| Nginx | Static website hosting | DOMAIN / www.DOMAIN |

**Minimum server requirements:** Ubuntu 22.04+, 4 GB RAM, 40 GB disk, 2 vCPU
**Recommended:** 8 GB RAM, 80 GB disk (to run qwen2.5:7b comfortably)

**Typical VPS cost for client:**
- Hetzner CX21 (4GB/2vCPU): ~€6/month (~$6.50 USD)
- Hetzner CX31 (8GB/4vCPU): ~€11/month (~$12 USD) ← recommended
- DigitalOcean 4GB Droplet: ~$24/month USD
- Vultr 4GB: ~$24/month USD

We recommend Hetzner to Argentine clients. Cheapest quality option in Europe/US. Clients can pay Hetzner in USD with Wise or crypto.

---

## Product Catalog

### Básico — $49 USD
**What it is:** Base infrastructure setup. No AgentPlayground yet.

**What the client gets:**
- Docker + Docker Compose installed and configured
- PostgreSQL + Redis containers running and persisted
- Nginx serving their domain (static site placeholder)
- Traefik reverse proxy with Let's Encrypt HTTPS on their domain + wildcard subdomains
- n8n running and accessible at `n8n.DOMAIN`
- FileBrowser at `files.DOMAIN`
- Portainer at `manage.DOMAIN`
- Admin credentials for all services delivered via encrypted message
- Basic `docker compose ps` health check screenshot

**Who this is for:** Developers/sysadmins who want the infrastructure but will configure the AI layer themselves. Also a lower-commitment entry point.

**Time to deliver:** 1–2 hours actual work. Can be done same day.

---

### Stack Completo — $149 USD
**What it is:** Full AgentPlayground + AI stack. The main product.

**What the client gets:** Everything in Básico, plus:
- AgentPlayground dashboard deployed and running at `app.DOMAIN`
- First admin account created (credentials delivered securely)
- Ollama running with **qwen2.5:3b** and **qwen2.5:7b** pre-pulled
- 5 pre-built agent teams configured:
  - Dev Core (coding, debugging, PR review)
  - DevOps (infrastructure, deployments, Docker)
  - Product & Design (UX, copy, research)
  - Business & Growth (marketing, analytics, strategy)
  - Command Center (coordinator that routes to all other teams)
- Anthropic Claude integration ready (client adds their API key in Settings)
- 30-minute onboarding walkthrough document: what each section does, how to chat with agents, how to add skills
- n8n connected to AgentPlayground internal API (so n8n workflows can trigger AI agents)

**Who this is for:** Freelancers, small agencies, entrepreneurs, startup CTOs. Anyone who wants to run their own AI ops platform without hiring a DevOps engineer.

**Time to deliver:** 2–4 hours actual work. 24–48h turnaround.

---

### Premium + Soporte — $299 USD
**What it is:** Stack Completo + 30 days of active support and maintenance.

**What the client gets:** Everything in Stack Completo, plus:
- 30-minute live onboarding call (Google Meet / Zoom)
- 30 days of support via email and WhatsApp (response within 24h)
- Automated daily database backup configured (pg_dump to `/data/backups`, kept 7 days)
- Stack updates applied during the 30 days
- Custom branding: their logo, company name, and color scheme in AgentPlayground
- Any additional n8n workflow built (up to 2 workflows)
- Post-delivery check-in at day 15 and day 30

**Who this is for:** Non-technical founders and executives who need hand-holding. Agencies that want to resell the platform to their own clients. Anyone who wants accountability.

**Time to deliver:** Initial setup same as Stack Completo (24–48h), then ongoing support for 30 days.

---

## Current Pricing Rationale

| Tier | Price | Est. hours | $/hr implied |
|---|---|---|---|
| Básico | $49 | 1–2h | ~$25–49/hr |
| Stack Completo | $149 | 3–5h | ~$30–50/hr |
| Premium | $299 | 5–7h + 30d support | variable |

These are **low introductory prices** for the Argentine market (where $49 USD = significant purchasing power parity). Once we have 5–10 positive reviews, prices should increase:
- Básico → $79
- Stack Completo → $249
- Premium → $499

**Add-ons to consider later:**
- Monthly maintenance plan: $29/month (updates, monitoring, 1 support ticket)
- Claude API credits setup: $19 (help client get and configure their Anthropic key)
- Custom n8n workflow: $49–99 per workflow
- White-label for agencies: $399 (their branding, their domain, they resell to clients)
- Training session (1hr): $79

---

## Target Customer Profiles

### Profile 1: Argentine Freelancer/Developer
- Works with small businesses, builds web apps
- Wants to offer "AI automation" as a service to their clients
- Buys Stack Completo to set up on their own server, then resells to clients
- Budget-conscious, MercadoPago native
- Finds us via Twitter/X, LinkedIn, dev communities

### Profile 2: Small Agency (5–20 people)
- Digital marketing, e-commerce, or SaaS agency
- Wants internal AI tools (content generation, data analysis, customer comms)
- Has a technical person who can manage it but doesn't want to build from scratch
- Buys Premium for the support and onboarding
- Finds us via referrals, LinkedIn, Google

### Profile 3: Solo Founder / Non-technical Entrepreneur
- Has a startup idea or early business
- Understands AI is important but doesn't know how to implement it
- Needs hand-holding → Premium
- Finds us via LinkedIn, Instagram, word of mouth

### Profile 4: Technical CTO / Dev Lead
- Wants full control, hates SaaS lock-in
- Evaluates the GitHub repo first, then buys for time savings
- Probably Básico or Stack Completo
- Finds us via GitHub, Hacker News, dev Twitter

---

## Sales Flow (Current State)

1. **Discovery:** Client lands on `ar.agentplayground.net`
2. **Intent:** Clicks "Pagar con MercadoPago" on a plan
3. **Payment:** Routed to MercadoPago Checkout Pro. Pays with card/debit/transfer
4. **Notification:** MercadoPago sends IPN to `app.agentplayground.net/api/mercadopago/webhook`
5. **Manual follow-up (current):** We get the payment notification in the AgentPlayground activity log → manually email the client to start onboarding
6. **Delivery:** We access their VPS via SSH, run the setup, deliver credentials
7. **Done**

**What's manual right now:**
- Payment → notification email to client (not automated yet)
- Delivery tracking (no ticket system)
- Follow-up at day 15/30 for Premium

**Quick wins to automate:**
- n8n webhook → send automated "payment received" email to client
- n8n webhook → create a Notion/Trello/Linear card for each sale
- n8n webhook → WhatsApp message to ourselves when a sale comes in

---

## What Needs to Be Done Before First Sale

- [ ] Get `MERCADOPAGO_ACCESS_TOKEN` and add to `.env.local`
- [ ] Register webhook URL in MP dashboard
- [ ] Set up a contact email that checks regularly (hello@agentplayground.net)
- [ ] Write email templates: payment received, onboarding start, credentials delivery
- [ ] Test the full payment flow with MP sandbox (use `sandbox_init_point` URL)
- [ ] Write delivery checklist (see `delivery/` folder)
- [ ] Define what VPS the client needs (document in a "Before you buy" section on the AR site)

---

## Open Questions / Decisions Needed

- Should we require the client to have a VPS ready before buying, or help them get one?
- Do we offer Hetzner referral links for extra income?
- What payment methods to prioritize: tarjeta de crédito, débito, transferencia?
- Do we want to add a WhatsApp contact button on the AR site for pre-sales questions?
- Pricing in ARS vs USD on the site? (Currently USD — Argentine inflation makes ARS messy)
- Do we want a CRM or just a spreadsheet for tracking clients?

---

## Files in This Folder

```
business/
├── CLAUDE.md                ← You are here. Full business context. READ FIRST.
│
├── (legacy docs from earlier session — still useful for background)
├── 00-overview.md           ← Original business overview
├── 01-business-plan.md      ← Executive summary + business plan
├── 02-pitch-deck.md         ← Pitch deck outline
├── 03-services-pricing.md   ← Early pricing notes (superseded by this CLAUDE.md)
├── 04-vps-client-playbook.md← VPS delivery playbook
├── 05-website-sales.md      ← Sales site notes
├── 06-website-app.md        ← App notes
├── 07-future-roadmap.md     ← Roadmap
├── 08-project-technical.md  ← Technical overview
│
├── delivery/
│   └── checklist.md         ← Master delivery checklist (use for every installation)
│
└── marketing/
    ├── strategy.md          ← Channels, messaging, content calendar
    └── email-templates.md   ← Email templates for onboarding, delivery, follow-up
```
