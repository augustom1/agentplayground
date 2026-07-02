# Marketing Website — agentplayground.net

> **Note (2026-07-02):** Pricing and business-model details in this file are historical. The current model (open source core; custom playgrounds $350-500; full installations $1,000-1,500; managed hosting ~$100 / ~$180-200 / ~$250-300 per month; Playground Library) lives in `00-overview.md` and `03-services-pricing.md` - use those numbers. The AR site is now a lead-gen page: no listed prices, no MercadoPago checkout.

This file contains the full copy and structure for the sales/marketing website.
The site sells the done-for-you service. It is NOT the app — it's the front door.

Build it as a static site hosted on Nginx on your own VPS (fits in the stack you already have).
Or deploy to Vercel/Netlify for zero maintenance.

---

## Site Goal

Single goal: **get a discovery call booked** (or an email submitted).
Every section should move the visitor toward that one action.

---

## Tech Choice

**Option A — Static (simplest):** Plain HTML + Tailwind CDN + Alpine.js for interactivity.
Hosted at root `agentplayground.net` via Nginx.

**Option B — Next.js:** Full Next.js app in a subfolder or separate repo.
Can reuse existing design tokens from the dashboard.

Recommendation: Start with static. Ship fast, iterate copy.

---

## Page Structure & Copy

---

### SECTION 1 — Hero

**Headline:**
> Your Own AI Team. Running on Your Server.

**Subheadline:**
> Agent Playground is a complete AI automation stack — agents, workflows, scheduling, local LLMs —
> deployed on your infrastructure. We set it up, we manage it. You own everything.

**CTA (primary):** `Book a Free Demo →`
**CTA (secondary):** `See what's included ↓`

**Visual:** Screenshot/video of the dashboard — show the agent teams, chat interface, and n8n together.

**Trust bar below hero:**
- "Powered by Claude · Ollama · n8n · PostgreSQL · Docker"
- Logos or text badges

---

### SECTION 2 — The Problem (3 columns)

Header: **Why teams are moving away from SaaS AI**

| Column 1 | Column 2 | Column 3 |
|---|---|---|
| 💸 Unpredictable costs | 🔒 Your data on their servers | 🧩 Too many disconnected tools |
| API bills grow every month with no ceiling | ChatGPT, Notion AI, Zapier — none of them keep your data private | 6 subscriptions to do what one platform can do |

---

### SECTION 3 — The Solution (What You Get)

Header: **One deployment. Everything included.**

Feature grid (2×3):

| Feature | Description |
|---|---|
| AI Agent Dashboard | Create teams of Claude-powered agents. Assign tasks, track progress, chat in real time. |
| Local LLMs Included | Qwen2.5 models run on your server. Routine tasks cost you nothing per query. |
| n8n Workflow Automation | Connect your tools visually. 350+ integrations. Trigger agents from any event. |
| Scheduling & Recurring Tasks | Run agents on a cron. Daily reports, weekly summaries, monthly audits — automated. |
| Full Data Ownership | Nothing leaves your server. GDPR-friendly by design. You control the hardware. |
| We Manage Everything | Updates, backups, SSL, monitoring. You focus on your work, not your infra. |

---

### SECTION 4 — How It Works (3 steps)

Header: **Up and running in one day**

1. **Tell us what you need**
   Book a 30-min call. We scope your use case and recommend the right server tier.

2. **We deploy your stack**
   We provision the VPS, configure your domain, set up SSL, and build your first agent team.
   Same-day delivery for standard setups.

3. **You use it. We maintain it.**
   Flat monthly fee. No surprises. You message us when something breaks; usually we've already fixed it.

---

### SECTION 5 — Pricing

Header: **Simple, flat pricing. You pay the VPS directly.**

Table:

| | Starter | Growth | Agency |
|---|---|---|---|
| Setup fee | $350 | $600 | $900 |
| Monthly | $99 | $199 | $399 |
| VPS (paid to Hetzner) | ~$9/mo | ~$19/mo | ~$38/mo |
| Agent teams | Unlimited | Unlimited | Unlimited |
| n8n workflows | — | ✓ | ✓ |
| Custom domain + SSL | ✓ | ✓ | ✓ |
| Monitoring + backups | ✓ | ✓ | ✓ |
| Monthly strategy call | — | — | ✓ |
| Support | Email | Email + chat | Priority |

**CTA below table:** `Start with Starter — Book a call →`

Fine print: "No long-term contracts. Cancel anytime. VPS cost goes to Hetzner, not us — you own the server."

---

### SECTION 6 — Use Cases (tabbed or cards)

Header: **Built for teams that run on automation**

Tabs:
- **Marketing Agencies** — Content generation, competitor research, client reporting
- **Consultants** — Document analysis (local LLM, stays private), proposal drafting, research
- **Developers** — Manage client projects, run CI/CD agents, code review automation
- **Operations Teams** — Daily briefings, data pipeline alerts, workflow orchestration

Each tab shows: 3 specific automations they could run, with a screenshot if possible.

---

### SECTION 7 — Comparison Table

Header: **Why not just use [SaaS tool]?**

| | SaaS AI Tools | Agent Playground |
|---|---|---|
| Data stays on your server | ✗ | ✓ |
| Predictable monthly cost | ✗ Per seat/query | ✓ Flat fee |
| Works offline / local LLM | ✗ | ✓ |
| Automate multi-step workflows | Limited | ✓ Full n8n |
| You own the infrastructure | ✗ | ✓ |
| Customizable agents | Limited | ✓ Unlimited |
| No vendor lock-in | ✗ | ✓ |

---

### SECTION 8 — FAQ

**Q: Do I need to know how to code?**
No. We handle everything technical. You just need to tell us what you want to automate.

**Q: What if I want to cancel?**
Cancel anytime. Your VPS and all data stay with you — it doesn't disappear.

**Q: What's the difference between Claude and the local models?**
Claude (Anthropic) is the most capable model for complex tasks. Local models (qwen2.5) run on your server at zero per-query cost and are great for routine automations. You can use both.

**Q: Can I have multiple clients/users on one deployment?**
Yes. The platform supports multiple user accounts and permission levels (admin, user, viewer).

**Q: What happens if the VPS goes down?**
We get alerted and fix it. For critical uptime, we recommend the Growth plan which includes active monitoring.

**Q: Can I use my own domain?**
Yes, that's standard. You get `app.yourdomain.com`, `n8n.yourdomain.com`, etc. — all on your domain.

---

### SECTION 9 — CTA (Final)

Header: **Ready to own your AI stack?**
Subheader: **Book a free 30-minute demo. We'll show you what it looks like for your specific use case.**

Button: `Book Your Free Demo →`
Secondary text: "No commitment. No sales pressure. Just a demo."

Contact form fields: Name · Email · "What do you want to automate?" (textarea)

---

## Meta / SEO

- Title: `Agent Playground — Self-Hosted AI Automation, Done For You`
- Description: `Deploy a full AI agent stack on your own server. Claude-powered agents, local LLMs, n8n workflows, and more — managed for you from $99/month.`
- Keywords: self-hosted AI, AI automation service, Claude agents, n8n managed hosting, AI VPS setup
- OG image: dashboard screenshot with tagline overlay

---

## Design Notes

- Match the dashboard's dark theme for brand cohesion
- Primary CTA color: indigo (#6366f1)
- Font: Inter or system-ui (fast loading)
- No stock photos — use real screenshots of the actual dashboard
- Keep it dense and technical — your buyers are technical people who will smell fluff immediately
