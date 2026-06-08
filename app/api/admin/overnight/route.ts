/**
 * POST /api/admin/overnight
 * Queues and executes overnight knowledge-building tasks using local Ollama LLM.
 * Runs two task groups:
 *   - Dev Core: analyzes codebase modules → writes to docs/code/ → stores in Brain
 *   - Business: writes vision/service-tier docs → stores in Brain
 * Admin-only. Fire-and-forget (responds immediately, tasks run in background).
 */
export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { apiError } from "@/lib/api-error";
import { runLocalTask, ensureModel } from "@/lib/agents/local-runner";
import { ingestToBrain } from "@/lib/brain/ingest";
import { prisma } from "@/lib/prisma";
import fs from "fs";
import path from "path";

const MODEL = process.env.OLLAMA_OVERNIGHT_MODEL || "qwen2.5:7b";
const ROOT = process.cwd();

// Files the dev agent can read for context
const CODE_CONTEXT_FILES = [
  "lib/chat-tools.ts",
  "lib/agents/runner.ts",
  "lib/agents/delegated.ts",
  "lib/planner/dispatch.ts",
  "lib/brain/ingest.ts",
  "lib/brain/query.ts",
  "lib/brain/index.ts",
  "lib/notify/sse.ts",
  "app/api/chat/route.ts",
];

function readFileSafe(relPath: string, maxChars = 8000): string {
  try {
    const full = fs.readFileSync(path.join(ROOT, relPath), "utf-8");
    return full.length > maxChars ? full.slice(0, maxChars) + "\n\n[truncated — file continues]" : full;
  } catch {
    return `[file not found: ${relPath}]`;
  }
}

function buildDevContext(): string {
  return CODE_CONTEXT_FILES.map((f) => `### ${f}\n\`\`\`typescript\n${readFileSafe(f)}\n\`\`\``).join("\n\n");
}

// ── Overnight task definitions ────────────────────────────────────────────────

interface OvernightTask {
  id: string;
  title: string;
  group: "dev" | "business";
  outputDoc: string; // relative path for writing + Brain source
  systemPrompt: string;
  userPrompt: string;
}

