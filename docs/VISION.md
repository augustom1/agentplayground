# AGENT PLAYGROUND — Vision, Roadmap & Immediate Fixes

> **Purpose of this file:** Single source of truth for Claude Code sessions. Read this before making changes. It covers (1) what Agent Playground is and where it's going, (2) the UI restoration that must happen FIRST, (3) repo cleanup, and (4) the technical roadmap. When in doubt, this document wins over assumptions.

---

## 0. HARD CONSTRAINTS (never violate)

- **No Zod.** Validation uses **Valibot** only.
- **Prisma 7** with `@prisma/adapter-pg`. Do not downgrade or swap the adapter.
- **Never break the Docker build.** Every change must leave `docker compose up` working. If a change is risky, verify the build before finishing.
- **No emojis anywhere in the UI.**
- Deployment stack is **Docker Compose + Traefik** on a Hetzner VPS. Keep everything compatible with that.
- LLM routing: local **Ollama** models + **Claude API**. Do not hardcode a single provider.

---

## 1. WHAT AGENT PLAYGROUND IS

Agent Playground is a **self-hosted AI operations platform**. A user deploys it on their own VPS and gets a system of AI agent teams, coordinated by a central orchestrator (the **Playground Keeper**), that can do real work on real infrastructure — not a chatbot that suggests things, but agents that execute.

**Core thesis:** the platform IS the VPS. Agents should be able to operate their own infrastructure — create n8n workflows, deploy their own Telegram bots, spin up services, manage their files and documents — **without a human developer in the loop**, except for a small set of protected actions (payments, private keys, destructive operations).

**Design philosophy:** token spend is acceptable and expected; wasted spend and invisible spend are not. The system should be excellent when used intensively. Budget visibility and automatic kill-switches matter more than frugality.

### Business model (context, not current implementation work)

- **Open source core** → adoption, content (video miniseries), credibility.
- **Paid services:** custom playgrounds (~$350–500), full framework installations with a custom playground (~$1,000–1,500 one-off).
- **Recurring:** managed hosting tiers (~$100/mo basic, ~$180–200/mo with playground library access, ~$250–300/mo dedicated infrastructure).
- **Playground Library:** a catalog of ready-made playgrounds (personal and business) that subscribed clients can browse, try, and deploy to their own installation. Every custom client project should, where possible, produce a generic, anonymized template for the library.
- Multi-tenant hosting: multiple client stacks on one powerful server, isolated via per-client Docker Compose stacks, resource caps, separate Docker networks, Traefik routing per domain. **Architecture should be multi-tenant-aware from the start**, not retrofitted.

Implication for code: features built for internal use (scheduling, publishing pipelines, budget dashboards, template deployment) should be **generic platform features**, never one-off scripts. If code only serves one demo, it's scope creep.

---

## 2. IMMEDIATE PRIORITY #1 — UI RESTORATION

**Context:** A recent session replaced a UI the owner liked (clean, similar in feel to Claude Desktop) with one he strongly dislikes, including an unwanted logo redesign. The last attempt to revert produced an error. This must be fixed before any other feature work.

### 2.1 Layout: exactly FOUR top-level sections

The entire app is organized into four sections. These four must cover everything; do not add a fifth top-level section without explicit owner approval.

1. **Chats**
   - Recent conversations list.
   - User can choose who to chat with: the **Playground Keeper (coordinator)** or the **heads of the agent teams**.
   - Nothing else lives here.

2. **Playgrounds**
   - A view showing the different playgrounds and **nothing else**.
   - Click a playground to enter it.
   - No extra panels, stats, or clutter on this screen.

3. **Teams**
   - The agent teams the user has.
   - Team-related features live here: **skills**, the optimizer, and other agent/team configuration.
   - This is the home for "how agents are set up," as opposed to "talking to them" (Chats).

4. **Brain**
   - Everything related to the RAG brain and saved documents.
   - Browse files, manage notes and plans.
   - **Grant/revoke agent access to specific docs** here.
   - Future home of the Obsidian vault integration (persistent memory layer).

### 2.2 Visual design rules

- **Reference feel: Claude Desktop.** Clean, minimal, generous whitespace, calm. "Like that, with less stuff" — when choosing between adding and removing an element, remove.
- **Fix centering.** The current layout is off-center; content must be properly centered/aligned.
- **Revert the new color scheme.** Return to the previous palette (neutral, Claude-Desktop-adjacent tones). If the old palette can be recovered from git history, recover it; otherwise rebuild in that spirit: warm neutrals, low saturation, high readability.
- **Logo:** terminal-style is fine and liked. But it must be **original** — do not imitate Anthropic's/Claude's logo or any other existing logo. Simple, monospace/terminal aesthetic, distinct silhouette.
- No emojis. No decorative icon noise. Density low.

