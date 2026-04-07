# Services & Pricing — Agent Playground

## Service Catalog

---

### SERVICE 1 — VPS Setup & Managed Hosting

**What the client gets:**
- VPS provisioned on Hetzner (client pays Hetzner directly ~€9–19/mo)
- Full Agent Playground stack deployed (Dashboard, Ollama, n8n, Open WebUI, FileBrowser, Portainer)
- Custom domain + wildcard SSL (Let's Encrypt via Traefik)
- Admin account created, first agent team configured
- 1-hour onboarding call + walkthrough
- Ongoing: monthly updates, monitoring, backups, email support

**Tiers:**

| Tier | VPS Spec | Setup Fee | Monthly Retainer |
|---|---|---|---|
| Starter | 4 vCPU / 16 GB (Hetzner CX32) | $350 | $99/mo |
| Growth | 8 vCPU / 32 GB (Hetzner CX42) | $600 | $199/mo |
| Agency | 16 vCPU / 64 GB (Hetzner CX52) | $900 | $399/mo |

**Add-ons:**
- Extra agent team configuration: +$150/team
- Additional VPS (multi-tenant): +$200 setup per VPS
- Anthropic API pass-through: cost + 15% margin
- Custom Nginx site on same VPS: +$200

---

### SERVICE 2 — Website Development

**Static sites** (HTML/CSS, hosted on Nginx on client's VPS)
- Landing page (1 page): $400–600
- Multi-page marketing site (3–5 pages): $700–1,200
- Delivery: 5–10 business days

**Dynamic sites** (Next.js, custom backend, hosted separately or on VPS)
- Marketing site with CMS: $1,200–2,000
- SaaS landing page + waitlist: $1,500–2,500
- Full web application: custom quote ($3,000+)
- Delivery: 2–6 weeks depending on scope

**What's always included:**
- Mobile responsive
- Dark/light mode (matching brand)
- Contact form
- Basic SEO (meta tags, sitemap, robots.txt)
- Hosting setup (Nginx on VPS or Vercel/Netlify for static)
- 30 days of bug fixes post-launch

**Extras:**
- Custom CMS integration (Sanity, Contentful): +$400
- Blog setup: +$300
- E-commerce (Stripe checkout): +$800
- Analytics setup (Plausible or GA4): +$150

---

### SERVICE 3 — AI Automation & n8n Workflows

**Workflow builds** (n8n flows that automate a business process)

| Complexity | Price | Examples |
|---|---|---|
| Simple (1–3 nodes) | $300 | Send email when task completes, daily report |
| Medium (4–10 nodes) | $600–900 | CRM sync + AI summary + Slack notification |
| Complex (10+ nodes) | $1,200–2,000 | Full multi-step AI pipeline with agents |

**Agent team configuration**
- Configure a team of agents for a specific use case: $300–600
- Examples: customer support agent, content generation team, research team

**Ongoing workflow maintenance**
- Included in Growth/Agency retainer
- Starter clients: +$50/mo per active workflow

---

### SERVICE 4 — Consulting & Strategy (hourly)

- Discovery / audit call: $150/hr (first 30 min free with paid setup)
- AI automation strategy session: $200/hr
- Technical architecture review: $200/hr
- Custom agent prompt engineering: $150/hr

---

## Proposal Templates

### Quick Proposal (email format)

---
Hi [Name],

Based on our call, here's what I'd recommend:

**What I'll deliver:**
- [list 2–3 specific deliverables]

**Investment:**
- Setup: $[X] (one-time)
- Ongoing: $[X]/mo (includes [list what's included])
- VPS: ~$[X]/mo paid directly to Hetzner (you own it)

**Timeline:** [X days] from payment to live

**What I need from you:**
- Domain access (or I register one for you at cost)
- Your preferred email for the admin account
- 30 min for the onboarding call

To proceed: reply "let's do it" and I'll send the invoice.

[Your name]
---

### Full Proposal (document)

Sections:
1. Executive Summary (2 sentences: what you're getting and why)
2. Scope of Work (numbered deliverables)
3. What's NOT included (prevent scope creep)
4. Pricing (table with line items)
5. Timeline (start date → delivery milestones)
6. Terms (50% upfront, 50% on delivery; revisions policy)
7. Next steps

---

## Upsell Triggers

Watch for these signals that a client is ready to upgrade:

| Signal | Upsell |
|---|---|
| "Can we add another workflow?" | Upgrade to Growth retainer |
| "We're adding 2 more team members" | Discuss Agency tier or extra agent teams |
| "The responses are slow sometimes" | VPS upgrade (Natasha's sizing guide) |
| "We want a customer-facing chatbot" | New agent team + n8n webhook workflow |
| "Can our client see this?" | White-label setup (custom domain/branding) |
| "We need to store more files" | VPS storage upgrade |

---

## Discount Policy

- **Pilot clients (first 3):** 40% off setup fee, full price retainer (in exchange for testimonial)
- **Annual prepay:** 2 months free (10 months price for 12 months)
- **Referrals:** Referring client gets 1 month retainer credit per successful referral
- **Non-profit / solo freelancer:** 20% off at your discretion

Never discount the retainer for new clients — it sets the wrong expectation.