const OVERNIGHT_TASKS: OvernightTask[] = [
  {
    id: "dev_chat_tools_doc",
    title: "Document: Chat Tools (lib/chat-tools.ts)",
    group: "dev",
    outputDoc: "docs/code/chat-tools.md",
    systemPrompt: `You are a senior developer writing technical documentation for an AI agent platform.
Your goal is to produce clear, navigable documentation for developers and AI agents.
Write in markdown. Be precise. No fluff. Cover: purpose, key functions, tool categories, data flow.`,
    userPrompt: `Here is the source code for lib/chat-tools.ts — the 30-tool library that the coordinator agent can call.
Write comprehensive developer documentation covering:
1. Purpose and role of this file
2. Complete tool catalog (group by category: brain, delegation, planning, web, communication, system)
3. For each tool: name, what it does, key parameters, return value
4. Important patterns: how tools auto-archive to Brain, how delegation works, the 25-iteration tool loop
5. Common usage examples (what the coordinator does to research + delegate + synthesize)

${readFileSafe("lib/chat-tools.ts", 12000)}`,
  },
  {
    id: "dev_coordinator_flow_doc",
    title: "Document: Coordinator Flow",
    group: "dev",
    outputDoc: "docs/code/coordinator-flow.md",
    systemPrompt: `You are a senior developer writing technical documentation for an AI agent platform.
Write clear markdown documentation for developer reference and AI agent context.`,
    userPrompt: `Document the coordinator + delegation + plan execution flow of this Next.js AI agent platform.

Key files (excerpts below):

### app/api/chat/route.ts (main coordinator entry)
${readFileSafe("app/api/chat/route.ts", 6000)}

### lib/agents/runner.ts (plan task runner)
${readFileSafe("lib/agents/runner.ts", 4000)}

### lib/agents/delegated.ts (team delegation runner)
${readFileSafe("lib/agents/delegated.ts", 4000)}

### lib/planner/dispatch.ts (plan dispatcher)
${readFileSafe("lib/planner/dispatch.ts", 3000)}

Write documentation covering:
1. What the coordinator is (Claude Sonnet as orchestrator)
2. The three execution paths: direct answer / delegate_to_team / create_plan+run_plan
3. How the 25-iteration tool loop works
4. How haiku/sonnet are used (coordinator vs workers)
5. SSE notifications flow
6. How task results return to the coordinator for synthesis`,
  },
  {
    id: "dev_brain_doc",
    title: "Document: Brain / Knowledge System",
    group: "dev",
    outputDoc: "docs/code/brain-system.md",
    systemPrompt: `You are a senior developer writing technical documentation for an AI agent platform.
Write clear markdown documentation covering architecture, data flow, and usage patterns.`,
    userPrompt: `Document the Brain (knowledge base) system.

### lib/brain/ingest.ts
${readFileSafe("lib/brain/ingest.ts", 4000)}

### lib/brain/query.ts
${readFileSafe("lib/brain/query.ts", 4000)}

### lib/brain/index.ts
${readFileSafe("lib/brain/index.ts", 3000)}

Cover:
1. Architecture: BrainDocument → BrainChunk → pgvector embeddings
2. Ingestion pipeline: chunking → SHA-256 dedup → nomic-embed-text → upsert
3. Query pipeline: embed query → cosine similarity → top-k chunks → re-rank
4. Source types and what each means (research, task-result, session-report, manual, vault-note)
5. Auto-archive protocols (P1 research, P2 task results, P3 session reports)
6. How agents use Brain context in chat (VAULT_CONTEXT_ENABLED injection)
7. Key env vars and configuration`,
  },
  {
    id: "business_vision_doc",
    title: "Business: Platform Vision & Strategy",
    group: "business",
    outputDoc: "docs/business/vision.md",
    systemPrompt: `You are a business strategy consultant helping a solo developer build an AI agent platform.
Write clear, concrete business documentation. Focus on actionable insights and positioning.
The audience is: the developer building and selling this platform, and future AI agents reading this as context.`,
    userPrompt: `Based on the following context about the AgentPlayground platform, write a comprehensive business vision document.

## Platform Overview
AgentPlayground is an AI agent coordinator platform hosted on a VPS. It lets users:
- Chat with a coordinator (Claude Sonnet) that delegates work to specialist agent teams
- Run automated plans with multiple agents working in parallel
- Store research, task results, and knowledge in a Brain (pgvector knowledge base)
- Manage personal life (CV, education, finances, fitness) through personal agent teams
- Host the platform for clients (each client gets their own coordinator + agent teams)

## Business Model
- SaaS platform hosted on a VPS (95.217.163.247)
- Likely subscription tiers: personal vs business vs enterprise
- Revenue: monthly subscriptions from platform users; optionally resell to clients
- Cost structure: VPS + Anthropic API tokens + Ollama local LLM (free for background tasks)

## Target Use Cases
1. Personal OS: manage CV, study topics, expenses, fitness with agent teams
2. Business platform: coordinator handles client comms, research, content creation, dev tasks
3. Client hosting: deploy agent teams for other businesses (SaaS reseller model)
4. AI lab: build and test custom agent workflows

## Tech Stack
Next.js 15 + PostgreSQL + pgvector + Docker on a Hetzner VPS.
Anthropic Claude (paid) for coordinator + planning.
Ollama + qwen2.5:7b (free, local) for background/overnight tasks.

Write:
1. Vision statement (2–3 sentences — what this platform becomes in 2 years)
2. Target customer segments with pain points each segment has
3. Value proposition for each segment
4. Pricing strategy: 3 tiers with suggested pricing in USD
5. Competitive positioning (vs Make.com, n8n, ChatGPT Teams)
6. Key risks and mitigations
7. 90-day priorities (what to build/launch first to get first paying customer)`,
  },
  {
    id: "business_service_tiers",
    title: "Business: Service Tiers & Client Offer",
    group: "business",
    outputDoc: "docs/business/service-tiers.md",
    systemPrompt: `You are a business consultant helping define a productized AI service offering.
Write practical, market-ready documentation. Include pricing, deliverables, and sales positioning.`,
    userPrompt: `Define the service tiers for AgentPlayground — an AI agent coordinator platform.

The platform capabilities:
- Coordinator chat (Claude Sonnet, 25-tool iterations, delegates to specialist teams)
- Agent teams: Dev, Business, Research, Content, Personal (CV, Education, Finance, Fitness)
- Brain knowledge base: stores research, task results, session reports, docs
- Plans system: multi-step automated workflows with parallel execution
- Telegram integration: bidirectional DMs + group notifications
- Admin panel: analytics, API monitor, credit management
- Onboarding wizard + custom team selection

The platform runs on a VPS with:
- Anthropic Claude API for coordinator (paid per token)
- Ollama + qwen2.5:7b for background tasks (free, local)

Design 3 service tiers:

**Personal** — for the individual user (developer, freelancer, student)
**Business** — for a small business owner or team
**Agency/White-label** — for someone hosting the platform for their own clients

For each tier include:
1. Target user
2. Included features (what they can access)
3. Agent teams included
4. API token budget (or pay-as-you-go)
5. Monthly price (USD)
6. Onboarding included
7. Sample use case (one concrete example)

Also write: a one-paragraph elevator pitch per tier for a sales page.`,
  },
  {
    id: "ops_protocol_catalog",
    title: "Ops: Local LLM Protocol Catalog",
    group: "dev",
    outputDoc: "docs/protocols/local-llm-catalog.md",
    systemPrompt: `You are documenting AI task protocols for an agent platform.
Write a clear markdown catalog that both developers and local AI agents can use as a reference.
Focus on: what task types can run locally, which model to use, and what the expected output looks like.`,
    userPrompt: `Document the local LLM optimization system for AgentPlayground.

## System Context
AgentPlayground runs two types of LLM calls:
1. Claude API (Sonnet/Haiku) — expensive, for complex reasoning, multi-tool orchestration
2. Ollama local LLMs (qwen2.5:0.5b, 1.5b, 7b) — free, for routine/structured tasks

## Task Classification Rules
Tasks that go to LOCAL (from lib/optimizer/classifier.ts):
${readFileSafe("lib/optimizer/classifier.ts", 4000)}

## Protocol Writer (auto-learns from usage):
${readFileSafe("lib/optimizer/protocol-writer.ts", 3000)}

Write a catalog covering:
1. Which task types can reliably run on each local model (with examples)
2. Task types that REQUIRE the API and why
3. How the classifier makes decisions (explain the signals)
4. How to write a good system prompt for a local model
5. Common mistakes that cause local tasks to fail
6. Decision guide: "should I use local or API for this task?"

Format as a practical reference that an AI agent can consult before routing a task.`,
  },
  {
    id: "ops_team_capabilities",
    title: "Ops: Agent Team Capabilities Reference",
    group: "dev",
    outputDoc: "docs/protocols/team-capabilities.md",
    systemPrompt: `You are documenting agent team capabilities for a multi-agent AI platform.
Write practical documentation for both human developers and AI agents routing tasks between teams.`,
    userPrompt: `Document all agent teams and their capabilities in AgentPlayground.

## Runner Tool Subsets (which tools each team category has access to):
${readFileSafe("lib/agents/runner.ts", 2000)}

## Delegated Runner Tool Subsets:
${readFileSafe("lib/agents/delegated.ts", 1500)}

Team categories and their tool access:
- dev: vps_exec, write_file, read_file, list_files, vault_write/search, web_search/browse
- research: web_search, web_browse, vault_write/search, read_file, list_files
- content: write_file, vault_write/search, web_search/browse
- ops: schedule_task, delegate_to_team, vault_write, web_search, query_data
- default: vault_search/write, web_search/browse, write_file, read_file
- all get: council_reason, save_memory, recall_memories

Write:
1. What each team category is good at (with concrete task examples)
2. What each team CANNOT do (missing tools = failed task)
3. How to phrase a task for each team to get the best result
4. When to use delegate_to_team vs create_plan+run_plan
5. A routing guide: "given this type of work, send it to X team"

Keep it actionable and specific — this is read by the Coordinator agent before routing.`,
  },
  {
    id: "ops_workflow_patterns",
    title: "Ops: Workflow Patterns & Best Practices",
    group: "dev",
    outputDoc: "docs/protocols/workflow-patterns.md",
    systemPrompt: `You are documenting proven workflow patterns for an AI agent coordinator platform.
Write practical, example-heavy documentation.`,
    userPrompt: `Document workflow patterns for AgentPlayground — a coordinator AI that delegates to specialist teams.

## Coordinator Flow:
${readFileSafe("app/api/chat/route.ts", 3000)}

## Council System (for decisions):
${readFileSafe("lib/council/index.ts", 3000)}

## Planner/Dispatcher:
${readFileSafe("lib/planner/dispatch.ts", 2000)}

Write documentation covering:
1. **Single delegation pattern**: when to use delegate_to_team (quick, one team, clear output)
2. **Multi-team plan pattern**: when to use create_plan (multiple teams, dependencies, parallel work)
3. **Research-then-act pattern**: web_search → vault_search → analyze → delegate
4. **Council-before-plan pattern**: council_reason → create_plan → run_plan
5. **Fast local pattern**: classify task → use local LLM → only escalate if fails
6. Example coordinator prompts for each pattern
7. Common failure patterns and how to avoid them

Format as a cookbook with concrete examples the coordinator can follow.`,
  },
];