### 2.3 How to execute the restoration

1. **Check git history first.** The liked UI existed before the recent redesign. Prefer `git log` / `git diff` to identify and recover the previous components, styles, and layout rather than rebuilding from scratch.
2. If recovery is partial, rebuild the missing pieces following 2.1 and 2.2.
3. Migrate any *functionality* added in the disliked redesign (if any is worth keeping) into the four-section structure — but never at the cost of the layout rules above.
4. Verify the Docker build and do a visual pass on all four sections before considering this done.

---

## 3. IMMEDIATE PRIORITY #2 — REPO CLEANUP

The project folder has accumulated clutter. Clean it up **without breaking anything**:

- Inventory the root directory. Identify: stale spec `.md` files, one-off scripts, duplicated configs, unused assets, dead code, abandoned experiments.
- Create a clear structure, e.g.:
  - `/docs` — specs, plans, this file, HANDOFF.md, architecture notes.
  - `/docs/archive` — outdated specs kept for history (move, don't delete, unless clearly junk).
  - `/scripts` — operational scripts that are actually used.
  - Source, infra (`docker-compose.yml`, Traefik config), and app code clearly separated.
- Update `CLAUDE.md` to reflect the new structure so future sessions navigate correctly.
- Do **not** delete anything related to: Prisma schema/migrations, Docker/Traefik config, environment examples, or anything referenced by the build. When unsure whether something is used, search for references before moving it.
- Finish with a working `docker compose` build.

---

## 4. ARCHITECTURE ROADMAP — AGENTS OPERATING THEIR OWN INFRASTRUCTURE

This is the medium-term build direction, in order. Each stage must be independently usable and demonstrable.

### 4.1 Principle: capabilities, not shell access

Agents never get raw root/shell on the VPS. They get **well-defined tools via the MCP server**. Every new thing agents should be able to do = a new MCP tool, with explicit scope. If an agent needs something it can't do, that's the signal for which tool to build next.

### 4.2 Permission rings

All agent-invocable tools are classified into three rings. The ring lives in the **tool layer (MCP)**, not in prompts — prompts can be injection-attacked; tool scopes cannot.

- **GREEN — fully autonomous:** create/modify n8n workflows via the n8n API; deploy/restart their own containers; create Telegram bots using tokens already provisioned to the system; write to their own volumes; install dependencies inside their own containers. ~95% of daily operations.
- **YELLOW — autonomous with audit + limits:** Traefik config changes (new subdomains), creating new databases, spend within a pre-approved budget. Executes automatically, but every action is written to an **audit log** the Keeper can summarize for the owner.
- **RED — human approval required:** payments, private keys, destructive deletion (dropping DBs, removing volumes), changes to the permission system itself, access to client credentials. The agent prepares the complete action; the owner approves with **one tap via Telegram**. Human as a 10-second approver, not an executor.

### 4.3 Build order

1. **MCP tools for n8n** (its API is good; workflows stay visible/inspectable by humans). Agents create their own automation workflows.
2. **Self-service Telegram bots** — agents can register and run their own bots.
3. **Permission rings + Telegram approver flow + audit log.**
4. **Deployment capabilities** (containers, subdomains) opened to agents, gated by the rings.

### 4.4 Cross-cutting requirements

- **Budget as a first-class citizen:** per-agent/per-team daily token budgets; Keeper reports burn rate; automatic kill-switch on runaway loops (an agent retrying a broken task can burn $100 overnight). This later becomes a sellable client-facing dashboard.
- **Prompt injection defense:** any external content agents read (Telegram messages from third parties, web pages, emails) is untrusted. Safety comes from ring architecture, not prompt instructions.
- **Agent changes are Git commits:** when agents create/modify workflows, bots, or configs, each change is an automatic commit to a config repo. `git log` = forensics, `git revert` = recovery. Infrastructure-as-code, written by agents.
- **Output channels are an abstraction:** Telegram, Discord, email are first-class adapters. Instagram (no official automation API for regular accounts) is a fragile adapter, never a core dependency.
- **Per-client API keys:** in any client-facing deployment, LLM usage runs on the client's own API key (or metered with explicit markup). The platform never silently absorbs client token costs.

---

## 5. WORKING AGREEMENTS FOR CLAUDE CODE SESSIONS

- Read this file and `CLAUDE.md` at session start; update `HANDOFF.md` at session end.
- One concern per session where possible. Current order: **UI restoration → repo cleanup → n8n MCP tools → the rest of §4.3**.
- Before large refactors, state the plan briefly and check git history for prior art.
- Every session ends with a passing Docker build.
