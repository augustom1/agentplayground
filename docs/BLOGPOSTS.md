# AgentPlayground — Blog Post Pipeline

> Managed by the **Content Team** agent in AgentPlayground.
> Posts here feed `agentplayground.net/blog` and social media channels.
> Each post is tagged with a category and target platform.

---

## Post Queue (planned / in progress)

| # | Title | Category | Platform | Status |
|---|-------|----------|----------|--------|
| 1 | Deploy Your Own AI Agent Platform on a VPS for Under $20/month | VPS / Tutorial | Blog + LinkedIn | planned |
| 2 | What Are AI Agent Teams and Why Every Solo Operator Needs One | AI Agents / Concept | Blog + Twitter/X | planned |
| 3 | Building a 2nd Brain with AI: Your Knowledge Base, Your Rules | Knowledge / Productivity | Blog + LinkedIn | planned |
| 4 | The Pipeline: How to Let AI Do the Heavy Lifting on Any Document | Tutorial | Blog + Twitter/X | planned |
| 5 | Self-Hosting vs Cloud AI: The Real Cost Comparison in 2025 | VPS / Analysis | Blog + LinkedIn | planned |
| 6 | How MCP Protocol Connects Any AI Tool to Your Private Agent Platform | AI / Technical | Blog | planned |
| 7 | Local LLMs + Claude: A Hybrid Setup That Saves Money Without Losing Quality | AI / Technical | Blog + LinkedIn | planned |
| 8 | From Telegram Message to Vault Note: Building an Autonomous Content Pipeline | Tutorial | Blog + Twitter/X | planned |
| 9 | Inside the Keeper: How a Coordinator Agent Manages Your Agent Teams | AI Agents / Deep Dive | Blog | planned |
| 10 | Why Your AI Should Live on Your Server, Not Someone Else's | Philosophy / Privacy | Blog + LinkedIn | planned |
| 11 | How to Set Up a Blog That Writes Itself (With AI Agent Teams) | Tutorial / Meta | Blog + Twitter/X | planned |
| 12 | VPS Basics for AI Builders: What You Actually Need to Know | VPS / Beginner | Blog | planned |

---

## Post Briefs

### 1 — Deploy Your Own AI Agent Platform on a VPS for Under $20/month
**Hook:** Most people think running your own AI is complicated and expensive. It's not.
**Angle:** Step-by-step guide to spinning up AgentPlayground on a Hetzner VPS. Docker command, env vars, done.
**Key points:**
- $5–20/month Hetzner VPS is enough for a full agent platform
- One `docker compose up` command
- Pre-built teams, Knowledge Base, and pipeline included
- No API keys locked in — use Claude, OpenAI, or local Ollama
**CTA:** Link to repo / signup on agentplayground.net

---

### 2 — What Are AI Agent Teams and Why Every Solo Operator Needs One
**Hook:** Stop doing everything yourself. You can have a team of AI specialists for free.
**Angle:** Explain the concept of agent teams (coordinator + specialists) with concrete use cases.
**Key points:**
- A team is a group of agents with a shared goal (research team, content team, dev team)
- The Keeper (coordinator) delegates tasks automatically
- Agents use tools: web search, file access, vault read/write, code execution
- You define the team once; it works while you sleep
**CTA:** Try AgentPlayground — set up your first team in 5 minutes

---

### 3 — Building a 2nd Brain with AI: Your Knowledge Base, Your Rules
**Hook:** Notion is fine. But what if your notes could talk back, search themselves, and write for you?
**Angle:** How the Knowledge Base (vault) works — ingest via Telegram, file upload, or pipeline; semantic search; agents read it automatically.
**Key points:**
- Every note is embedded (768-dim vectors) for semantic search
- Works offline on your VPS — nothing leaves your server
- Feed it from Telegram, files, or the Pipeline
- Agents read context from the vault before every response
**CTA:** Start building your vault today

---

### 4 — The Pipeline: How to Let AI Do the Heavy Lifting on Any Document
**Hook:** Drop in a file. Tell your agents what to do. Come back to the result.
**Angle:** Walk through the Pipeline feature — file upload → instructions → agent processes → output delivered to Knowledge Base or chat.
**Key points:**
- Works with any text file, note, or brief
- Choose your agent team (research, content, dev)
- Output saved automatically to your Knowledge Base
- No babysitting — agents handle it while you work on something else
**CTA:** Try the Pipeline in your AgentPlayground dashboard

---

### 5 — Self-Hosting vs Cloud AI: The Real Cost Comparison in 2025
**Hook:** OpenAI charges per token. Your VPS charges per month. Here's the math.
**Angle:** Honest cost breakdown comparing cloud AI APIs vs self-hosted setup (VPS + local models + occasional Claude API calls).
**Key points:**
- $20/month VPS vs $100–500/month in API costs for heavy use
- Local models (Ollama) handle 80% of tasks for free
- Claude API used for complex reasoning only
- Privacy: your data never leaves your server
**CTA:** AgentPlayground setup guide

---

