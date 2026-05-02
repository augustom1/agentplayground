# Obsidian Brain Integration — Full Implementation & Business Plan

**Status:** Active  
**Author:** Augusto · **Date:** May 2026  
**Stack baseline:** Next.js 15 · PostgreSQL + pgvector · n8n · Ollama · Docker

---

## What This Is

Agent Playground + Obsidian vault = a platform that **remembers everything, executes automatically, and gets smarter with every use**. The vault is the client's brain. The agent teams are their hands.

This document covers:
1. Technical integration plan (5 phases)
2. Agent teams product catalog
3. Business model (install + host + upsells)
4. Social media marketing strategy

---

## Current Strengths We Build On

| Already exists | How it connects to Brain |
|---|---|
| PostgreSQL + pgvector | Already stores embeddings — we point it at the vault |
| n8n in Docker stack | Becomes the vault sync + pipeline orchestrator |
| Ollama (nomic-embed-text) | Already embeds files — same model indexes vault |
| Files tab with chat | Becomes the Brain Explorer interface |
| Schedule tab | Gets vault frontmatter as calendar source |
| Chat + Keeper | Gets vault context injected on every message |
| Telegram bot | Gets vault read/write commands |

Nothing needs to be ripped out. Every service gains a vault-aware layer on top.

---

## Technical Integration — 5 Phases

### Phase 1 — Foundation: Vault on the Server (Week 1-2)

**Goal:** Keeper reads the vault. Every response is context-aware.

#### New Docker services

```yaml
# Add to docker-compose.yml

syncthing:
  image: syncthing/syncthing:latest
  container_name: vps-syncthing
  restart: unless-stopped
  ports:
    - "8384:8384"   # Web UI (expose via Traefik: sync.yourdomain.com)
    - "22000:22000" # Sync protocol
  volumes:
    - vaultdata:/var/syncthing/vault
  environment:
    - PUID=1000
    - PGID=1000

obsidian-mcp:
  image: cyanheads/obsidian-mcp-server:latest
  container_name: vps-obsidian-mcp
  restart: unless-stopped
  ports:
    - "3001:3001"
  volumes:
    - vaultdata:/vault:ro   # read-write: ro for safety, rw when write tools needed
  environment:
    - VAULT_PATH=/vault
    - MCP_PORT=3001
```

Add `vaultdata:` to the volumes block.

#### n8n workflow: Vault Indexer

One n8n workflow does three things on a schedule (every 5 min) or on file change:
1. List all `.md` files in `/vault`
2. For each file changed since last run: extract text + frontmatter
3. POST to `/api/brain/index` — which embeds via Ollama and upserts to pgvector

This reuses the existing `FileEmbedding` pipeline. Vault notes become first-class embedded documents.

#### New API routes

```
POST /api/brain/index          # Receive vault file content, embed, upsert pgvector
GET  /api/brain/search?q=      # Semantic search across vault (top-k results)
GET  /api/brain/note?path=     # Read a specific vault note by path
POST /api/brain/note           # Write/update a vault note (via MCP server)
GET  /api/brain/daily          # Read today's + last 3 daily notes
```

#### Keeper context injection

In `app/api/chat/route.ts`, before calling Claude:

```typescript
// After: build system prompt
// Add: vault context block
const vaultContext = await searchVault(userMessage, { topK: 5 });
const dailyNotes = await getDailyNotes({ last: 3 });
const activeProjects = await searchVault("#active", { topK: 3 });

systemPrompt += `\n\n## Your Knowledge Base (Obsidian Vault)\n`;
systemPrompt += `### Relevant notes:\n${vaultContext.map(n => n.content).join("\n---\n")}`;
systemPrompt += `### Recent daily notes:\n${dailyNotes}`;
systemPrompt += `### Active projects:\n${activeProjects}`;
```

Cost: 1 Ollama embedding call (free) + ~2k tokens of context per message.

#### Session write-back

After every Claude response, fire-and-forget:

```typescript
// Append to today's daily note in vault
await writeVaultNote({
  path: `daily/${today}.md`,
  append: `\n## ${time} — Chat Session\n${sessionSummary}\n`
});
```

**Milestone:** Keeper knows what the user knows. Zero cold starts.

---

### Phase 2 — Brain Explorer in Files Tab (Week 2-3)

**Goal:** Files tab becomes a knowledge graph interface, not just a file manager.

#### New UI panels (tabs inside Files page)

| Tab | Description |
|---|---|
| **Files** | Existing file manager (keep as-is) |
| **Brain** | Vault browser — folder tree of `.md` files |
| **Graph** | D3.js knowledge graph — nodes = notes, edges = [[wikilinks]] |
| **Search** | Semantic search across entire vault |
| **Capture** | Quick capture field — drop a thought into vault inbox |

#### D3.js graph

- Nodes: one per `.md` file. Color by type: `#project` = blue, `#person` = green, `#concept` = yellow, daily = gray
- Edges: parsed `[[wikilink]]` references in note content
- Click node → opens note in right panel
- Data source: `GET /api/brain/graph` returns `{ nodes: [], edges: [] }`