// ── Background execution ───────────────────────────────────────────────────────

async function runOvernightTasks(tasks: OvernightTask[]): Promise<void> {
  console.log("[overnight] Starting overnight knowledge build...");

  const modelReady = await ensureModel(MODEL);
  if (!modelReady) {
    console.error(`[overnight] Model ${MODEL} not available — aborting`);
    await logActivity("overnight_failed", `Model ${MODEL} unavailable`);
    return;
  }

  // Ensure output dirs exist
  for (const dir of ["docs/code", "docs/business"]) {
    fs.mkdirSync(path.join(ROOT, dir), { recursive: true });
  }

  for (const task of tasks) {
    console.log(`[overnight] Running: ${task.title}`);
    await logActivity("overnight_task_start", task.title);

    const result = await runLocalTask({
      taskId: task.id,
      systemPrompt: task.systemPrompt,
      userPrompt: task.userPrompt,
      model: MODEL,
    });

    if (!result.success || !result.content) {
      console.error(`[overnight] Failed: ${task.id} — ${result.error}`);
      await logActivity("overnight_task_failed", `${task.title}: ${result.error}`);
      continue;
    }

    // Write to docs/
    const outputPath = path.join(ROOT, task.outputDoc);
    const header = `# ${task.title}\n> Generated by overnight agent (${MODEL}) on ${new Date().toISOString().split("T")[0]}\n\n`;
    fs.writeFileSync(outputPath, header + result.content, "utf-8");
    console.log(`[overnight] Wrote: ${task.outputDoc}`);

    // Ingest to Brain
    await ingestToBrain({
      content: result.content,
      title: task.title,
      source: `overnight:${task.id}`,
      sourceType: task.group === "dev" ? "manual" : "session-report",
      metadata: { group: task.group, model: MODEL, outputDoc: task.outputDoc },
    });

    await logActivity("overnight_task_done", task.title);
    console.log(`[overnight] Done: ${task.id}`);
  }

  await logActivity("overnight_complete", `${tasks.length} tasks completed`);
  console.log("[overnight] All overnight tasks complete.");
}

