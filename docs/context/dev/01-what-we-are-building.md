# What We Are Building — Platform Overview

> The single most important document for any dev-domain agent. Read before touching any code.

---

## The Core Idea

A self-hosted AI operations platform where a single **Coordinator** (Claude) manages teams of specialized **Agents** that do real work: write code, research, draft content, monitor billing, run infrastructure tasks, and report back.

Everything the coordinator does leaves a trace in the **Brain** (pgvector knowledge base). Over time the Brain becomes a memory of everything the platform has done, learned, and decided — and agents can query it to avoid repeating research or re-reading the same context.

---

## The Core Loop

```
User sends message
    ↓
Coordinator (Claude claude-sonnet-4-6, 25 tool iterations)
    ├── Simple question → answer directly
    ├── Single-team task → delegate_to_team → get_task_result → synthesize
    └── Multi-team goal → create_plan → run_plan → [tasks run in parallel] → synthesize
    ↓
All results archived to Brain (BrainDocument)
    ↓
User gets answer + Brain grows
```

---

## The Brain (Knowledge Flywheel)

Every piece of work the system does feeds the Brain:
- `web_search` results → Brain
- `delegate_to_team` results → Brain
- Session reports → Brain
- Indexed docs (`index-docs`) → Brain

As the Brain fills up, agents pull context from it using `vault_search` or `recall_memories` before starting tasks. Over time: less re-research, less re-briefing, better outputs.

Long-term goal: routine tasks run entirely on local Ollama (qwen2.5:7b) using Brain context. Claude handles only complex reasoning.

---

## The Local LLM Flywheel

```
Task comes in
    ↓
runner.ts: classify task complexity (confidence score)
    ├── Confidence ≥ 72% → route to Ollama (qwen2.5:7b, zero API cost)
    └── Confidence < 72% → route to Claude
    ↓
Result archived to Brain
    ↓
evaluateAndWriteProtocol: if task succeeded → write automation protocol
    ↓
Next similar task: higher confidence → more Ollama routing
```

---

## What's Special About This Architecture

1. **Coordinator with tools**: The chat endpoint is not just an LLM answering questions — it runs up to 25 tool iterations in one message. Tools can delegate work, schedule tasks, write to Brain, exec on VPS.

2. **Plans system**: For complex multi-team goals, the coordinator creates a Plan (council deliberates → user approves → parallel task dispatch → results synthesized). This is like a project manager spawning a team.

3. **SSE live activity**: When background agents are running, their progress streams to the browser via Server-Sent Events. The user sees live updates without polling.

4. **request_human_input**: Agents can pause mid-task and wait for user input, sent as an SSE event to the browser + Telegram. This is the "human in the loop" escape hatch.

5. **Brain as memory + ops log**: Every action leaves a trace. The coordinator reads Brain context at startup (via VAULT_CONTEXT_ENABLED) to pick up where it left off.

---

## Primary User Flows

| Flow | Entry Point | Description |
|---|---|---|
| Daily coordination | `/chat` | User talks to coordinator, delegates work |
| Team management | `/agent-lab` | Create/edit teams, agents, skills |
| Plan creation | `/plans` | Multi-team projects with approval gate |
| Project tracking | `/projects` | Client/internal project status |
| Brain reading | `/brain` | View knowledge base, vault notes |
| Platform health | `/admin/system` | Seed context, index docs, run overnight |
| Playground | `/playground` | Multi-agent chat in real-time |

---

## What Agents Know vs. What They Don't

Agents (in `runAgentTask` or `runDelegatedTask`) run with:
- Their own system prompt (from DB)
- Their team's skills (from DB)
- Tools available from `lib/chat-tools.ts`
- Brain context if they call `vault_search` or `recall_memories`

Agents do NOT automatically get:
- Full conversation history (they get the task description only)
- Other agents' in-progress state
- Access to secrets or env vars

The coordinator synthesizes results from multiple agents and presents them to the user.