#### Upload & Make Sense pipeline

```
User drops file (image/PDF/audio)
  → POST /api/brain/ingest
  → If image: Claude vision → description + extracted text
  → If PDF: existing /api/files/extract → text chunks
  → If audio: existing /api/transcribe → transcript
  → Agent writes structured vault note linked to active project
  → pgvector indexed immediately
```

**Milestone:** Users can browse, search, and feed the vault from the app.

---

### Phase 3 — Schedule + Content Calendar (Week 3-4)

**Goal:** Schedule tab reads from vault. Content plans write back to vault.

#### Vault → Calendar sync

n8n workflow runs every 15 min:
- Read all vault notes with `date:` or `publish_at:` frontmatter
- POST to `/api/brain/calendar-sync` — upserts to `ScheduledJob` table
- Schedule tab renders them automatically (already works for ScheduledJob)

#### Content planning agent flow

User: "Plan my social media for the product launch"
1. Keeper reads vault: finds `#product-launch` notes, brand voice note, past content notes
2. Content agent team generates 4-week plan (copy + format + platform + time)
3. Each post written as vault note with `publish_at:` frontmatter
4. Schedule tab auto-populates

**Milestone:** Calendar and vault are in sync. Content plans are one message away.

---

### Phase 4 — Communication Pipelines (Week 4-5)

**Goal:** Vault handles CRM. Agents handle inbox.

#### Email routing (n8n)

```
Gmail trigger → n8n
  → POST /api/keeper/message (with email content)
  → Keeper reads vault: who is sender? what project?
  → Classify: support / lead / partner / internal / noise
  → Route to correct agent team
  → Write to vault: sender's People CRM note
  → Send response or notification
```

#### People CRM (in vault)

Every person the platform interacts with gets a note: `people/Name.md`
```markdown
---
name: John Smith
email: john@company.com
company: Acme Corp
relationship: lead
last_contact: 2026-05-01
tags: [#lead, #saas]
---
## Notes
...
## Interactions
- 2026-05-01: Email about pricing
```

Agents read these before writing responses. The vault becomes the CRM.

#### Support chatbot

Website chat / WhatsApp message arrives → Keeper searches vault for product docs + past support cases → agent responds → ticket summary written to vault → vault gets smarter with every ticket.

**Milestone:** Platform handles communications autonomously. Vault is the ground truth.

---

### Phase 5 — External LLM Bridge: /mcp endpoint (Week 5-6)

**Goal:** Claude Desktop, GPT, Cursor users can use the platform's agents and vault from their own tools.

#### New endpoint: `app/api/mcp/route.ts`

Implements the MCP protocol. Exposes these tools:

| Tool | What it does |
|---|---|
| `vault_search` | Semantic search across vault |
| `vault_read` | Read note by path or title |
| `vault_write` | Create or update a note |
| `dispatch_task` | Send task to the appropriate agent team |
| `get_project_status` | Current state of a project |
| `schedule_event` | Create calendar event synced to vault |
| `get_context` | Full Keeper context summary for a topic |

#### Client config (Claude Desktop example)

```json
{
  "mcpServers": {
    "agentplayground": {
      "type": "url",
      "url": "https://app.yourdomain.com/mcp",
      "headers": { "Authorization": "Bearer YOUR_API_KEY" }
    }
  }
}
```

