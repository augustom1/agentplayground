# Future Roadmap — Agent Playground

Organized by time horizon. Each item includes what it is, why it matters, and what it needs to build.

---

## Now (Month 1–2) — Ship & Validate

These are must-haves before taking on paying clients.

### Marketing Site — agentplayground.net
- **Why:** No way to sell without a front door
- **Needs:** Static HTML or Next.js page, copy from `05-website-sales.md`, deployed to Nginx on VPS
- **Owner:** Dev Core (Sofia) + Business (Max)

### App Showcase Page — pre-login landing on app.agentplayground.net
- **Why:** Demo without giving away admin access; converts curious visitors
- **Needs:** Modify `app/page.tsx` to show showcase if not logged in; screenshots/GIFs of dashboard
- **Owner:** Dev Core (Sofia, Marcus)

### Seed Teams on First Deploy
- **Why:** Clients shouldn't open a blank dashboard
- **Needs:** `npm run seed:teams` documented in onboarding; or trigger from `/setup` after admin creation
- **Owner:** Dev Core (Elena, Marcus)

### Demo Environment
- **Why:** Let prospects explore before committing
- **Needs:** Read-only demo account at `demo.agentplayground.net` with pre-seeded fake data
- **Owner:** DevOps (Viktor)

### Booking / Contact Integration
- **Why:** The sales site CTA needs somewhere to go
- **Needs:** Cal.com or Calendly embed (free), or simple contact form that emails you
- **Owner:** 1 hour of work

---

## Soon (Month 2–4) — Polish & Grow

### pgvector Knowledge Base
- **Why:** Agents that can search through a client's documents/data would be a major value-add
- **What:** Embed text from tasks, agent prompts, and uploaded documents into the Embedding model; expose a "search knowledge base" tool in chat
- **Needs:** Embedding API (Anthropic or local), vector similarity query in db-agent.ts
- **Owner:** Dev Core (Elena, Marcus)
- **Complexity:** Medium (2–3 days)

### Real-Time Agent Status (SSE or Polling Upgrade)
- **Why:** Currently requires manual refresh; makes the dashboard feel static
- **What:** Server-Sent Events endpoint for live task/agent status updates
- **Needs:** New SSE API route, useEffect with EventSource in dashboard components
- **Owner:** Dev Core (Marcus, Sofia)
- **Complexity:** Medium (1–2 days)

### n8n ↔ Dashboard Deep Integration
- **Why:** n8n is already deployed but isn't wired to the dashboard; huge automation potential
- **What:** Dashboard API key system so n8n workflows can trigger agent tasks, read team status, create scheduled jobs
- **Needs:** API key model in schema, new auth strategy for machine-to-machine calls
- **Owner:** Dev Core (Alex, Marcus), DevOps (Viktor)
- **Complexity:** Medium (3–4 days)

### Email Notifications
- **Why:** Clients want to know when a recurring task completes or fails
- **What:** Send email on task completion/failure, weekly summary
- **Needs:** Email provider (Postmark or Resend), new notification settings in User model, email templates
- **Owner:** Dev Core (Marcus)
- **Complexity:** Medium (1–2 days)

### Mobile-Responsive Dashboard
- **Why:** Current UI is desktop-first; clients will check status on phones
- **What:** Responsive sidebar (collapses to bottom nav), card layouts stack on mobile
- **Owner:** Dev Core (Sofia), Product (Aria)
- **Complexity:** Low–Medium (1 day)

### Client Portal Mode (Viewer Role)
- **Why:** Clients want to show their own clients what's running without giving full dashboard access
- **What:** "viewer" role that only sees task status, schedules, and a read-only chat log
- **Needs:** Role gate on API routes + simplified UI for viewer role
- **Owner:** Dev Core (Marcus, Sofia), Product (James)
- **Complexity:** Medium (2 days)

---

## Later (Month 4–6) — Scale

### Multi-Tenant SaaS Mode
- **Why:** Currently single-tenant per deployment; enabling multiple isolated tenants on one VPS would let you serve more clients per server
- **What:** Add `tenantId` to all models; row-level security; per-tenant auth
- **Needs:** Major schema change, full test suite update, new billing concept
- **Owner:** Dev Core (all), DevOps (Viktor, Chen)
- **Complexity:** High (2–3 weeks)
- **Revenue impact:** 3× the clients per server = 3× the margin

### Billing & Subscriptions
- **Why:** Manual invoicing doesn't scale past 10 clients
- **What:** Stripe integration — subscription plans tied to User.plan, automated invoicing
- **Needs:** Stripe SDK, webhook handler, plan enforcement middleware
- **Owner:** Dev Core (Marcus), Business (Diana)
- **Complexity:** Medium–High (1 week)

### Agent Marketplace / Registry
- **Why:** Clients want to import pre-built agent teams for their industry
- **What:** Public registry of agent team configs; one-click import via existing import-team API
- **Needs:** Registry website or GitHub repo, version pinning, import-team UI improvements
- **Owner:** Dev Core (Alex), Business (Max)
- **Complexity:** Medium (1 week for basic version)

### Redis Task Queue
- **Why:** Long-running agent tasks block the API; a queue would make the platform more reliable
- **What:** Use existing Redis container for a job queue (Bull or BullMQ); task execution off the main thread
- **Needs:** Queue worker process, task status polling, BullMQ dependency
- **Owner:** Dev Core (Marcus, Alex)
- **Complexity:** High (1 week)

### GPU Support / VPS Tier Upgrade
- **Why:** Inference on CPU with qwen2.5:7b is 15–60 sec/response; GPU cuts this to 1–3 sec
- **What:** Document + test GPU VPS setup (Hetzner GPU CCX, Lambda Labs, Vast.ai)
- **Needs:** Uncomment GPU deploy block in docker-compose.yml, test on NVIDIA VPS
- **Owner:** DevOps (Viktor, Natasha)
- **Complexity:** Low (config change + testing)
- **Revenue impact:** Enables premium "fast AI" tier at higher price

### White-Label / Custom Branding
- **Why:** Agencies want to resell the platform under their own brand
- **What:** Config-driven branding: logo, colors, app name, domain — no code changes needed per client
- **Needs:** `NEXT_PUBLIC_APP_NAME`, `NEXT_PUBLIC_LOGO_URL` env vars; theme config in globals.css
- **Owner:** Dev Core (Sofia), Product (James)
- **Complexity:** Low–Medium (2 days)

---

## 12-Month Vision

| Milestone | Target Date | Revenue Impact |
|---|---|---|
| 3 paying clients | Month 2 | $1,500+ MRR |
| Marketing site live | Month 1 | Enables inbound |
| pgvector knowledge base | Month 3 | Major upsell feature |
| n8n deep integration | Month 3 | Stickiness |
| 10 paying clients | Month 6 | $3,000+ MRR |
| Multi-tenant mode | Month 6 | 3× margin per server |
| Billing/Stripe | Month 5 | Removes manual invoicing |
| 20 paying clients | Month 12 | $8,000+ MRR |
| Agent marketplace | Month 9 | New acquisition channel |

---

## What to Build Next (Decision Framework)

When deciding what to work on, ask:
1. **Does it help close the next client?** → Build now
2. **Does it reduce time-per-client?** → Build soon
3. **Does it increase what you can charge?** → Build soon
4. **Does it scale the business past 10 clients?** → Build later
5. **Is it technically interesting but revenue-neutral?** → Deprioritize