async function logActivity(type: string, message: string): Promise<void> {
  try {
    await prisma.activityLog.create({
      data: { action: message, type },
    });
  } catch { /* non-critical */ }
}

// ── Route handler ─────────────────────────────────────────────────────────────

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return apiError("Unauthorized", 401);
  if (session.user.role !== "admin") return apiError("Forbidden", 403);

  const body = await req.json().catch(() => ({})) as { groups?: string[] };
  const groups = body.groups ?? ["dev", "business"];

  const tasks = OVERNIGHT_TASKS.filter((t) => groups.includes(t.group));
  if (tasks.length === 0) return apiError("No tasks selected", 400);

  // Fire and forget — respond immediately
  runOvernightTasks(tasks).catch((err) =>
    console.error("[overnight] Uncaught:", err)
  );

  return NextResponse.json({
    message: `Queued ${tasks.length} overnight tasks (model: ${MODEL}). Check activity logs for progress.`,
    tasks: tasks.map((t) => ({ id: t.id, title: t.title, group: t.group, outputDoc: t.outputDoc })),
  });
}

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return apiError("Unauthorized", 401);
  if (session.user.role !== "admin") return apiError("Forbidden", 403);

  return NextResponse.json({
    tasks: OVERNIGHT_TASKS.map((t) => ({
      id: t.id,
      title: t.title,
      group: t.group,
      outputDoc: t.outputDoc,
    })),
    model: MODEL,
  });
}
