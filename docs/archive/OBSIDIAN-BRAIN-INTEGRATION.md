# Project Proposal: Obsidian Brain — Deep Integration into Agent Playground

**Status:** Proposal · **Version:** 1.0  
**Author:** Augusto · **Date:** May 2026  
**Repo:** github.com/augustom1/agentplayground-public

---

## Executive Summary

Agent Playground already runs autonomous agent teams on self-hosted infrastructure. This proposal extends the platform with a **living second brain** — powered by an Obsidian vault — that becomes the persistent memory, knowledge graph, and operating context for every agent, every user, and every workflow on the platform.

The result: non-technical users can connect their knowledge base, talk to their agents in plain language from any surface (web app, Telegram, Claude Desktop, GPT), and have teams of agents execute complex multi-step tasks — scheduling content, routing emails, researching topics, managing meetings, supporting customers — without writing a single line of code.

---

## Problem Statement

Agent Playground today is powerful but context-blind. Every session starts fresh. Agents don't know what the user knows, what decisions have been made, what projects are live, or what preferences the user has. Additionally:

- There is no persistent knowledge layer across sessions
- There is no way for non-technical users to feed the system their existing knowledge (documents, notes, photos, files)
- The app, Telegram, and external LLMs (Claude, GPT) operate as separate silos
- The Schedule tab has no awareness of projects, deadlines, or user context
- There is no unified inbox or routing system for communications

The Obsidian Brain integration solves all of this in one architectural move.

---

## Vision

> **"You think and create. The agents remember, organize, and execute. The brain connects everything."**

A user uploads photos of a product launch event. The brain makes sense of them, tags them, and connects them to the relevant project notes. The content agent team drafts a 4-week Instagram plan. The schedule tab shows publishing dates. The email agent notifies collaborators. All of this triggered by one message: *"Plan content for the launch."*

No technical knowledge required. No configuration. No dashboards to learn.

---

## Core Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    OBSIDIAN VAULT (local)                   │
│   Projects · Daily Notes · People CRM · Decisions · Tasks  │
└───────────────────┬─────────────────────────────────────────┘
                    │ Syncthing (real-time sync)
                    ↓
┌─────────────────────────────────────────────────────────────┐
│              AGENT PLAYGROUND VPS                           │
│                                                             │
│  ┌──────────────┐   ┌──────────────┐   ┌────────────────┐  │
│  │  Obsidian    │   │   pgvector   │   │   n8n          │  │
│  │  MCP Server  │   │   (embeddings│   │   (workflows + │  │
│  │  (read/write)│   │   + search)  │   │   triggers)    │  │
│  └──────┬───────┘   └──────┬───────┘   └───────┬────────┘  │
│         └──────────────────┴───────────────────┘           │
│                             │                               │
│               ┌─────────────▼──────────────┐               │
│               │    PLAYGROUND KEEPER        │               │
│               │  (vault-aware orchestrator) │               │
│               └─────────────┬──────────────┘               │
│         ┌───────────────────┼───────────────────┐          │
│    ┌────▼────┐        ┌─────▼─────┐      ┌──────▼──────┐   │
│    │ Dev     │        │ Content   │      │ Business    │   │
│    │ Team    │        │ Team      │      │ Team        │   │
│    └─────────┘        └───────────┘      └─────────────┘   │
└─────────────────────────────────────────────────────────────┘
                             │
          ┌──────────────────┼──────────────────┐
     ┌────▼────┐      ┌──────▼──────┐    ┌──────▼──────┐
     │  App    │      │  Telegram   │    │  External   │
     │  Chat   │      │  Bot        │    │  LLMs (MCP) │
     └─────────┘      └─────────────┘    └─────────────┘
