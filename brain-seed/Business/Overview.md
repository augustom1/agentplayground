# AgentPlayground — Business Overview

## What We Build

AgentPlayground is a **self-hosted AI operations platform**. We sell the platform and the expertise to deploy it.

The product lives at `app.agentplayground.net`. It is a full AI agent dashboard where users can:
- Chat with the **Playground Keeper** (Claude in coordinator mode), which routes tasks to specialized agent teams
- Create and manage **agent teams** (Dev, DevOps, Research, Business, Content, etc.)
- Store and retrieve knowledge via the **2nd Brain** (vault — semantic search over personal notes)
- Schedule recurring tasks, manage files with vector embeddings, and connect external LLMs via MCP

## The Two Business Models

### 1. Managed Service (B2B — current primary focus)
We install, configure, and deliver the full stack on the **client's own VPS**.
- Client owns their infrastructure — no SaaS lock-in
- We do the technical heavy lifting via SSH
- Revenue: one-time setup fee + optional monthly retainer

### 2. SaaS / White-Label (future)
Clients self-sign-up at agentplayground.net, choose a plan, pay with crypto, and get a hosted instance.

## The Tech Stack We Deploy

| Service | Purpose |
|---|---|
| AgentPlayground Dashboard | AI agent operations center |
| Ollama | Local LLMs (zero per-token cost) |
| n8n | Visual workflow automation (400+ connectors) |
| PostgreSQL + pgvector | Database + semantic search |
| Redis | Cache + task queues |
| Traefik | Reverse proxy + auto HTTPS |
| FileBrowser | Web file manager |
| Portainer | Docker management GUI |

## Key Differentiators

1. **Self-hosted / client owns everything** — no vendor lock-in, no per-seat pricing
2. **Local LLMs via Ollama** — Qwen2.5, Llama3, Mistral run on the client's VPS at zero token cost
3. **2nd Brain (vault)** — all agent chats, Telegram messages, and notes are searchable by AI agents
4. **MCP endpoint** — any external LLM (Claude Desktop, ChatGPT, DeepSeek, Cursor) can read/write the vault
5. **Coordinator (Keeper)** — one message dispatches work to multiple specialized teams

## Owner / Founder

Augusto Meyer — augustojmeyer@gmail.com
