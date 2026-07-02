# Business Model — Revenue Streams + Pricing

> Updated: 2026-06-25  
> Model: Free app + Library downloads + B2B custom builds  
> The app is always free. Revenue comes from what people buy for it and what you build for clients.

---

## Core Principle

The app is free, open-source, no subscriptions, no locked features.

Revenue comes from:
1. **Library** — selling pre-built Playgrounds (agent configs + optional Connected App workflow screens)
2. **B2B custom builds** — building custom Playgrounds for businesses, optionally hosting them

---

## Revenue Stream 1 — The Library

### Free Playgrounds
- Agent team configs + skills + Brain seeds. No Connected App.
- User installs → a Playground is created with pre-configured agents.
- Your cost: zero. Their cost: their own API usage.
- Why build free ones: audience, word of mouth, showcase of what's possible.

### Paid Playgrounds (include a Connected App)
- Everything in free + a Connected App: a custom workflow screen built for that use case.
- One-time purchase: $19–$99.
- Nearly 100% margin after the app is built — zero marginal cost per sale.

### Third-Party Creators
- Any developer can submit a Playground to the Library.
- Revenue share: 80% to creator, 20% platform fee.
- Self-growing marketplace without you building every listing.

### Planned Library Catalog

**Free (launch with these)**
| Playground | Agents |
|---|---|
| Personal Life Starter | Trainer, Nutritionist, Finance Advisor, Schedule Manager |
| Business Ops Starter | Process Analyst, Doc Manager, Report Writer |
| Study Helper | Research Agent, Study Assistant, Flashcard Generator |
| Dev Team Starter | Code Reviewer, Architecture Advisor, Test Writer |

**Paid (include Connected App)**
| Playground | Connected App | Price |
|---|---|---|
| Real Estate Pro | Listings pipeline, lead inbox, email drafts | $49 |
| Legal Workflow | Case tracker, doc review queue, research panel | $79 |
| Marketing Suite | Content calendar, brief generator, social planner | $49 |
| Financial Analyst | Portfolio view, research panel, report builder | $99 |
| HR Recruitment | Candidate pipeline, job post builder, interview prep | $79 |

**Year 1 target:** 8 paid listings × avg $59 × 15 sales/mo = ~$900/mo passive

---

## Revenue Stream 2 — B2B Custom Builds

Businesses want a Playground (and usually a Connected App) built for their specific workflow. They don't want to configure agents — they want something working for their team on day one.

### What's Sold

**Custom Playground build (no hosting):**
- You design the agent team, build the Connected App if needed, configure the Brain
- They run it on their own AgentPlayground instance
- Price: **$499–1,499 one-time** depending on scope
- Includes: discovery call, build, handoff call

**Custom build + hosting:**
Three options depending on their budget and scale:

| Hosting | Monthly | Setup fee | Best for |
|---|---|---|---|
| Shared VPS | $150–250/mo | $299 | Small teams (2–10 users), light workload |
| Dedicated VPS | $299–499/mo | $499 | Medium teams (10–50 users), privacy-sensitive |
| Self-hosted | $0/mo | $499–999 | They bring own infra; optional $99/mo support |

### White-Label
All B2B builds can be white-labeled:
- Client's name, logo, color scheme
- Their own domain (or subdomain of yours)
- AgentPlayground branding not visible to their employees
- The platform is invisible infrastructure; the client gets the credit

### Delivery Process
1. Contact form on `agentplayground.net/contact` or direct outreach
2. 30-min discovery call — workflow, team size, data privacy needs
3. Agree on scope + pricing, take first payment
4. Build: agent team configs + Connected App (if included) + Brain seed with their docs
5. Deploy on agreed hosting (or hand off ZIP for self-hosted)
6. 30-min onboarding call
7. Done — for hosted: they manage users from the Connected App admin; you maintain the server

---

## Revenue Projection — Year 1

| Stream | Target | Est. MRR |
|---|---|---|
| Paid Library listings (your own) | 15 sales/mo avg $59 | $885 |
| Third-party library fee (20%) | 10 external sales/mo avg $50 | $100 |
| B2B shared hosting | 4 clients avg $200/mo | $800 |
| B2B dedicated VPS | 2 clients avg $400/mo | $800 |
| B2B custom builds (one-time avg $800) | 2/mo | $1,600 (variable) |
| **Total** | | **~$4,185/mo** |

Conservative 6-month goal: $2,000/mo. Break-even on VPS costs from 2 shared-hosting clients.

---

## What Is NOT in the Model

- No app subscription or Pro tier — the app is always free
- No shared personal VPS (`app.agentplayground.net`) for clients — that stays yours only
- No Stripe automation until 3+ paying clients — manual payments first
- No chasing enterprise until simpler tiers are running

---

## Payment Processing

- **Argentina:** MercadoPago (schema stub already in app)
- **International:** Stripe (schema done, needs keys + webhook)
- **Library checkout:** Stripe → email license key → deeplink install into app
- **Creator payouts:** Stripe Connect (when there are third-party submissions)
- **Short-term B2B:** manual bank transfer or crypto until volume warrants automation
