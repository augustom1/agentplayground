# Delegation Patterns — How Agents Work Together

> How the coordinator routes work. How teams receive tasks. How results flow back.
> Read this to understand the full task lifecycle.

---

## Pattern 1: Direct Answer

**When:** Coordinator has the information in its context or Brain.  
**No tools needed.**

```
User: "What is our Business tier pricing?"
Coordinator: reads business context from Brain → answers directly
```

Cost: ~$0.001 (input tokens only)  
Time: Instant

---

## Pattern 2: Single Team Delegation

**When:** One team can do the whole task.  
**Tools:** `delegate_to_team` → `get_task_result`

```
User: "Write me a client proposal for a web presence package"
Coordinator:
  1. delegate_to_team("Business & Growth", "Write proposal: [client context]")
  2. [Business team runs its own tool loop]
  3. get_task_result(taskId) — polls until complete
  4. Save result to Brain (auto-ingested)
  5. Present result to user
```

Cost: ~$0.01–0.05 per delegation (agent tool loop)  
Time: 10–60 seconds

### How Teams Receive Tasks

When `delegate_to_team` is called:
- A `Task` record is created in DB
- `runDelegatedTask(taskId)` is called on the team
- The team's lead agent runs with its system prompt + the task description + available skills
- Agent runs up to 20 tool iterations
- Result is saved to `TaskResult` table
- Auto-ingested to Brain if `VAULT_CONTEXT_ENABLED=true`

Teams do NOT have access to:
- The coordinator's conversation history
- Other active tasks
- Secrets or env vars

Teams DO have access to:
- All coordinator tools (same `chat-tools.ts`)
- Their own system prompt and skills
- Brain via `vault_search` and `recall_memories`

---

## Pattern 3: Multi-Team Plan

**When:** Task requires 2+ teams, or is too complex for one team's context window.  
**Tools:** `create_plan` → (optional: `council_reason`) → `run_plan`

```
User: "Build the /blog/generate feature"
Coordinator:
  1. create_plan("Build /blog/generate feature end-to-end")
     → buildPlan() creates Plan + PlanTasks in DB
     → Each task has: title, description, teamId, dependencies
  2. Present plan to user for approval (shown at /plans)
  3. User approves (or approves via chat: "looks good, run it")
  4. run_plan(planId)
     → dispatchPlan() runs tasks in parallel batches (respects dependencies)
     → Each task → delegate_to_team → runAgentTask()
     → Results accumulate in PlanTask records
  5. Coordinator polls for completion, synthesizes results
  6. Full plan result ingested to Brain
```

Cost: ~$0.05–0.50 per plan (multiple agent loops)  
Time: 1–5 minutes

### Plan Task Dependencies

Tasks in a plan can have dependencies:
- `dependencies: []` → runs immediately (batch 0)
- `dependencies: ["task-1"]` → waits for task-1 to complete first

The dispatcher batches tasks by dependency level and runs each batch in parallel.

---

## Pattern 4: Human Checkpoint

**When:** Agent needs a decision that only Augusto can make.  
**Tool:** `request_human_input`

```
Agent (mid-task):
  1. Hits a decision point: "Should I use Stripe or crypto billing for this client?"
  2. Calls request_human_input(question: "...", options: ["Stripe", "Crypto", "Both"])
  3. SSE event fires → browser shows checkpoint notification
  4. Telegram DM sent to Augusto
  5. Agent pauses and waits
  6. Augusto responds in chat → coordinator resumes agent with answer
```

Use sparingly — this blocks the entire task until answered.

---

## Local LLM vs. Claude Routing

When `runner.ts` runs a task, it classifies complexity:

| Confidence Score | Model Used | Cost |
|---|---|---|
| ≥ 72% | `qwen2.5:7b` via Ollama | $0 |
| < 72% | `claude-sonnet-4-6` or `claude-haiku-4-5` | $0.001–0.05 |

Confidence improves over time as Brain accumulates task patterns. The more work the system does, the more it routes to local LLMs.

High-confidence tasks (safe for Ollama):
- Text summarization
- Template filling (proposals, emails from templates)
- Classification (categorize this content, fit-score this job)
- Data formatting

Low-confidence tasks (need Claude):
- Complex code generation
- Multi-step reasoning
- Ambiguous instructions without clear structure
- Novel research synthesis

---

## Result Archival (Automatic)

After every `delegate_to_team` or `run_plan`:

```
Task result
    ↓
TaskResult record in DB
    ↓
evaluateAndWriteProtocol():
  - Was this task successful? → log to OptimizationScan
  - Is this a repeatable pattern? → write protocol to docs/reports/plans/
    ↓
ingestToBrain():
  - source: "task-result:[taskId]"
  - sourceType: "task-result"
  - content: task description + result summary
```

This happens automatically. Coordinator doesn't need to manually call ingest.

---

## Escalation Path

If a task fails or returns low-quality output:
1. Coordinator tries once more with more context
2. If still failing → `request_human_input` to Augusto
3. If it's a recurring failure → `log_improvement` to flag for platform improvement
4. If it's a code bug → `delegate_to_team("Dev Core", "Fix: [issue]")`

---

## Anti-Patterns (Don't Do These)

- Don't delegate when you can answer directly from Brain context
- Don't create a Plan for a single-team task (unnecessary overhead)
- Don't `request_human_input` for decisions the coordinator can make itself
- Don't chain too many dependent tasks in a plan — prefer parallel where possible
- Don't store raw LLM output in Brain — summarize and structure it first
