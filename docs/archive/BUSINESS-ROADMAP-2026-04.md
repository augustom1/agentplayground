# BUSINESS-ROADMAP.md — Agent Playground Commercialization

> **PRIVATE — do NOT commit to the open-source repo.**

---

## Two Companies

### Company A — Consulting (Local Registration)
Currency: fiat. Sells services and managed infrastructure.

**Revenue:**
1. Managed VPS deployments — setup €500-2,000 + €100-500/month maintenance
2. Expert consulting — AI automation strategy, custom integrations, €100-200/hr
3. Training & workshops — €500-2,000/session
4. Managed operations — run clients' agents for them, €500-2,000/month retainer
5. Own operations — use Agent Playground for your own content, outreach, lead gen

### Company B — Software (Tax-Optimized Jurisdiction)
Currency: primarily crypto. Owns the open-source platform and ecosystem.

**Jurisdiction shortlist:** Estonia (e-Residency), UAE (free zone), Singapore, Wyoming LLC

**Revenue:**
1. Skill Marketplace commission — 30% on paid skill sales
2. API access — Free (100 calls/mo), Pro $29/mo (5K), Business $99/mo (25K)
3. Premium skills & integrations — built by you, too valuable for free
4. Hosted SaaS version — $49-199/month for users who don't want to self-host
5. Courses — free starter (drives adoption), paid $49-499 (transformation-priced)

**Separation rule:** A sells services, B sells software. Never mix.

---

## The VPS Product

**What client gets:** VPS with Agent Playground deployed, configured, SSL, backups, Ollama.

| Tier | Setup | Monthly | Includes |
|------|-------|---------|----------|
| Starter | €500 | €100 | Basic setup, 2hr/mo support |
| Professional | €1,000 | €250 | Custom agents, 5hr/mo support |
| Enterprise | €2,000 | €500 | Full customization, SLA |

**Upsells:** Custom skills (€100-200/hr), integrations (€200-500 each), content/outreach setup (€500-1,000).

**Delivery:** `export-config.sh` → deploy to client VPS → `import-config.sh` → onboarding call.

---

## Go-To-Market

### Phase 1: Build & Dogfood (Weeks 1-6)
- Deploy your own production VPS (fix current deployment issues first)
- Use Agent Playground daily for your own operations
- Register consulting company
- Set up social accounts, create landing page on your own Nginx
- Document everything → future course material

### Phase 2: First Clients (Weeks 7-12)
- Outreach to 50-100 prospects using your own platform
- 3-5 free pilot deployments for testimonials
- First YouTube video showing platform in action
- Post daily on Twitter/LinkedIn via the platform itself
- Target: 2-3 paying VPS clients, €1,000-3,000/month

### Phase 3: Scale & Ecosystem (Weeks 13-24)
- Register software company in chosen jurisdiction
- Launch skill marketplace (seed with your own skills)
- Launch API access with free tier
- Release first paid course
- Agents handle lead gen + follow-up
- Target: €5,000-10,000/month

### Phase 4: Flywheel (Months 7-12)
- Recruit skill creators for marketplace
- Launch SaaS hosted version
- Crypto payments live
- Community Discord
- Target: €15,000-30,000/month diversified

---

## Content Strategy

Your platform creates the content that sells the platform:
- "I automated X with AI agents" — short social posts
- Screen recordings of the Keeper working
- Tutorial videos (created by agents)
- Case studies from client deployments
- Behind-the-scenes dashboard demos

Every piece of content is produced by Agent Playground. Never manually write a tweet.

---

## Metrics From Day One

**Consulting:** MRR, client acquisition cost, lifetime value, support hours/client, churn
**Software:** API calls (free vs paid), marketplace GMV, course sales, GitHub stars, marketplace listings
**Shared:** AI API costs/month, infra costs, profit margin per stream

Build tracking into Agent Playground's own dashboard.

---

## Risks

| Risk | Mitigation |
|------|-----------|
| AI API costs eat margins | Local LLM for routing. Cost tracking. Budget caps per client |
| Open-source fork competes | Marketplace ecosystem is the moat, not code |
| Social media account bans | Stay within official API terms. Quality > quantity |
| Regulatory (outreach) | CAN-SPAM/GDPR compliance built into tools |
| Crypto regulatory | Jurisdiction-specific accountant. Clean records. Separate books |
| Scope creep, never ships | Phase 0: just get it deploying. Then iterate |

---

## Immediate Actions

1. Get current app deploying to VPS without errors
2. Commit VISION.md to repo (it's the Claude Code compass)
3. Start using the platform daily
4. Set up consulting social media accounts
5. Create landing page on your Nginx
6. Research software company jurisdictions
7. Identify 20 potential pilot clients
8. Track time and costs from today