```

---

## Feature Specifications

### 1. Files Tab — Brain Explorer

**Current state:** Basic file management via FileBrowser.  
**New state:** A full knowledge graph interface connected to the Obsidian vault.

#### Features
- **Graph View** — Interactive node graph of all vault notes and their [[wikilinks]]. Nodes colored by type (Project, Person, Concept, Daily Note). Clickable to open the note.
- **Vault Browser** — Folder tree of all `.md` files with search, tag filtering, and frontmatter metadata display.
- **Quick Capture** — A single text field (always visible) to drop a thought into the vault inbox. Agents process it into the right note or project automatically.
- **Upload & Make Sense** — Drag-and-drop area for any file type (images, PDFs, audio, CSVs). Agents OCR, transcribe, or parse the file and create a structured vault note linked to the relevant project.
- **Semantic Search** — Full-text + vector search across the entire vault. Results ranked by relevance to current project context.

#### Technical implementation
- Graph rendered with D3.js — nodes from vault file list, edges from parsed `[[wikilinks]]` in note content.
- Upload pipeline: file → n8n → agent (vision/OCR/transcription) → structured markdown → vault write via Obsidian MCP.
- pgvector index updated on every vault change via a Syncthing post-sync hook.

---

### 2. Playground Keeper — Vault-Aware Orchestration

**Current state:** Keeper routes messages to agent teams.  
**New state:** Keeper loads vault context before every response.

#### Context injection flow
```
Message received
  → pgvector semantic search on vault (top 5 relevant notes)
  → Load active project notes (tagged #active in vault)
  → Load user preferences (USER.md equivalent in vault)
  → Inject all of the above into Keeper system prompt
  → Route to agent team with full context
  → Write session summary back to vault on completion
```

#### Session memory
Every completed task generates a session log written to `daily/YYYY-MM-DD.md` in the vault. The next message the user sends, the Keeper reads the last 3 daily notes as rolling context. The platform effectively remembers everything across sessions without any manual effort.

---

### 3. Schedule Tab — Brain-Synced Calendar

**Current state:** Calendar scheduler with recurring tasks.  
**New state:** Calendar that reads from and writes to the vault.

#### Features
- **Auto-populate from vault** — Any note tagged `#event`, `#deadline`, or `#publish` with a `date:` frontmatter field automatically appears on the calendar.
- **Content calendar** — Content agent team generates a publishing schedule and writes it to the vault as individual event notes. Schedule tab renders them as a drag-and-drop content calendar.
- **Meeting notes** — Calendar events can be linked to a vault note. Before a meeting, the Keeper prepares a briefing from vault context. After, agents transcribe/summarize and write it back.
- **Two-way sync** — Creating or moving an event in the Schedule tab writes the change back to the vault frontmatter. Obsidian users see changes reflected immediately.

#### Technical implementation
- n8n workflow watches vault for frontmatter changes (`date:`, `status:`, `publish_at:` fields).
- Schedule tab queries a `/api/calendar/vault-events` endpoint that reads from the pgvector-indexed note metadata.
- Agent-generated content plans write event notes in bulk via Obsidian MCP server.

---

### 4. Agent Use Cases — Zero Technical Knowledge

This is the flagship capability. Users describe what they want in plain language. The Keeper reads the vault for context, routes to the right team, and executes. The vault is both the input and the output.

---

#### 4.1 Photo Intelligence — "Make sense of these"

**Trigger:** User uploads 40 photos from an event, product shoot, or project.

**Flow:**
1. Files uploaded to app or sent via Telegram
2. Vision agent (Claude) processes each image: describes content, extracts text, identifies people/products
3. Agents cluster images by theme and quality-rank them
4. Output: vault note with organized image descriptions, top picks flagged, linked to the relevant project note
5. Content team uses this vault note as input for the content plan

**Use cases:** Product launches, event documentation, real estate listings, brand asset libraries.

---

#### 4.2 Content Planning — "Plan my social media for the launch"

**Trigger:** Natural language message from any entry point.

**Flow:**
1. Keeper reads vault: finds project notes tagged `#product-launch`, past content performance notes, brand voice notes
2. Content agent team generates a 4-week content plan (copy + format + platform + timing)
3. Plan written to vault as individual event notes with `publish_at:` frontmatter
4. Schedule tab auto-populates the content calendar
5. User approves or edits individual posts directly in Obsidian or app

**Output:** Ready-to-execute content calendar requiring zero reformatting.

---

#### 4.3 Research — "What do we know about X, and what should we know?"

**Trigger:** Any message asking for research.

**Flow:**
1. Keeper does vault-first search: what notes already exist on the topic?
2. Research agent identifies gaps — what's missing from the vault?
3. Web research agent fills gaps with live search
4. Synthesis agent writes a delta report: what's new, what's confirmed, contradictions, recommended next actions
5. Report saved to vault under `knowledge/` folder with all sources linked

**Result:** The vault gets smarter with every research task. Future queries on the same topic are faster and cheaper (less web search needed).

---

#### 4.4 Email Routing — "Handle my team's inbox"

**Trigger:** Email integration configured via n8n (Gmail, SMTP, or custom).

**Flow:**
1. Incoming email received by n8n trigger
2. Keeper reads vault: who is this sender? (People CRM notes), what project is this about?, what's the response protocol?
3. Email agent classifies: support / sales lead / partner / internal / noise
4. Routing: 
   - Support → support chatbot agent responds
   - Sales lead → vault note created under `crm/leads/`, notification sent to user
   - Partner → draft reply written in user's voice, awaits approval
   - Internal → filed, summarized in daily note
5. All email activity logged in vault under sender's People CRM note

**Result:** Zero-touch inbox management. The vault is the CRM.

---

#### 4.5 Meeting Scheduler — "Schedule a meeting with Maria about the Q3 review"

**Trigger:** Natural language message.

**Flow:**
1. Keeper reads vault: who is Maria? (finds her People CRM note with email, timezone, relationship context)
2. Reads user's availability from Schedule tab
3. Meeting agent drafts a scheduling email in user's voice, referencing vault context
4. Creates a placeholder calendar event with a vault note stub for meeting prep
5. On reply, confirms the event, updates vault and Schedule tab
6. Before the meeting, Keeper prepares a briefing from all vault notes related to the topic

**Result:** Meetings go from idea to scheduled with one message. The vault contains the full relationship history.

---

#### 4.6 Enterprise Support Chatbot — "Respond to our customers"

**Trigger:** Webhook from website chat, WhatsApp, or any channel.

**Flow:**
1. Customer message arrives via n8n webhook
2. Support agent searches vault for: product docs, past support cases, known issues, response templates
3. Agent composes response using vault knowledge as its ground truth
4. If confidence is low, escalates to human with a draft and relevant vault context attached
5. Every resolved ticket creates or updates a vault note under `support/` — building institutional knowledge over time

**Result:** A chatbot that gets smarter with every interaction, grounded in your actual knowledge base, not generic AI responses.

---

### 5. External LLM Integration — Agent Playground as MCP Server

Claude Desktop, GPT (with MCP support), Cursor, and other tools can connect to Agent Playground as an MCP server. This means users of those tools get access to the full agent team infrastructure and vault context without leaving their preferred tool.

#### Exposed MCP tools
| Tool | Description |
|---|---|
| `vault_search` | Semantic search across the Obsidian vault |
| `vault_read` | Read a specific note by path or title |
| `vault_write` | Create or update a vault note |
| `dispatch_task` | Send a task to the appropriate agent team |
| `get_project_status` | Get current state of a project from vault |
| `schedule_event` | Create a calendar event synced to vault |
| `get_context` | Get the Keeper's full context summary for a topic |

**Config for users (Claude Desktop example):**
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

Once connected, users can type *"Research competitors for my SaaS product"* in Claude Desktop and Agent Playground's research team executes it, writing results to the vault — which they can then open in Obsidian.

---

### 6. Telegram Entry Point

A Telegram bot gives users a frictionless mobile interface. No app install required.

#### Commands
| Command | Action |
|---|---|
| (any message) | Forwarded to Keeper with vault context |
| `/brain [query]` | Search vault and return top results |
| `/task [description]` | Dispatch to agent team immediately |
| `/daily` | Get today's briefing from vault |
| `/note [content]` | Quick capture to vault inbox |
| (photo sent) | Triggers photo intelligence pipeline |
| (voice message) | Transcribed and captured to vault inbox |

**Implementation:** Single n8n workflow. Telegram Trigger → HTTP POST to `/api/keeper/message` → response sent back. No new backend code required beyond the Keeper endpoint.

---

## Technical Stack Additions

| Component | Tool | Purpose |
|---|---|---|
| Vault sync | Syncthing (self-hosted) | Real-time local ↔ VPS vault sync |
| Obsidian MCP Server | `cyanheads/obsidian-mcp-server` (Docker) | Read/write vault via MCP protocol |
| Graph rendering | D3.js | Interactive knowledge graph in Files tab |
| Embedding pipeline | n8n + OpenAI/Ollama embeddings | Auto-index vault changes to pgvector |
| Telegram | n8n Telegram node | Bot entry point |
| MCP server endpoint | Next.js API route `/mcp` | Expose platform to external LLMs |
| Vision/OCR | Claude vision (claude-sonnet-4-6) | Photo intelligence pipeline |
| File parsing | n8n + pdf-parse, whisper | PDF, audio ingestion to vault |

All additions are containerized and added to the existing Docker Compose stack. No new infrastructure required.

---

## Implementation Phases

### Phase 1 — Foundation (2–3 weeks)
- [ ] Syncthing setup between user machine and VPS
- [ ] Obsidian MCP server added to Docker Compose
- [ ] pgvector indexing pipeline (n8n watches vault, embeds changes)
- [ ] Keeper vault context injection (top-5 semantic search on every message)
- [ ] Session log write-back to vault daily note

**Milestone:** Keeper is vault-aware. Chat conversations are contextually informed by your knowledge base.

### Phase 2 — Files Tab & Brain Explorer (2–3 weeks)
- [ ] Vault browser UI in Files tab
- [ ] D3.js knowledge graph (nodes from files, edges from wikilinks)
- [ ] Quick capture widget
- [ ] Semantic search UI
- [ ] Upload & Make Sense pipeline (photos, PDFs, audio)

**Milestone:** Files tab becomes the brain interface. Users can explore, search, and feed the vault from the app.

### Phase 3 — Schedule & Content (2 weeks)
- [ ] Vault frontmatter → Schedule tab sync
- [ ] Content planning agent workflow
- [ ] Content calendar UI in Schedule tab
- [ ] Meeting scheduler flow
- [ ] Two-way event sync

**Milestone:** Schedule tab reflects the brain. Content plans and meetings flow from vault to calendar automatically.

### Phase 4 — Communication Workflows (2–3 weeks)
- [ ] Telegram bot via n8n
- [ ] Email routing pipeline
- [ ] Support chatbot scaffold
- [ ] People CRM in vault (auto-populated from email/meeting interactions)

**Milestone:** The platform handles communications autonomously using vault as ground truth.

### Phase 5 — External LLM Bridge (1–2 weeks)
- [ ] `/mcp` endpoint in Next.js with auth
- [ ] MCP tool definitions: vault_search, dispatch_task, get_context, schedule_event
- [ ] Documentation for Claude Desktop and GPT config
- [ ] API key management UI for external connections

**Milestone:** Claude Desktop and GPT users can use Agent Playground's agents and vault from their own tools.

---

## Non-Goals (this proposal)

- Real-time collaborative editing of vault notes (out of scope for v1)
- Multi-vault support per user (single vault per user account for now)
- Mobile native app (Telegram covers mobile; web app is responsive)
- Custom LLM fine-tuning on vault contents

---

## Success Metrics

| Metric | Target (90 days post-launch) |
|---|---|
| Average vault notes referenced per Keeper response | ≥ 3 |
| Tasks completed via Telegram bot | ≥ 30% of total |
| Content plans generated per active user/month | ≥ 2 |
| External LLM connections (MCP) | ≥ 10 active connections |
| Support tickets resolved without human escalation | ≥ 70% |
| User sessions that result in vault write-back | ≥ 80% |

---

## Why This Matters for the Business

Agent Playground's current differentiation is **self-hosted, open-source, no vendor lock-in**. The Obsidian Brain integration doubles down on that: the user's knowledge lives in plain `.md` files they own forever. The platform becomes more valuable the more it's used — every task makes the vault richer, which makes future tasks cheaper and faster.

This creates a genuine moat. The vault is the user's data, not the platform's. But the platform is what makes the vault useful. That's a defensible, trust-first position that no hosted AI product can replicate.

It also unlocks the **Managed VPS tier** story: enterprise clients get a fully managed second brain infrastructure — agents that know their business, remember every decision, handle their communications, and connect to any LLM their team already uses.

---

## References

- `cyanheads/obsidian-mcp-server` — Obsidian vault MCP server (HTTP + stdio)
- `coleam00/second-brain-starter` — Session memory pattern (SOUL.md / MEMORY.md)
- `lucasrosati/claude-code-memory-setup` — Token-efficient vault context loading
- `NicholasSpisak/second-brain` — Zettelkasten wiki schema for agent-maintained knowledge
- Agent Playground repo: `github.com/augustom1/agentplayground-public`
- Obsidian Local REST API plugin — Required for MCP server vault access

---

*This document is a living proposal. It should be committed to the repo as `docs/OBSIDIAN-BRAIN-PROPOSAL.md` and linked from VISION.md.*
