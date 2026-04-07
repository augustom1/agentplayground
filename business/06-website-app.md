# App Showcase Website — app.agentplayground.net

This file covers the showcase/landing page for the Agent Playground app itself —
distinct from the sales site at `agentplayground.net`.

The app showcase answers: "What IS this product?" for people who want to explore it,
self-host it, or contribute to it. Think: product page + live demo + GitHub README all in one.

---

## Purpose

Two audiences:
1. **Potential self-hosters** — developers who want to run it themselves
2. **Potential clients** — people evaluating before booking a call

For audience 1: give them the GitHub link and clear setup docs.
For audience 2: point them to `agentplayground.net` to book a call.

---

## Where to Host This Page

**Option A:** `app.agentplayground.net` serves a showcase page BEFORE login.
If not logged in → show the showcase. If logged in → redirect to dashboard.
Implement this in `app/page.tsx` or `middleware.ts`.

**Option B:** Separate subdomain like `about.agentplayground.net` or `product.agentplayground.net`.
Keep `app.agentplayground.net` purely as the dashboard (current behavior).

Recommendation: Option A — one URL, smart routing. The page becomes a demo+product page.

---

## Showcase Page Structure & Copy

---

### HERO

**Headline:**
> Agent Playground
> *The AI operations platform you actually own.*

**Subheadline:**
> Create teams of AI agents. Schedule tasks. Automate workflows.
> Run local LLMs. All on your own server — no SaaS fees, no data leaks.

**CTAs:**
- `Try the Live Demo →` (opens a read-only demo login or a sandbox)
- `Self-Host in 5 Minutes →` (jumps to quick start section)
- `Get It Set Up For Me →` (links to `agentplayground.net`)

**Hero visual:** Animated GIF or video of the dashboard — agent teams, chat with tool use, schedule view, streaming response.

---

### FEATURES — What It Does

**Header:** Everything you need to run AI agents in production.

Feature list (with icons):

**Agent Teams**
Create groups of Claude or Ollama-powered agents, each with a custom role, model, and system prompt. Assign tasks, track status, monitor activity.

**Claude Tool-Use Chat**
Chat with your agent coordinator — it can create teams, schedule tasks, browse the web, and query your database live, all in the conversation.

**Local LLMs via Ollama**
Run qwen2.5:3b and qwen2.5:7b on your own hardware. Routine tasks cost nothing per query. No internet required.

**n8n Workflow Integration**
Connect any external tool with n8n's 350+ integrations. Trigger agents from webhooks, Slack, email, cron, or any event.

**Task Scheduler**
Schedule one-off or recurring agent jobs (daily/weekly/monthly). Full calendar view. Cron-based execution.

**Agent Lab / Playground**
Test agent prompts interactively before deploying them to production. See exactly what the agent says and why.

**User Management**
Multi-user with role-based access: admin, user, viewer. Manage your team's access from one place.

**Import / Export Teams**
Package an agent team as a JSON config. Share it, back it up, or deploy it to another VPS instantly.

---

### TECH STACK SECTION

**Header:** Built on a proven open-source foundation.

Stack badges / logos:
- Next.js 15 — App Router, React 19, TypeScript
- PostgreSQL 16 + pgvector — relational data + vector embeddings ready
- Prisma 7 — type-safe ORM with migration support
- NextAuth v5 — JWT-based authentication
- Tailwind CSS v4 — dark-first design system
- Docker + Compose — one-command deployment
- Ollama — local LLM runtime (qwen2.5:3b / 7b out of the box)
- n8n — workflow automation
- Traefik — automatic HTTPS

**"Why self-hosted?"** mini section:
- Your data never leaves your server
- No per-seat or per-message fees
- Modify anything — it's your codebase
- GDPR-compliant by default

---

### QUICK START (for self-hosters)

**Header:** Deploy in under 10 minutes.

```bash
# 1. Clone the repo
git clone https://github.com/[YOUR_REPO].git && cd [REPO]

# 2. Run the one-command bootstrap (Ubuntu/Debian)
bash setup.sh

# 3. Open your dashboard
open https://app.yourdomain.com
```

What `setup.sh` does:
- Installs Docker
- Writes your `.env.local` (prompts for domain, passwords, optional API keys)
- Starts all services (dashboard, postgres, redis, ollama, n8n, and more)
- Downloads local LLM models automatically in the background
- Sets up Nginx + Traefik for HTTPS

Requirements:
- Ubuntu 22.04 LTS VPS (16 GB RAM minimum recommended)
- A domain with DNS access
- Optional: Anthropic API key for Claude models

---

### DEMO SECTION

**Header:** See it in action.

Options:
1. **Embedded video** — 3-min Loom/YouTube walkthrough of core features
2. **GIF carousel** — animated screenshots of: dashboard → chat → schedule → agent lab
3. **Live sandbox** — read-only demo at `demo.agentplayground.net` with pre-seeded data

Recommended captions for screenshots:
- "Chat with your agents — they read and write your database live"
- "Schedule recurring tasks — daily, weekly, or custom cron"
- "Agent Lab — test prompts before deploying them"
- "Switch between Claude, Ollama, or GPT-4 in one click"

---

### SYSTEM REQUIREMENTS SECTION

**For the self-hoster / evaluator:**

| | Minimum | Recommended |
|---|---|---|
| RAM | 8 GB | 16–32 GB |
| CPU | 2 vCPU | 4–8 vCPU |
| Storage | 40 GB | 160 GB |
| OS | Ubuntu 22.04 | Ubuntu 22.04 |
| Internet | Required for setup | Optional after (local LLMs) |

Estimated VPS cost: ~€9–19/month on Hetzner.

---

### WHAT'S INCLUDED IN A DEPLOYMENT

Visual checklist or table:

| Service | URL | Purpose |
|---|---|---|
| Agent Dashboard | app.yourdomain.com | This app |
| n8n Automation | n8n.yourdomain.com | Workflow builder |
| Open WebUI | ai.yourdomain.com | Chat UI for local LLMs |
| FileBrowser | files.yourdomain.com | File manager |
| Portainer | manage.yourdomain.com | Docker management |
| Your Website | yourdomain.com | Static Nginx site |

---

### CTA — Two Paths

**For developers:**
`View on GitHub →` | `Read the Docs →`

**For everyone else:**
`Get it set up for me — from $99/mo →` (links to agentplayground.net)

---

## Implementation Notes

If building this as the pre-login view of `app.agentplayground.net`:

In `app/page.tsx`:
```tsx
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import ShowcasePage from "@/components/ShowcasePage";

export default async function RootPage() {
  const session = await auth();
  if (session) redirect("/dashboard");
  return <ShowcasePage />;
}
```

The current `app/page.tsx` already redirects to `/dashboard` — just add the session check first and render the showcase if no session.
