# Pitch Deck — Agent Playground

Use this as the narrative for a 10-minute pitch to a potential client, investor, or partner.
Each section = one slide or one talking point.

---

## Slide 1 — Title

**Agent Playground**
*Your own AI team. Running on your own server.*

Tagline options:
- "Full-stack AI automation. Self-hosted. Done for you."
- "Claude-powered agents on your infrastructure, managed by us."
- "The AI operations platform your team actually owns."

---

## Slide 2 — The Problem (make them feel it)

> "You're spending $500/month on AI APIs and still doing the repetitive work manually.
> Your data is on someone else's server. And when OpenAI changes its pricing again,
> you find out the hard way."

Three pain points:
1. **AI costs scale with usage** — no ceiling, no ownership
2. **Data privacy** — your client data goes through ChatGPT's servers
3. **Tool fragmentation** — Zapier + ChatGPT + Notion + 6 other apps = chaos

---

## Slide 3 — The Solution

**Agent Playground** is a complete AI automation stack deployed on a VPS you control.

What's included:
- AI Agent Dashboard — manage teams of Claude-powered agents
- Local LLMs (Llama, Qwen) — runs on your server, zero per-query cost
- n8n — connect anything with visual workflows
- Chat UI — talk to your agents with tool access to your data
- Scheduler — run agents on a cron, daily/weekly/monthly
- File manager, Docker manager, and more — all accessible from one URL

One deployment. One domain. Your data, your server.

---

## Slide 4 — How It Works (3 steps)

1. **We provision a VPS** (~$9–19/mo from Hetzner, you pay directly — no markup)
2. **We deploy the full stack** (domain, SSL, agents, workflows — typically same day)
3. **You use it** — we manage updates, backups, and support for a flat monthly fee

That's it. No DevOps knowledge required on your end.

---

## Slide 5 — Demo (live or screenshots)

Show:
- Dashboard with agent teams and status
- Chat interface — ask it to create a task, it does it live
- Schedule view — recurring agent jobs
- n8n running a workflow triggered by an agent
- Open WebUI — chat directly with local LLM

Key moment: show a local LLM (qwen2.5) answering a question with **zero API cost**.

---

## Slide 6 — Pricing

| Tier | One-time setup | Monthly |
|---|---|---|
| Starter | $350 | $99/mo |
| Growth | $600 | $199/mo |
| Agency | $900 | $399/mo |

"Your VPS costs you $9–19/mo paid directly to Hetzner. That's the only variable cost.
Our fee covers setup, maintenance, updates, monitoring, and support."

Compared to: $50/user/mo SaaS tools × 5 users = $250/mo, **with none of the ownership.**

---

## Slide 7 — What You Can Automate (use cases)

Tailor this slide to the specific prospect. Examples:

**For a marketing agency:**
- Auto-generate weekly client reports from analytics data
- Run AI content brief generation every Monday
- Summarize competitor research with web browsing agents

**For a law firm:**
- Summarize contracts with a local LLM (data never leaves your server)
- Schedule intake follow-ups via n8n + email integration
- Build a knowledge base from case files using vector search

**For a developer/freelancer:**
- Manage client projects across agent teams
- Auto-trigger deployments from chat commands
- Run recurring QA checks with scheduled agents

---

## Slide 8 — Why Self-Hosted Wins

| | SaaS AI Tools | Agent Playground |
|---|---|---|
| Data ownership | ✗ Their servers | ✓ Your server |
| Cost at scale | ✗ Grows per seat | ✓ Fixed VPS cost |
| Customization | ✗ Limited | ✓ Unlimited |
| Vendor lock-in | ✗ Yes | ✓ None |
| Privacy compliance | ✗ Hard | ✓ Easy (GDPR-friendly) |
| Internet required | ✗ Yes | ✓ No (local LLMs) |

---

## Slide 9 — About the Builder

- Built on proven open-source stack (Next.js, PostgreSQL, Docker, n8n, Ollama)
- Already running in production
- Full team of AI agents configured to manage its own development
- One-command deployment: `bash setup.sh`

"This is not a prototype. It's running today."

---

## Slide 10 — Call to Action

**Option A — Discovery call**
"Book a 30-minute call. I'll show you a live demo and tell you what this looks like for your specific workflow."
→ Link to Cal.com / Calendly

**Option B — Pilot offer**
"I'm taking 3 clients at a reduced setup rate ($199 instead of $350) in exchange for a testimonial and feedback."
→ Direct to contact form or email

**Option C — Self-serve**
"Want to explore it yourself first? The documentation is at [link]."

---

## Objection Handling

| Objection | Response |
|---|---|
| "We're not technical" | You don't need to be. We manage everything. You just use the dashboard. |
| "What if you disappear?" | The stack is open-source and well-documented. You can take over or hire anyone. |
| "We already use ChatGPT" | ChatGPT doesn't automate workflows, schedule tasks, or keep data private. This does all three. |
| "Is it secure?" | More secure than SaaS — your data never leaves your server. SSH keys, encrypted volumes. |
| "What's the ongoing cost?" | VPS: $9–19/mo (you pay Hetzner). Our fee: $99–399/mo flat. No usage surprises. |
| "Can we add more agents?" | Unlimited. The platform supports as many teams and agents as you want. |
