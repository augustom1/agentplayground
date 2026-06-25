# Tool Catalog — All Coordinator Tools

> All tools available in `lib/chat-tools.ts`. Grouped by category.
> Coordinator uses these in its tool loop (up to 25 iterations per message).

---

## Team & Agent Management

| Tool | When to Use |
|---|---|
| `create_team` | User asks to create a new agent team |
| `create_agent` | Add an agent to an existing team |
| `add_skill` | Add a skill to a team |
| `add_cli_function` | Register a new CLI function/tool |
| `update_team` | Rename, re-describe, or change team config |
| `update_agent` | Update agent model, system prompt, or capabilities |
| `list_team_details` | Get full config of a team + its agents |
| `list_available_skills` | See all skills across all teams |

---

## Task Execution & Delegation

| Tool | When to Use |
|---|---|
| `delegate_to_team` | Hand a task to a specific team — runs agent loop, returns result |
| `get_task_result` | Retrieve the result of a previously delegated task |
| `schedule_task` | Schedule a task to run at a future time |
| `plan_task` | Internal planning step — think through how to execute a task |
| `create_plan` | Create a multi-team plan (council reviews → user approves) |
| `run_plan` | Execute an approved plan (parallel task dispatch) |
| `council_reason` | Run multi-perspective deliberation before a big decision |
| `request_human_input` | Pause and ask Augusto a question — blocks until answered |

---

## Knowledge & Brain

| Tool | When to Use |
|---|---|
| `vault_search` | Search Brain vault notes by semantic similarity |
| `vault_read` | Read a specific vault note by path |
| `vault_write` | Write a new vault note to the Brain |
| `save_memory` | Store a key-value fact in AgentMemory (persists across sessions) |
| `recall_memories` | Retrieve stored memories by key or semantic search |
| `generate_session_report` | Upload session summary as BrainDocument |

---

## Research & Web

| Tool | When to Use |
|---|---|
| `web_search` | Search the web (Brave API, DuckDuckGo fallback) |
| `web_browse` | Visit a URL and extract content |
| `convert_to_markdown` | Convert HTML or other content to clean Markdown |

Research results should always be saved to Brain after use (see brain-protocol.md).

---

## File System

| Tool | When to Use |
|---|---|
| `list_files` | List files in a directory |
| `read_file` | Read a file's content |
| `write_file` | Write content to a file (creates or overwrites) |
| `delete_file` | Delete a file |
| `search_files` | Search file contents by pattern |

Used for: writing blog posts to `data/blog/`, reading docs, writing protocols to `docs/reports/`.

---

## Projects & Tracking

| Tool | When to Use |
|---|---|
| `create_project` | Create a new client or internal project |
| `list_projects` | List all projects with status |
| `get_project_status` | Get detailed status of one project |
| `update_project` | Update project status, description, or metadata |
| `log_project_output` | Log a deliverable or result to a project |

---

## Actions & Alerts

| Tool | When to Use |
|---|---|
| `create_pending_action` | Flag something that needs Augusto's attention |
| `list_pending_actions` | Show all unresolved pending actions |
| `dismiss_pending_action` | Mark an action as resolved |

---

## Platform Operations

| Tool | When to Use |
|---|---|
| `vps_exec` | Execute a shell command on the VPS via SSH |
| `log_improvement` | Log a suggested improvement to the platform |
| `generate_tool` | Generate a new coordinator tool from a description |
| `search_tools` | Search available tools by name or description |
| `install_tool` | Install a tool on VPS via SSH |

---

## Schedule & Meetings

| Tool | When to Use |
|---|---|
| `schedule_meeting` | Create a meeting on the calendar |

---

## How to Chain Tools (Common Patterns)

**Research and archive:**
```
web_search → web_browse → convert_to_markdown → vault_write
```

**Delegate and store:**
```
delegate_to_team → get_task_result → vault_write + log_project_output
```

**Complex multi-team work:**
```
create_plan → council_reason (optional) → [present to user] → run_plan → synthesize
```

**Flag for user attention:**
```
create_pending_action → (user reviews at /actions or in chat)
```

**Infrastructure check:**
```
vps_exec("docker compose ps") → vps_exec("docker logs dashboard --tail 50")
```