### 6 — How MCP Protocol Connects Any AI Tool to Your Private Agent Platform
**Hook:** Claude Desktop, ChatGPT, DeepSeek — they can all read from your private knowledge vault.
**Angle:** Explain MCP (Model Context Protocol) and how AgentPlayground exposes an MCP endpoint for external tools.
**Key points:**
- MCP is an open protocol for tool-augmented AI
- AgentPlayground's `/api/mcp` endpoint works with Claude Desktop, mobile, Cursor
- External AI clients can search your vault, run agents, read notes
- One API key, full access
**CTA:** Connect guide at app.agentplayground.net/connect

---

### 7 — Local LLMs + Claude: A Hybrid Setup That Saves Money Without Losing Quality
**Hook:** Use Claude for hard thinking. Use Ollama for everything else. Here's how.
**Angle:** The hybrid model routing strategy — classify tasks locally, escalate to Claude API only when needed.
**Key points:**
- Ollama runs models like Mistral, Phi-3, Qwen locally
- TaskProtocol system classifies incoming tasks and routes to cheapest capable model
- Claude Haiku for medium tasks, Claude Sonnet for complex reasoning
- Result: 70–80% cost reduction with no quality loss on routine tasks
**CTA:** Enable Ollama in your AgentPlayground setup

---

### 8 — From Telegram Message to Vault Note: Building an Autonomous Content Pipeline
**Hook:** Send a voice note. Your agent transcribes, tags, embeds, and files it. You do nothing.
**Angle:** End-to-end walkthrough of the Telegram → vault pipeline.
**Key points:**
- Every Telegram message → auto-saved to vault
- Voice notes → Whisper transcription → vault note
- Date and schedule tags (#task, #meeting) → auto ScheduledJob created
- The vault becomes a real-time capture layer for your entire life
**CTA:** Set up your Telegram bot

---

### 9 — Inside the Keeper: How a Coordinator Agent Manages Your Agent Teams
**Hook:** Most AI tools give you one AI. AgentPlayground gives you a manager and a staff.
**Angle:** Deep dive into the Keeper coordinator — how it reads vault context, delegates to teams, and closes the loop.
**Key points:**
- Keeper reads daily notes and vault context before every response
- It knows all your agent teams, their skills, and their workload
- "Plan before delegate" protocol: generates execution plan, saves to vault, hands off to team
- Teams write results back to vault; Keeper reads them on the next turn
**CTA:** Try the Keeper in the chat

---

### 10 — Why Your AI Should Live on Your Server, Not Someone Else's
**Hook:** Every message you send to ChatGPT is training data. Think about that.
**Angle:** Privacy-first argument for self-hosted AI — data sovereignty, no training on your content, regulatory compliance.
**Key points:**
- Cloud AI providers use your data to improve their models (in most tiers)
- Self-hosted means zero data leaves your infrastructure
- GDPR / compliance friendly — you control the data
- You own the model output, with no vendor lock-in
**CTA:** Self-host your AI platform

---

### 11 — How to Set Up a Blog That Writes Itself (With AI Agent Teams)
**Hook:** This post was planned, briefed, and drafted by an AI agent. Here's the setup.
**Angle:** Meta post showing the content pipeline — blog team in AgentPlayground generates drafts, human reviews, posts.
**Key points:**
- Content Team agent in AgentPlayground
- Pipeline: brief → draft → review → publish
- Posts go to website, LinkedIn, Twitter/X automatically
- Human stays in the loop for final review only
**CTA:** Build your own content team

---

### 12 — VPS Basics for AI Builders: What You Actually Need to Know
**Hook:** You don't need a computer science degree to run your own server. You need 20 minutes.
**Angle:** Beginner-friendly VPS guide tailored to AI builders — pick a provider, set up Docker, deploy AgentPlayground.
**Key points:**
- Which VPS provider to pick (Hetzner, DigitalOcean, Vultr)
- Minimum specs for running AI workloads (4GB RAM + enough for Ollama)
- Docker basics: images, containers, compose
- SSH in 5 minutes
**CTA:** Full setup guide at agentplayground.net

---

## Content Team Setup (in AgentPlayground)

Create a **Content Team** in Agent Lab with:

**Agents:**
- `Content Strategist` — plans posts, picks topics, writes briefs, manages the queue above
- `Writer` — expands briefs into full drafts (1,200–1,800 words)
- `Editor` — reviews drafts, checks tone, tightens copy
- `Publisher` — formats for web + social, handles scheduling

**Skills:**
- `draft_post` — takes a brief from BLOGPOSTS.md → full draft
- `review_post` — edits a draft and flags issues
- `publish_to_vault` — saves the final post to Knowledge Base (blog posts folder)
- `social_snippets` — generates LinkedIn caption + 3 Twitter/X posts from a draft

**Workflow (via Pipeline):**
1. Drop brief into Pipeline → assign to Content Team
2. Writer generates draft
3. Editor reviews
4. Output saved to Knowledge Base under `Blog/`
5. Social snippets generated and saved alongside

---

## Blog Page (in-app, future feature)

Route: `app/(app)/blog/page.tsx`
API: `/api/blog` — read from vault notes tagged `#blog-post`
Public: `agentplayground.net/blog` → nginx serves a static index that calls the app's `/api/blog/public`

Posts stored in vault under `Blog/<slug>.md` with frontmatter:
```
---
title: ...
date: 2026-05-11
status: draft | published
tags: [blog-post, vps, ai-agents]
---
```