This is a key differentiator: clients who use Claude Desktop daily get their agent teams accessible without opening the dashboard.

**Milestone:** Agent Playground is an MCP server. Works inside Claude Desktop, Cursor, GPT.

---

## Agent Teams Product Catalog

Each team is a configured set of agents + skills + vault workflows. Sold as add-ons on top of the base installation.

### Marketing Team
**What it does:** Content calendar, social media copy, brand voice enforcement, campaign planning.

Key agents:
- **Content Strategist** — reads vault (brand notes, past performance, audience notes) → generates content plan
- **Copywriter** — writes posts in the client's voice (trained on their writing samples in vault)
- **Scheduler** — writes content to vault as event notes → they appear on the calendar tab

Demo: "Plan my Instagram for May" → 30-post calendar ready in 90 seconds.

### Communication Team
**What it does:** Email routing, customer support chatbot, WhatsApp replies, lead qualification.

Key agents:
- **Inbox Manager** — classifies email, routes, drafts responses
- **Support Bot** — answers customer questions using vault product docs
- **Lead Qualifier** — creates People CRM notes for inbound leads, sends intro email draft

Demo: Live customer support chatbot powered by their actual knowledge base, not generic AI.

### Dev Team
**What it does:** Code review, PR summaries, technical documentation, bug triage.

Key agents:
- **Code Reviewer** — reviews PRs, writes summary to vault
- **Doc Writer** — generates docs from code + vault architecture notes
- **Bug Triager** — classifies GitHub issues, suggests fixes based on codebase vault notes

Demo: "Review this PR and update the docs" → done without touching the editor.

### Business Team
**What it does:** Meeting prep, CRM management, follow-up drafts, weekly briefings.

Key agents:
- **Meeting Prepper** — reads vault for context on attendees and topic → briefing doc
- **CRM Keeper** — updates People notes after every interaction
- **Weekly Briefer** — every Monday, reads vault activity log → sends briefing via Telegram

Demo: "Brief me on Maria before our call" → 2-minute brief with full context from the vault.

### Research Team
**What it does:** Web research, synthesis, gap analysis against vault knowledge.

Key agents:
- **Vault-First Searcher** — checks vault before doing any web search
- **Web Researcher** — fills gaps with live search
- **Synthesizer** — writes delta report: what's new, what's confirmed, what changed

Demo: "What do we know about competitor X and what are we missing?" → report in the vault in 3 minutes.

---

## Business Model

### Product Tiers

| Tier | What's included | Price |
|---|---|---|
| **Starter Install** | VPS setup + platform only + 1 agent team | $299 one-time |
| **Brain Install** | Above + Obsidian Brain integration + Syncthing | $499 one-time |
| **Full Stack** | Above + all 5 agent teams + MCP bridge | $799 one-time |

### Hosting / Managed Service (monthly)

| Plan | What's included | Price |
|---|---|---|
| **Self-managed** | Install only, client manages VPS | $0/mo |
| **Managed Basic** | VPS monitoring, updates, backups | $79/mo |
| **Managed Pro** | Above + support, custom workflows | $149/mo |
| **Managed Enterprise** | Above + SLA, dedicated setup call, CRM integration | $299/mo |

### Agent Team Add-ons (post-install upsells)

| Team | Price |
|---|---|
| Marketing Team | $149 one-time |
| Communication Team | $199 one-time |
| Dev Team | $149 one-time |
| Business Team | $149 one-time |
| Research Team | $99 one-time |
| All Teams Bundle | $499 one-time (vs $745 separately) |

### Revenue model math (1 client)

- Starter Install → Brain Install → Managed Pro → 3 agent teams
- $499 + $149/mo + $447 teams = **$1,095 year 1, $1,788 year 2**
- 10 clients = $10k-18k ARR with zero employees

---

## Social Media Strategy

### Core angle

> "You think. Your agent team remembers, organizes, and executes. Everything lives in your vault."

This is the hook. It's not "AI chatbot." It's "AI team that knows your business."

### Content pillars

