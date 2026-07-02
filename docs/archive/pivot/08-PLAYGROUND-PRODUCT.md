# Playground as a B2B Product

> Created: 2026-06-25  
> This is the service layer of AgentPlayground — building and deploying Playgrounds for business clients.

---

## The Core Idea

A Playground for a business client is a purpose-built AI workspace deployed on their behalf. Their employees open a URL and see a dashboard showing agents working for them, a task board, a chat interface, and an admin panel — none of the coordinator complexity of the main app.

The product is NOT necessarily called "AgentPlayground." The client can brand it however they want. You use AgentPlayground as the infrastructure; the client sees their product.

---

## What the Client's Employees See

The Playground interface is a separate route group (`app/(playground)/`) with a scoped, non-technical UI:

### Dashboard
- **Agent roster** — cards per agent: name, role, current status (idle / working / waiting)
- **Task board** — Scheduled / In Progress / Completed columns with counts + recent items
- **Skills summary** — "14 skills available" with category breakdown
- **Activity feed** — live SSE stream of agent completions and notifications

### Chat
- Simplified chat (no coordinator sidebar)
- Picks which agent team to talk to from a dropdown
- Files can be uploaded (indexed into the Playground's Brain)
- Non-technical — just a message box

### Admin Panel (client's manager role only)
- **Users** — invite employees, assign roles (viewer / member / admin)
- **Agents** — edit names, roles, system prompts (scoped to this Playground)
- **Knowledge Base** — upload company documents, see what's indexed
- **Tasks** — create scheduled recurring tasks, assign to teams
- **Appearance** — Playground name, logo, accent color
- **Notifications** — Telegram, email digests

---

## Architecture

The Playground interface lives in the same codebase as the main app. Middleware gates users to the right interface based on role:

```
User logs in →
  role === "admin" | "owner"        → main coordinator UI
  role === "playground_admin"       → Playground admin panel
  role === "playground_member"      → Playground dashboard + chat
  role === "playground_viewer"      → Playground dashboard (read-only)
```

### New Route Group
```
app/(playground)/
  layout.tsx            ← Scoped layout, no coordinator sidebar
  dashboard/page.tsx    ← Agent roster + task board + activity feed
  chat/page.tsx         ← Scoped chat
  admin/
    users/page.tsx
    agents/page.tsx
    knowledge/page.tsx
    tasks/page.tsx
    appearance/page.tsx
  profile/page.tsx
```

### Schema
```prisma
model PlaygroundConfig {
  id          String   @id @default(cuid())
  name        String                        // "Acme Corp Hub"
  slug        String   @unique             // "acme-corp"
  template    String                        // "business-ops" | "marketing" | "legal" | etc.
  logoUrl     String?
  accentColor String   @default("#D4715A")
  teamIds     String[]                      // which teams are exposed here
  createdAt   DateTime @default(now())
}
```

---

## Hosting Options

### Shared Hosting ($150–250/mo + $299 setup)
- Multiple clients on one Hetzner VPS (CX31 or CX41)
- Each client's Playground is at `clientname.agentplayground.net` or their subdomain
- Data is isolated per Playground config (separate team sets, separate Brain docs)
- Best for: small teams (2–10 users), light workloads, clients on a budget
- 4-6 clients per VPS keeps costs manageable

### Dedicated VPS ($299–499/mo + $499 setup)
- Their own Hetzner VPS (you manage)
- Full data isolation: their server, their data only
- Background agents 24/7
- Best for: medium teams (10–50 users), privacy-sensitive industries (legal, HR, finance)

### Self-Hosted ($499–999 setup, optional $99/mo support retainer)
- Client brings their own server (AWS, Azure, on-prem, whatever)
- You configure, deploy, and hand it off
- They manage it after that (or pay the retainer for you to help)
- Best for: enterprises with existing IT team, compliance requirements

---

## White-Label

Clients can fully brand their Playground:
- Their company name + logo in the interface
- Their own domain (`ai.acmecorp.com` or `acme.agentplayground.net`)
- Their accent color
- AgentPlayground branding does NOT appear in the Playground UI (only on the marketplace site and the download app)

The infrastructure is invisible. The client gets the credit with their employees.

---

## Templates

Each Playground is provisioned from a template — same format as marketplace Playgrounds (see `06-ADDONS.md`). The difference is that B2B templates are customized per client, not generic.

Built-in starting templates:

| Template | Agents | Typical client |
|---|---|---|
| Business Operations | Process Analyst, Doc Keeper, Report Writer | Office managers, operations teams |
| Marketing | Content Writer, SEO Researcher, Social Scheduler | Marketing teams, agencies |
| Legal | Legal Researcher, Contract Reviewer, Case Analyst | Law firms, legal departments |
| Sales | Prospect Finder, Email Writer, Follow-up Manager | Sales teams |
| HR | Job Post Writer, CV Screener, Policy Advisor | HR departments |
| Education | Course Advisor, Q&A Agent, Progress Tracker | Schools, training programs |
| Custom | Blank — built from discovery call | Any vertical not covered above |

---

## Delivery Workflow

1. Client contacts you via `/contact` on agentplayground.net or directly
2. 30-min discovery call — what do they need, how many users, data privacy requirements
3. You confirm fit + pricing, take first payment
4. Provision:
   - For shared: set up their subdomain + config on existing shared VPS
   - For dedicated: spin up new Hetzner VPS, clone app, configure domain
   - For self-hosted: deploy to their server
5. Seed their Playground:
   - Apply the relevant template
   - Upload their existing documents to the Brain (up to 20 docs in setup)
   - Create their admin account
   - Customize appearance (name, logo, color)
6. Send client: URL + admin credentials
7. 30-min onboarding call — walk their admin through inviting users and the dashboard
8. Done — they onboard their team themselves

Target time from payment to live: 2-3 hours for shared, 4-5 hours for dedicated, 6-8 hours for self-hosted.

---

## Phase 4 Build Plan (after Phase 2 public release)

Do not start until the base app is publicly downloadable.

### Session P1 — Playground Route Group (3-4 hrs)
- `app/(playground)/` layout
- Dashboard: agent cards, task board, activity feed (SSE)
- Middleware role gating

### Session P2 — Chat + Admin (3-4 hrs)
- Scoped chat page
- Admin: user management, agent config, knowledge upload, appearance
- `PlaygroundConfig` model + API routes

### Session P3 — Templates + Provisioning (2-3 hrs)
- Template seeder (reads from installed Playground or `PLAYGROUND_TEMPLATE` env var)
- Provisioning script for new client setup
- First working end-to-end with Business Operations template

### Session P4 — Polish + First Client (2-3 hrs)
- First-login flow for Playground users
- White-label: logo + color + name from admin panel
- End-to-end test: spin up shared hosting, invite test users, run a task through the dashboard
