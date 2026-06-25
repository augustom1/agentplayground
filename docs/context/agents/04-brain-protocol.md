# Brain Protocol — How to Use the Knowledge Base

> Every agent that writes research, completes work, or learns something useful MUST archive it to the Brain.
> The Brain is the platform's long-term memory. It is the foundation of the local LLM flywheel.

---

## What the Brain Is

The Brain is a pgvector semantic knowledge base. Every piece of content stored is:
1. Chunked into ~800-token segments
2. Embedded via `nomic-embed-text` (1536-dimension vectors)
3. Stored in `BrainChunk` table with HNSW index for fast retrieval
4. Queryable by semantic similarity via `queryBrain()` in `lib/brain/query.ts`

The Brain has two surfaces:
- **Vault Notes**: structured Markdown notes (like Obsidian notes) — use `vault_write`, `vault_read`
- **BrainDocuments**: any content ingested via `ingestToBrain()` — used for research, task results, docs

---

## What to Store in the Brain

| Content Type | Source Format | When |
|---|---|---|
| Research results | `web_search` + `web_browse` | After every research task |
| Task/delegation results | Completed `delegate_to_team` | After every delegation |
| Client briefs | Onboarding conversation | When client onboards |
| Session reports | End of each work session | Via `generate_session_report` |
| Blog drafts | Content creation | Before review |
| Project decisions | After any architecture decision | Always |
| Protocols | After discovering a repeatable workflow | Via `evaluateAndWriteProtocol` |
| Indexed docs | Markdown files in `docs/` | Via `/api/admin/index-docs` |

---

## What NOT to Store

- Raw API responses (summarize first)
- Duplicate content (check `vault_search` before writing)
- Sensitive secrets or credentials (never in Brain)
- Ephemeral tool outputs that aren't useful long-term (e.g., "list files in /tmp")

---

## Source Naming Convention

The `source` field is how the Brain organizes and retrieves content. Use consistent naming:

| Content | Source Format |
|---|---|
| Indexed docs | `docs:[filepath]` |
| Research | `research:[topic-slug]` |
| Task result | `task-result:[taskId]` |
| Client brief | `client:[client-name-slug]` |
| Session report | `session-report:[YYYY-MM-DD]` |
| Blog draft | `content:draft:[post-slug]` |
| Protocol | `protocol:[protocol-name]` |
| Personal notes | `personal:[topic]` |
| Business strategy | `business:[topic]` |

---

## Writing to Brain (Coordinator Tools)

### Short-form notes → Vault
Use `vault_write` for structured notes:
```
vault_write(path: "research/local-llm-routing.md", content: "# Local LLM Routing\n...")
```

### Long-form content → Brain Ingest
For research reports, task results, and docs, use the ingest API (coordinator can trigger via `vps_exec` or the admin panel runs it automatically after delegation tasks).

The `delegate_to_team` + `get_task_result` flow auto-ingests results to Brain when `VAULT_CONTEXT_ENABLED=true`.

---

## Searching the Brain (Coordinator Tools)

### Semantic search
```
vault_search(query: "blog post strategy content calendar")
```
Returns top-k relevant chunks from BrainDocuments + VaultNotes.

### Memory recall
```
recall_memories(key: "cv_content")
```
Returns specific stored facts from AgentMemory table.

---

## Brain Protocols (from docs/PROTOCOLS.md)

These protocols are all implemented and active:

| Protocol | Trigger | Action |
|---|---|---|
| P1: Research archive | `web_search` + `web_browse` called | Result ingested to Brain automatically |
| P2: Task result archive | `delegate_to_team` completes | Result ingested to Brain |
| P3: Session report | End of session | `generate_session_report` → Brain |
| P4: Knowledge population | Admin clicks "Index Docs" | All `docs/` files → Brain |
| P5: Agent evolution | OptimizationScan finds patterns | Writes protocol to `docs/reports/` |
| P6: Human intervention | `request_human_input` called | SSE event + Telegram DM |
| P7: Data retention | Config in AgentMemory | full / results_only / minimal |
| P8: Token tracking | Every LLM call | ApiUsage table → Admin panel |
| P9: Onboarding | First login | `/setup` wizard → seeds teams + Brain |

---

## Brain Quality Rules

1. **Always summarize before storing**: don't dump raw HTML — extract the key information
2. **Include metadata**: always set `sourceType`, `source`, and relevant `metadata` fields
3. **Use descriptive titles**: "Research: Ollama model comparison for 16GB VPS" not "Research"
4. **Check for duplicates**: `vault_search` before writing new content on the same topic
5. **Update, don't duplicate**: if content exists and is stale, update it rather than creating a second copy

---

## Overnight Knowledge Build

Admin panel → "Run Overnight Tasks" triggers `qwen2.5:7b` to:
1. Document all code modules → `docs/code/` + Brain
2. Document all business context → `docs/business/` + Brain
3. Generate workflow patterns for common tasks
4. Write automation protocols for repeated patterns

Run this at the start of each new session if Brain is sparse.