| Pillar | Format | Cadence |
|---|---|---|
| **Live demos** | Screen recording → Reel/Short | 2x/week |
| **Before/after** | Text post: "What I used to do manually vs what my agent team does now" | 1x/week |
| **Behind the scenes** | Show the vault, the graph, the agent running | 1x/week |
| **Client outcomes** | (when you have clients) anonymized results | 1x/month |
| **Tech explainers** | "Why the Obsidian vault approach beats RAG-on-upload" | Occasional |

### Demo ideas that will convert

1. **"I sent 40 photos to my agent team"** — Show the photo intelligence pipeline. Raw event photos → structured vault note with top picks flagged → draft Instagram caption → in the calendar. 90 seconds.

2. **"My inbox runs itself"** — Show email arriving, Keeper classifying it, draft response written, vault CRM updated. No manual touch.

3. **"I asked my agent to brief me before a meeting"** — Show the Keeper reading the People note, past interactions, project notes → producing a 1-page brief. In 10 seconds.

4. **"This is what 6 months of business knowledge looks like in a graph"** — Show the D3.js knowledge graph. Nodes, wikilinks, color-coded by type. It's visually stunning.

5. **"I asked it to plan my social media for the month"** — Content agent generates 30 posts. They appear on the calendar. Show the whole flow.

### Platforms

- **LinkedIn** — primary (B2B, founders, agencies). Demos + long-form posts about the "second brain + agents" concept
- **Twitter/X** — screenshots, quick demos, technical audience
- **Instagram/TikTok** — screen recordings with voiceover, "day in the life with AI agents"
- YouTube — 5-10 min walkthrough videos (long-tail SEO)

### Key message per platform

- LinkedIn: "How I built an AI operations team for my business for $499"
- Twitter: "The reason most AI tools fail: no memory. Here's how to fix it."
- Instagram: "POV: you haven't checked your inbox in 3 days because your agent handles it"

### Use your own platform to market itself

The Marketing Agent Team creates the social media content. You demo the team by using it. Every post is proof it works. This is the flywheel:
- You use the marketing team → it creates good content
- Good content shows the platform working → people buy
- More clients → more testimonials → better content

---

## Unique Positioning

### Why this beats every competitor

| Competitor | Their gap | Our answer |
|---|---|---|
| ChatGPT / Claude | No memory across sessions, no execution | Vault = permanent memory. Agents = execution. |
| Notion AI | Assists, doesn't execute | Our agents take action, not just suggest |
| Make / Zapier | No intelligence, just pipes | Our agents reason before acting |
| Hosted AI platforms | Your data on their servers | Self-hosted. Your vault, your server, your data — forever |
| Other agent platforms | Cold start every session | Vault = zero cold starts. The brain grows. |

### The compound value argument

The longer a client uses it, the more valuable it becomes. The vault gets richer with every:
- Task completed (session log written)
- Email processed (People note updated)
- Research done (knowledge/ folder grows)
- Meeting prepped (past context retained)

This creates switching cost without lock-in. The client owns the vault (plain `.md` files). But the platform is what makes it useful. That's the position.

---

## Implementation Priority

1. **Phase 1** (vault on server + Keeper context) — This alone is the product. Everything else is additive.
2. **Phase 2** (Brain Explorer UI) — Makes it visual and sellable.
3. **Agent teams** — Package existing team configs into named products.
4. **Social media content** — Start week 1. Record every build step.
5. **Phase 3-4** (schedule + comms) — Ship after first paying client.
6. **Phase 5** (MCP bridge) — Ship after 5 clients.

---

## New Environment Variables Needed

```bash
# Vault
VAULT_PATH=/var/syncthing/vault     # Path inside Docker
OBSIDIAN_MCP_URL=http://obsidian-mcp:3001

# Syncthing (set after first run)
SYNCTHING_API_KEY=                   # From Syncthing web UI

# Optional: if using Obsidian Local REST API plugin instead of MCP server
OBSIDIAN_REST_API_URL=http://localhost:27123
OBSIDIAN_REST_API_KEY=
```

---

## New Docker Services Summary

```yaml
# Add to docker-compose.yml
syncthing:       # Vault sync between client machine and VPS
obsidian-mcp:    # Read/write vault via MCP protocol
```

And expose via Traefik:
```
sync.yourdomain.com   → Syncthing web UI
```

---

*This document is the working implementation spec. Update phase checkboxes as work is completed.*
