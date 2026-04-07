# Business Plan — Agent Playground

## 1. Executive Summary

Agent Playground is a done-for-you AI infrastructure service for small businesses and agencies.
We deploy a complete, self-hosted AI automation stack on the client's own server — giving them
Claude-powered agents, local LLMs, n8n workflow automation, a management dashboard, and web hosting,
without SaaS per-seat fees or data leaving their infrastructure.

Revenue model: one-time setup fees + monthly managed retainers + web development projects.

Target: 10 managed clients within 6 months generating $3,000–5,000 MRR.

---

## 2. Problem

Small businesses and agencies want AI automation but face:
- **SaaS costs that scale with usage** — OpenAI API bills grow unpredictably
- **Data privacy concerns** — sensitive client data going through third-party APIs
- **Complexity** — stitching together 5–10 tools requires DevOps knowledge they don't have
- **No ownership** — locked into vendor pricing, features, and uptime SLAs

---

## 3. Solution

A turnkey deployment of the Agent Playground stack on the client's VPS. They get:
- A private AI agent dashboard (their own URL, their own data)
- Local LLMs (qwen2.5 models) for routine tasks — no API cost per query
- Claude integration for high-quality reasoning tasks
- n8n for no-code workflow automation
- File management, Docker management, and an AI chat UI
- A website hosted on their own infrastructure

You handle all of it. They just use it.

---

## 4. Market

### Primary target
- **Digital agencies** (2–20 employees) managing client deliverables who want to automate repetitive work
- **Technical founders** who want AI automation but not the DevOps overhead
- **Consultants and freelancers** offering AI services to their own clients

### Market size
- 500,000+ digital agencies in the US alone
- Even 0.01% capture = 50 clients
- At $299/mo average retainer = $14,950/mo at 50 clients

### Why now
- LLMs are mature enough to be reliable for business automation (2024–2025)
- Self-hosting has become accessible (Docker, cheap VPS, Ollama)
- Businesses are actively looking for "AI that stays on my server"

---

## 5. Revenue Model

### One-Time Fees
| Service | Price |
|---|---|
| VPS Setup (Starter) | $350 |
| VPS Setup (Growth) | $600 |
| VPS Setup (Agency) | $900 |
| Custom website (static) | $500–800 |
| Custom website (Next.js) | $1,500–3,000 |
| n8n workflow build | $500–1,500 |
| Agent team configuration | $300–800 |

### Monthly Retainers
| Tier | Price | Includes |
|---|---|---|
| Starter | $99 | 1 VPS monitor, updates, support, 1 agent team |
| Growth | $199 | 1 VPS, unlimited teams, n8n flows, weekly check-in |
| Agency | $399 | 2 VPS, priority support, monthly strategy call, custom domain |

### Revenue Projections

**Month 1–2 (0→3 clients):** Focus on setup + 1 project each
- 3 × $500 setup = $1,500
- 3 × $99/mo retainer = $297/mo MRR
- 1 website project = $800
- Total month 2: ~$2,600

**Month 3–4 (3→6 clients):**
- 3 new × $500 setup = $1,500
- 6 × avg $150/mo retainer = $900/mo MRR
- 2 workflow builds = $1,500
- Total month 4: ~$3,900

**Month 5–6 (6→10 clients):**
- 4 new × $600 setup = $2,400
- 10 × avg $180/mo = $1,800/mo MRR
- Mix of projects = $2,000
- Total month 6: ~$6,200

---

## 6. Operations

### What it takes to deliver one client
1. Provision or configure VPS (1h) — client pays for VPS directly (~€9–19/mo to Hetzner)
2. Run `setup.sh` + DNS configuration (1h)
3. Customize dashboard, create agent teams (1–2h)
4. Client walkthrough / training call (1h)
5. Total: ~4–5h per client

### Ongoing monthly cost per client
- Your time: ~1h/mo monitoring, updates, support
- Infrastructure: client pays VPS directly — zero cost to you
- Anthropic API: client either pays directly or you pass through with margin

### Tools you need
- Git repo of this codebase (already have it)
- Hetzner or Contabo account for provisioning
- Your own domain (`agentplayground.net` — already have it)
- Cloudflare for DNS (free)
- Cal.com or Calendly for booking discovery calls (free tier)
- Stripe for invoicing / subscriptions (free until payment)

---

## 7. Competitive Landscape

| Competitor | What they are | Your advantage |
|---|---|---|
| Dify | Open-source LLM app builder (SaaS + self-hosted) | You offer done-for-you, not DIY |
| Flowise | Open-source LLM flow builder | Same — plus you include the full VPS stack |
| n8n Cloud | Hosted workflow automation | Self-hosted = cheaper long-term, data stays private |
| Agency GPT | Custom ChatGPT for agencies (SaaS) | No self-hosting option, per-seat pricing |
| Botpress | Enterprise chatbot platform | Too complex, expensive. You're simpler and cheaper. |

Your edge: **you sell the service, not just the software.** Clients get a working system, not a tool to figure out themselves.

---

## 8. Go-to-Market Plan

### Phase 1 (Month 1–2): Validation
- [ ] Finish and deploy `agentplayground.net` marketing site
- [ ] Deploy demo at `app.agentplayground.net` (or a demo subdomain)
- [ ] Close 2–3 clients from personal network (reduced price for testimonials)
- [ ] Document the onboarding process (Client Playbook)

### Phase 2 (Month 3–4): Inbound
- [ ] Post on Indie Hackers: "How I built a self-hosted AI stack that earns $X/mo"
- [ ] Show HN post when app is polished
- [ ] Twitter/X build-in-public thread about the stack
- [ ] 2–3 YouTube/Loom demos of the dashboard

### Phase 3 (Month 5–6): Scale
- [ ] Referral program: existing clients get 1 month free for each referral
- [ ] Agency partnerships: pitch web dev agencies to white-label the service
- [ ] Productize: offer a "deploy-it-yourself" kit with documentation for $49 one-time

---

## 9. Risks & Mitigations

| Risk | Likelihood | Mitigation |
|---|---|---|
| Anthropic API pricing changes | Medium | Local LLMs (qwen2.5) cover routine tasks |
| VPS outage | Medium | Regular backups (backup-db.sh), monitoring alerts |
| Client churns | Medium | Monthly retainer keeps you engaged and sticky |
| Competitor builds same thing | High | You have the done-for-you moat + head start |
| Too much time per client | Medium | Document everything, automate setup with setup.sh |

---

## 10. 6-Month Goals

| Metric | Target |
|---|---|
| Active managed clients | 10 |
| Monthly Recurring Revenue | $2,000 |
| One-time project revenue | $5,000 total |
| Websites built | 5 |
| n8n workflows deployed | 8 |
| GitHub stars (open-source if you go that route) | 200+ |
