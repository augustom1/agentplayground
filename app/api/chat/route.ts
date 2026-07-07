export const dynamic = "force-dynamic";
import Anthropic from "@anthropic-ai/sdk";
import OpenAI from "openai";
import { CHAT_TOOLS, executeTool } from "@/lib/chat-tools";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { rateLimit, LIMITS } from "@/lib/rate-limit";
import { trackUsage } from "@/lib/usage-tracker";
import { retrieveMemories } from "@/lib/memory/retrieve";
import { evaluateAndWriteProtocol } from "@/lib/optimizer/protocol-writer";
import { searchVault, getDailyNotes, writeVaultNote } from "@/lib/brain";
import { getUserCredits, deductCredits } from "@/lib/credits";

// ─── API key resolver — env first, then AgentMemory ──────────────────────────
async function getEffectiveApiKey(name: string): Promise<string | undefined> {
  const envVal = process.env[name];
  if (envVal) return envVal;
  const mem = await prisma.agentMemory.findFirst({
    where: { ownerType: "system", ownerId: name },
    select: { content: true },
  });
  return mem?.content ?? undefined;
}

// ─── System Prompts ────────────────────────────────────────────────────────────

const BASE_SYSTEM = `You are the AgentPlayground AI — the core intelligence of a self-improving autonomous agent platform.

AgentPlayground's mission: run autonomous agents that execute tasks continuously, learn from repeated workflows, convert repetition into reusable tools, and reduce dependency on expensive external APIs over time.

## The Flywheel
Client Problem → Manual Solution → Agent System → Reusable Tool → Local Optimization → Scalable Product

## Core Principles
- **Automate over manual** — If a task is done more than once, it should become a tool
- **Local-first** — Prefer Ollama/local models for routine tasks; reserve Claude/external APIs for complex reasoning
- **Convert repetition to tools** — When you spot patterns, use log_improvement and generate_tool
- **Reliability over complexity** — Simple, working tools beat complex unfinished systems

## Your capabilities
- **Create agent teams** — Build teams of AI agents tailored to specific purposes
- **Create agents** — Add agents with specific roles, models, and capabilities
- **Create chatbots** — Set up conversational agents for customer service, support, or any domain
- **Register skills** — Define reusable capabilities that go into the tools catalog
- **Register CLI functions** — Set up commands agents can execute
- **Schedule tasks** — Add jobs to the calendar with optional recurrence
- **Web search & browse** — Research and monitor the web
- **Query data** — Look up any data in the system
- **Delegate tasks** — Assign work to teams as coordinator
- **Log improvements** — Record optimization opportunities and patterns you detect
- **Generate tools** — Convert repeated workflows into permanent, reusable skills

When a user describes what they need, proactively:
1. Ask clarifying questions only when necessary
2. Use your tools to make it happen immediately
3. If the task looks repetitive or could be automated, suggest converting it to a skill/tool
4. Confirm what was created and suggest the next logical step in the flywheel

Be concise and direct. Use ✓ for successes. Format responses cleanly with markdown.`;

const COORDINATOR_INTRO = `You are the **Playground Keeper** — the central intelligence of this Agent Playground. You are the ONLY agent the user needs to talk to. Everything flows through you. You have up to 25 reasoning steps to complete any task.

## Responsibilities
1. **Understand intent** — Is this a one-time task, recurring operation, or lasting project?
2. **Create projects** — For multi-step goals, use create_project (auto-creates Brain folder Projects/<name>/).
3. **Plan & approve** — Use create_plan to draft a multi-team execution plan. The council reviews it. Then run_plan to execute (approves + dispatches all tasks in parallel). Use run_plan + get_task_result to synthesize outputs.
4. **Delegate instantly** — For a single well-defined task, use delegate_to_team directly. It executes a full agent tool loop (10 iterations, scoped to the team's tools) and returns the result.
5. **Manage the system** — Create teams, agents, skills. New teams auto-create Brain folders at Teams/<name>/.
6. **Log outputs** — Use log_project_output to record what was produced.
7. **Research** — Use web_search and web_browse proactively. Always search the vault first (vault_search).
8. **Suggest next steps** — After every task, suggest the logical next action.

## Full Tool Catalog
**Delegation & Plans**
- delegate_to_team(teamId, title, description) → executes immediately, returns full result
- create_plan(goal, context?) → council-reviewed plan with tasks per team
- run_plan(planId) → auto-approves + dispatches all plan tasks in parallel
- get_task_result(taskId) → read a task or plan-task result

**Business Skills** (activate by telling an agent to use the skill, or apply directly)
- Invoice Generator — create invoices from project/time data
- CRM Contact Manager — track contacts + deal stages in the vault
- Proposal Writer — draft client proposals with scope, timeline, pricing
- Client Onboarding — set up new clients: project folder + kickoff
- Project Status Reporter — RAG status reports from vault + tasks
- Meeting Summarizer — structured summary + action items from transcripts
- Sales Email Writer — personalized outreach, follow-ups, sequences
- Support Ticket Handler — triage, vault lookup, draft replies

**Design & UX**
- UI/UX Pro Max skill — expert design analysis + Tailwind code generation

**Files & Documents**
- Files uploaded as .xlsx/.docx/.pptx/.pdf/.csv are auto-converted to Markdown via MarkItDown and indexed in the Brain automatically — no manual step needed.
- convert_to_markdown(filePath, saveToVault?) — manual conversion if needed

**Brain / Vault**
- vault_search(query) — semantic search across all vault notes
- vault_read(path) — read a specific note
- vault_write(path, content, tags?) — write or update a note

**VPS / Code Execution**
- vps_exec(command) — runs any shell command on the production VPS via SSH. Use for: file operations, Python scripts, docker commands, deployments. Timeout: 30s. Dangerous commands ask for confirmation.
- council_reason(question, perspectives?) — multi-agent deliberation for complex decisions

**Web**
- web_search(query, maxResults?) — DuckDuckGo search
- web_browse(url) — read a webpage

**Memory**
- save_memory(key, value, category?) — store a fact in long-term memory
- recall_memories(query) — retrieve relevant memories

**System Management**
- create_team, create_agent, add_skill, add_cli_function
- schedule_task, schedule_meeting
- create_project, list_projects, log_project_output

## Brain Integration
- Team brain: Teams/<team-name>/ — work logs, config, outputs
- Project brain: Projects/<project-name>/ — briefs, notes, deliverables
- Task plans: plans/<task-id>.md — agents read before starting
- Meetings: Meetings/<date>-<topic>.md — summaries + action items
- CRM: CRM/Contacts/<name>.md — contacts + deal history
- Always vault_search before answering domain questions; vault_write to log results

## Decision Framework
| Situation | Action |
|---|---|
| Single clear task | delegate_to_team directly |
| Complex single task | plan_task → delegate_to_team |
| Multi-team goal | create_plan → run_plan → get_task_result × N → synthesize |
| Ongoing project | create_project → recurring tasks |
| New client | Client Onboarding skill → CRM log → kickoff meeting |
| Uploaded Office file | Auto-indexed — confirm and offer to summarize |
| Repeated workflow | Suggest converting to a registered skill |

## External Access
- Claude Desktop and other MCP clients can call your tools via /api/mcp. Treat those requests as if the user typed them.
- API Monitor tracks all external clients. Check /admin/api-monitor to see who's calling.

## Behavior
- Start with action, not explanation. Use ✓ for completed actions.
- Be concise. If you take more than 3 tool calls, briefly narrate what you're doing.
- After delegation, always report back: what the team produced, not just "delegated".
- If a task could become a reusable skill/tool, say so.`;

// ─── Context builders ──────────────────────────────────────────────────────────

async function buildCoordinatorContext(): Promise<string> {
  const [teams, projects, memoryContext] = await Promise.all([
    prisma.agentTeam.findMany({
      where: { isSystemTeam: false },
      include: {
        agents: { select: { id: true, name: true, model: true, capabilities: true, description: true } },
        skills: { select: { name: true, category: true, description: true } },
        _count: { select: { tasks: true } },
      },
      take: 20,
    }),
    prisma.project.findMany({
      where: { status: { not: "archived" } },
      orderBy: { updatedAt: "desc" },
      take: 10,
    }),
    retrieveMemories("keeper", "system", 10),
  ]);

  const sections: string[] = [COORDINATOR_INTRO];

  if (memoryContext) {
    sections.push(memoryContext);
  }

  if (projects.length > 0) {
    const projectList = projects
      .map((p) => `- **${p.name}** [${p.status}] (${p.type}) — ID: ${p.id}${p.description ? `\n  ${p.description}` : ""}`)
      .join("\n");
    sections.push(`## Active Projects\n${projectList}`);
  } else {
    sections.push("## Active Projects\nNo projects yet. Create one with create_project when the user describes a goal.");
  }

  if (teams.length === 0) {
    sections.push("## Agent Teams\nNo teams yet. Create teams to handle specific types of work.");
  } else {
    const teamList = teams
      .map((t) => {
        const slug = t.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 40);
        const agentNames = t.agents.map((a) => `${a.name} (${a.model})`).join(", ") || "no agents";
        const skillNames = t.skills.map((s) => s.name).join(", ") || "no skills";
        return `### ${t.name} [ID: ${t.id}]\n- Status: ${t.status} · ${t.agents.length} agents · ${t._count.tasks} tasks\n- Brain folder: Teams/${slug}/\n- Agents: ${agentNames}\n- Skills: ${skillNames}`;
      })
      .join("\n\n");
    sections.push(`## Agent Teams\n${teamList}`);
  }

  // Include pending task plans count
  try {
    const pendingTaskCount = await prisma.task.count({ where: { status: "pending" } });
    const planCount = await prisma.vaultNote.count({ where: { path: { startsWith: "plans/" } } });
    if (pendingTaskCount > 0) {
      sections.push(`## Task Queue\n- ${pendingTaskCount} pending task(s)\n- ${planCount} have execution plans in Brain (plans/ folder)\n- Use plan_task to generate plans for complex tasks before delegating`);
    }
  } catch { /* non-fatal */ }

  // Include upcoming meetings within the next 24 hours
  try {
    const now = new Date();
    const in24h = new Date(now.getTime() + 24 * 60 * 60 * 1000);
    const upcomingMeetings = await prisma.meeting.findMany({
      where: { scheduledFor: { gte: now, lte: in24h }, status: "upcoming" },
      orderBy: { scheduledFor: "asc" },
      take: 5,
    });
    if (upcomingMeetings.length > 0) {
      type Participant = { type: string; name: string; teamName?: string };
      const meetingList = upcomingMeetings.map((m) => {
        const when = m.scheduledFor.toLocaleString(undefined, { weekday: "short", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
        const parts = Array.isArray(m.participants) ? (m.participants as Participant[]).map((p) => p.name).join(", ") : "";
        const inMinutes = Math.round((m.scheduledFor.getTime() - now.getTime()) / 60000);
        const timeNote = inMinutes <= m.reminderMins ? ` STARTING IN ${inMinutes} MIN` : "";
        return `- **${m.title}** at ${when}${timeNote}${parts ? ` — with: ${parts}` : ""}`;
      }).join("\n");
      sections.push(`## Upcoming Meetings (next 24h)\n${meetingList}\n\nProactively mention these if relevant. Use schedule_meeting to create new ones.`);
    }
  } catch { /* non-fatal */ }

  return sections.join("\n\n");
}

async function buildTeamContext(teamId: string): Promise<string> {
  const team = await prisma.agentTeam.findUnique({
    where: { id: teamId },
    include: {
      agents: true,
      skills: true,
      cliFunctions: true,
    },
  });

  if (!team) return "";

  const agentList =
    team.agents
      .map(
        (a) =>
          `- **${a.name}** | ${a.model} | ${a.description || "No description"} | Capabilities: ${a.capabilities.join(", ") || "none"}`
      )
      .join("\n") || "No agents yet.";

  const skillList =
    team.skills.map((s) => `- ${s.name} (${s.category}): ${s.description}`).join("\n") ||
    "No skills yet.";

  const cliFnList =
    team.cliFunctions
      .map((f) => `- ${f.name}: \`${f.command}\`${f.dangerous ? " (dangerous)" : ""}`)
      .join("\n") || "No CLI functions.";

  const slug = team.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 40);

  return `You are the AI coordinator for the **${team.name}** team (ID: ${team.id}).

## Team Overview
- Runtime: ${team.language} · Port: ${team.port} · Status: ${team.status}
- ${team.description || "No description"}
- Brain folder: Teams/${slug}/ — write outputs and logs here with vault_write
- Task plans: Check plans/<taskId>.md in the Brain before starting any delegated task

## Agents
${agentList}

## Skills
${skillList}

## CLI Functions
${cliFnList}

When working on tasks: (1) search the vault first for relevant context, (2) read the plan file if one exists, (3) execute steps, (4) write results to Teams/${slug}/ in the Brain.
Use the team ID above when calling tools that modify this team.`;
}

// ─── Provider streaming functions ─────────────────────────────────────────────

async function streamAnthropic(
  messages: Array<{ role: "user" | "assistant"; content: string }>,
  model: string,
  systemPrompt: string,
  controller: ReadableStreamDefaultController,
  encoder: TextEncoder
): Promise<{ inputTokens: number; outputTokens: number; webSearchCalls: number; webBrowseCalls: number; responseText: string; toolsUsed: string[] }> {
  const apiKey = await getEffectiveApiKey("ANTHROPIC_API_KEY");
  if (!apiKey) {
    controller.enqueue(encoder.encode("No Anthropic API key found. Go to **Settings → API Keys** to add yours, or select a different model."));
    return { inputTokens: 0, outputTokens: 0, webSearchCalls: 0, webBrowseCalls: 0, responseText: "", toolsUsed: [] };
  }

  const client = new Anthropic({ apiKey });
  const tools = CHAT_TOOLS.map((t) => ({
    name: t.name,
    description: t.description,
    input_schema: t.input_schema,
  }));

  let currentMessages = [...messages];
  let continueLoop = true;
  let iterations = 0;
  const MAX_TOOL_ITERATIONS = 25; // coordinator needs depth for plan+delegate+synthesize
  let totalInputTokens = 0;
  let totalOutputTokens = 0;
  let totalWebSearchCalls = 0;
  let totalWebBrowseCalls = 0;
  let accumulatedText = "";
  const usedTools: string[] = [];

  try {
    while (continueLoop && iterations < MAX_TOOL_ITERATIONS) {
      iterations++;
      const response = await client.messages.create({
        model,
        max_tokens: 4096,
        system: systemPrompt,
        messages: currentMessages,
        tools: tools as Anthropic.Messages.Tool[],
      });

      totalInputTokens += response.usage?.input_tokens ?? 0;
      totalOutputTokens += response.usage?.output_tokens ?? 0;
      continueLoop = false;

      for (const block of response.content) {
        if (block.type === "text") {
          controller.enqueue(encoder.encode(block.text));
          accumulatedText += block.text;
        } else if (block.type === "tool_use") {
          if (block.name === "web_search") totalWebSearchCalls++;
          else if (block.name === "web_browse") totalWebBrowseCalls++;
          if (!usedTools.includes(block.name)) usedTools.push(block.name);
          const result = await executeTool(block.name, block.input as Record<string, unknown>);
          controller.enqueue(encoder.encode(`\n\n⚡ *Used tool: ${block.name}*\n\n`));

          currentMessages = [
            ...currentMessages,
            { role: "assistant" as const, content: response.content as unknown as string },
            {
              role: "user" as const,
              content: [
                { type: "tool_result", tool_use_id: block.id, content: result },
              ] as unknown as string,
            },
          ];
          continueLoop = true;
        }
      }

      if (response.stop_reason === "end_turn") continueLoop = false;
    }

    if (iterations >= MAX_TOOL_ITERATIONS) {
      controller.enqueue(encoder.encode("\n\n*Max tool iterations reached.*"));
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("credit_balance_too_low") || msg.includes("credit balance is too low")) {
      controller.enqueue(encoder.encode(
        "**Insufficient Anthropic credits.**\n\nPlease add credits at [console.anthropic.com → Billing](https://console.anthropic.com/settings/billing).\n\nOr switch to **Ollama** in the model selector to run models locally for free."
      ));
    } else if (msg.includes("invalid_api_key") || msg.includes("authentication")) {
      controller.enqueue(encoder.encode("Your Anthropic API key appears to be invalid. Go to **Settings → API Keys** to update it."));
    } else {
      controller.enqueue(encoder.encode(`Error: ${msg}`));
    }
  }

  return { inputTokens: totalInputTokens, outputTokens: totalOutputTokens, webSearchCalls: totalWebSearchCalls, webBrowseCalls: totalWebBrowseCalls, responseText: accumulatedText, toolsUsed: usedTools };
}

// OpenAI-compatible endpoints (NVIDIA NIM etc.) reuse the OpenAI tool loop with a
// different base URL + key. NVIDIA: free key from build.nvidia.com, ~40 req/min.
type OpenAICompat = { keyName: string; baseURL?: string; label: string; missingKeyMsg: string };

const NVIDIA_COMPAT: OpenAICompat = {
  keyName: "NVIDIA_API_KEY",
  baseURL: "https://integrate.api.nvidia.com/v1",
  label: "NVIDIA",
  missingKeyMsg:
    "No NVIDIA API key found. Get a free one at [build.nvidia.com](https://build.nvidia.com) (no credit card), then add it in **Settings → API Keys**.",
};

async function streamOpenAI(
  messages: Array<{ role: "user" | "assistant"; content: string }>,
  model: string,
  systemPrompt: string,
  controller: ReadableStreamDefaultController,
  encoder: TextEncoder,
  compat?: OpenAICompat
) {
  const keyName = compat?.keyName ?? "OPENAI_API_KEY";
  const label = compat?.label ?? "OpenAI";
  const apiKey = await getEffectiveApiKey(keyName);
  if (!apiKey) {
    controller.enqueue(
      encoder.encode(
        compat?.missingKeyMsg ??
          "No OpenAI API key found. Go to **Settings → API Keys** to add yours, or switch to Anthropic Claude."
      )
    );
    return;
  }

  const client = new OpenAI({ apiKey, baseURL: compat?.baseURL });

  // Convert CHAT_TOOLS (Anthropic format) to OpenAI function calling format
  const tools: OpenAI.Chat.Completions.ChatCompletionTool[] = CHAT_TOOLS.map((t) => ({
    type: "function" as const,
    function: {
      name: t.name,
      description: t.description,
      parameters: t.input_schema,
    },
  }));

  let currentMessages: OpenAI.Chat.Completions.ChatCompletionMessageParam[] = [
    { role: "system", content: systemPrompt },
    ...messages,
  ];

  let continueLoop = true;
  let iterations = 0;
  const MAX_TOOL_ITERATIONS = 10;

  try {
    while (continueLoop && iterations < MAX_TOOL_ITERATIONS) {
      iterations++;
      continueLoop = false;

      const response = await client.chat.completions.create({
        model,
        max_tokens: 4096,
        messages: currentMessages,
        tools,
        tool_choice: "auto",
        stream: false,
      });

      const choice = response.choices[0];
      const assistantMessage = choice.message;

      // Stream out any text content
      if (assistantMessage.content) {
        controller.enqueue(encoder.encode(assistantMessage.content));
      }

      // Handle tool calls
      if (choice.finish_reason === "tool_calls" && assistantMessage.tool_calls?.length) {
        // Append the assistant message (with tool_calls) to history
        currentMessages = [...currentMessages, assistantMessage];

        const toolResultMessages: OpenAI.Chat.Completions.ChatCompletionToolMessageParam[] = [];

        type FnToolCall = { id: string; type: string; function: { name: string; arguments: string } };
        for (const toolCall of (assistantMessage.tool_calls as FnToolCall[])) {
          const toolName = toolCall.function.name;
          let toolInput: Record<string, unknown> = {};
          try {
            toolInput = JSON.parse(toolCall.function.arguments) as Record<string, unknown>;
          } catch {
            toolInput = {};
          }

          const result = await executeTool(toolName, toolInput);
          controller.enqueue(encoder.encode(`\n\n⚡ *Used tool: ${toolName}*\n\n`));

          toolResultMessages.push({
            role: "tool",
            tool_call_id: toolCall.id,
            content: result,
          });
        }

        // Append all tool results and continue the loop
        currentMessages = [...currentMessages, ...toolResultMessages];
        continueLoop = true;
      }
    }

    if (iterations >= MAX_TOOL_ITERATIONS) {
      controller.enqueue(encoder.encode("\n\n*Max tool iterations reached.*"));
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (compat && /tool/i.test(msg) && (msg.includes("400") || /not support/i.test(msg))) {
      // Some models on OpenAI-compatible catalogs (NVIDIA NIM) reject the tools param —
      // fall back to a plain completion so the user still gets an answer.
      try {
        const plain = await client.chat.completions.create({
          model,
          max_tokens: 4096,
          messages: [{ role: "system", content: systemPrompt }, ...messages],
          stream: false,
        });
        const text = plain.choices[0]?.message?.content ?? "";
        controller.enqueue(encoder.encode(text || `${label} returned an empty response.`));
        controller.enqueue(encoder.encode(`\n\n*Note: this model doesn't support tools — answered directly.*`));
        return;
      } catch {
        // fall through to the generic error below
      }
    }
    if (msg.includes("invalid_api_key") || msg.includes("Incorrect API key") || msg.includes("401") || (compat && msg.includes("403")) || /unauthorized/i.test(msg)) {
      controller.enqueue(encoder.encode(`Your ${label} API key appears to be invalid. Go to **Settings → API Keys** to update it.`));
    } else if (msg.includes("rate_limit_exceeded") || msg.includes("Rate limit") || msg.includes("429")) {
      controller.enqueue(encoder.encode(`${label} rate limit exceeded. Please wait a moment and try again.`));
    } else if (msg.includes("model_not_found") || msg.includes("does not exist") || msg.includes("404")) {
      controller.enqueue(encoder.encode(`Model "${model}" not found. Check your ${label} model name.`));
    } else {
      controller.enqueue(encoder.encode(`${label} error: ${msg}`));
    }
  }
}

async function streamOllama(
  messages: Array<{ role: "user" | "assistant"; content: string }>,
  model: string,
  systemPrompt: string,
  controller: ReadableStreamDefaultController,
  encoder: TextEncoder
) {
  const baseUrl = process.env.OLLAMA_BASE_URL || "http://ollama:11434";

  // Tools in OpenAI/Ollama function-calling format
  const tools = CHAT_TOOLS.map((t) => ({
    type: "function" as const,
    function: {
      name: t.name,
      description: t.description,
      parameters: t.input_schema,
    },
  }));

  type OllamaMessage = { role: string; content: string | null; tool_calls?: unknown[] };
  let currentMessages: OllamaMessage[] = [
    { role: "system", content: systemPrompt },
    ...messages,
  ];

  let continueLoop = true;
  let iterations = 0;
  const MAX_TOOL_ITERATIONS = 10;

  try {
    while (continueLoop && iterations < MAX_TOOL_ITERATIONS) {
      iterations++;
      continueLoop = false;

      const res = await fetch(`${baseUrl}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model, messages: currentMessages, tools, stream: false }),
        signal: AbortSignal.timeout(120000),
      });

      if (!res.ok) {
        const errText = await res.text().catch(() => "");
        // If tools param caused an error (model doesn't support tools), retry without tools
        if (res.status === 400 && errText.includes("tool")) {
          const fallback = await fetch(`${baseUrl}/api/chat`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ model, messages: currentMessages, stream: true }),
            signal: AbortSignal.timeout(60000),
          });
          if (!fallback.ok) {
            controller.enqueue(encoder.encode(`Ollama error (${fallback.status}). Make sure Ollama is running at ${baseUrl} and the model "${model}" is pulled.`));
            return;
          }
          const reader = fallback.body!.getReader();
          const decoder = new TextDecoder();
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            for (const line of decoder.decode(value).split("\n")) {
              if (!line.trim()) continue;
              try { const p = JSON.parse(line); if (p.message?.content) controller.enqueue(encoder.encode(p.message.content)); } catch {}
            }
          }
          return;
        }
        controller.enqueue(encoder.encode(`Ollama error (${res.status}). Make sure Ollama is running at ${baseUrl} and the model "${model}" is pulled.`));
        return;
      }

      type OllamaResponse = { message: { role: string; content: string | null; tool_calls?: Array<{ function: { name: string; arguments: unknown } }> }; done: boolean };
      const data = await res.json() as OllamaResponse;
      const assistantMessage = data.message;

      if (assistantMessage.content) {
        controller.enqueue(encoder.encode(assistantMessage.content));
      }

      if (assistantMessage.tool_calls?.length) {
        currentMessages = [...currentMessages, assistantMessage as OllamaMessage];

        for (const toolCall of assistantMessage.tool_calls) {
          const toolName = toolCall.function.name;
          const toolInput = typeof toolCall.function.arguments === "string"
            ? JSON.parse(toolCall.function.arguments) as Record<string, unknown>
            : toolCall.function.arguments as Record<string, unknown>;

          const result = await executeTool(toolName, toolInput);
          controller.enqueue(encoder.encode(`\n\n⚡ *Used tool: ${toolName}*\n\n`));

          currentMessages = [...currentMessages, { role: "tool", content: result }];
        }

        continueLoop = true;
      }
    }

    if (iterations >= MAX_TOOL_ITERATIONS) {
      controller.enqueue(encoder.encode("\n\n*Max tool iterations reached.*"));
    }
  } catch (err) {
    controller.enqueue(encoder.encode(`Cannot reach Ollama at ${baseUrl}. Make sure the service is running.\n\nError: ${String(err)}`));
  }
}

// ─── Route handler ─────────────────────────────────────────────────────────────

export async function POST(req: Request) {
  // Auth check
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) {
    return new Response("Unauthorized", { status: 401 });
  }

  // Rate limiting: 20 messages/min per user
  const rl = rateLimit(`chat:${userId}`, LIMITS.chat.limit, LIMITS.chat.windowMs);
  if (!rl.allowed) {
    return new Response(
      `Rate limit exceeded. Try again in ${rl.retryAfter}s.`,
      { status: 429, headers: { "Retry-After": String(rl.retryAfter) } }
    );
  }

  type AttachmentPayload =
    | { type: "image"; base64: string; mimeType: string; filename?: string }
    | { type: "text"; content: string; filename: string };

  let messages: Array<{ role: "user" | "assistant"; content: string | unknown[] }>;
  let systemContext: string | undefined;
  let provider: string;
  let model: string | undefined;
  let teamId: string | undefined;
  let attachments: AttachmentPayload[] | undefined;

  let bodyProviderSet = false;
  let bodyModelSet = false;
  try {
    const body = await req.json();
    messages = body.messages ?? [];
    systemContext = body.systemContext;
    bodyProviderSet = !!body.provider;
    bodyModelSet = !!body.model;
    provider = body.provider ?? "anthropic";
    model = body.model;
    teamId = body.teamId;
    attachments = body.attachments;
  } catch {
    return new Response("Invalid JSON body", { status: 400 });
  }

  // Apply user's DEFAULT_PROVIDER / DEFAULT_MODEL from settings when not overridden per-request
  if (!bodyProviderSet || !bodyModelSet) {
    try {
      const [defProv, defModel] = await Promise.all([
        !bodyProviderSet ? prisma.agentMemory.findFirst({ where: { ownerType: "system", ownerId: "DEFAULT_PROVIDER" }, select: { content: true } }) : Promise.resolve(null),
        !bodyModelSet ? prisma.agentMemory.findFirst({ where: { ownerType: "system", ownerId: "DEFAULT_MODEL" }, select: { content: true } }) : Promise.resolve(null),
      ]);
      if (!bodyProviderSet && defProv?.content) provider = defProv.content;
      if (!bodyModelSet && defModel?.content) model = defModel.content;
    } catch { /* non-fatal */ }
  }

  // Inject attachments into the last user message (Anthropic multi-modal format)
  if (attachments && attachments.length > 0 && messages.length > 0) {
    const lastMsg = messages[messages.length - 1];
    if (lastMsg.role === "user") {
      const contentBlocks: Array<Record<string, unknown>> = [];

      for (const att of attachments) {
        if (att.type === "image") {
          contentBlocks.push({
            type: "image",
            source: { type: "base64", media_type: att.mimeType, data: att.base64 },
          });
        } else if (att.type === "text") {
          contentBlocks.push({
            type: "text",
            text: `[Attached file: ${att.filename}]\n\n${att.content}`,
          });
        }
      }

      contentBlocks.push({ type: "text", text: lastMsg.content as string });
      (messages[messages.length - 1] as { role: string; content: unknown }).content = contentBlocks;
    }
  }

  // Build system prompt
  let systemPrompt = BASE_SYSTEM;

  if (teamId === "coordinator") {
    const coordinatorContext = await buildCoordinatorContext();
    systemPrompt = `${BASE_SYSTEM}\n\n${coordinatorContext}`;
  } else if (teamId && teamId !== "all") {
    const teamContext = await buildTeamContext(teamId);
    if (teamContext) {
      systemPrompt = `${BASE_SYSTEM}\n\n## Active Team Context\n${teamContext}`;
    }
  }

  if (systemContext) {
    systemPrompt = `${systemPrompt}\n\n## Additional Context\n${systemContext}`;
  }

  // A5: Vault context injection — only when enabled and for Anthropic provider
  if (process.env.VAULT_CONTEXT_ENABLED === "true" && provider === "anthropic" && messages.length > 0) {
    const lastUserMsg = [...messages].reverse().find((m) => m.role === "user");
    const query = typeof lastUserMsg?.content === "string" ? lastUserMsg.content : "";
    if (query) {
      const [vaultResult, dailyResult] = await Promise.allSettled([
        searchVault(query, 5),
        getDailyNotes(3),
      ]);
      const vaultNotes = vaultResult.status === "fulfilled" ? vaultResult.value : [];
      const dailyNotes = dailyResult.status === "fulfilled" ? dailyResult.value : [];

      if (vaultNotes.length > 0) {
        const noteList = vaultNotes
          .map((n) => `### ${n.title} (${n.path})\n${n.content}`)
          .join("\n\n---\n\n");
        systemPrompt += `\n\n## Relevant Vault Context\n${noteList}`;
      }
      if (dailyNotes.length > 0) {
        const dailyList = dailyNotes
          .map((n) => `### ${n.title}\n${n.content}`)
          .join("\n\n---\n\n");
        systemPrompt += `\n\n## Recent Daily Notes\n${dailyList}`;
      }
    }
  }

  const encoder = new TextEncoder();

  // Default models per provider
  const defaultModels: Record<string, string> = {
    anthropic: "claude-sonnet-4-6",
    openai: "gpt-4o",
    ollama: "qwen2.5:7b",
    nvidia: "meta/llama-3.1-8b-instruct",
  };
  const resolvedModel = model || defaultModels[provider] || "claude-sonnet-4-6";

  // Credit gate — Anthropic only, admin-exempt
  if (provider === "anthropic") {
    const userRole = (session?.user as { role?: string })?.role;
    if (userRole !== "admin") {
      const { balance } = await getUserCredits(userId);
      if (balance <= 0) {
        return new Response(
          JSON.stringify({ error: "No credits remaining. Top up at /billing.", code: "insufficient_credits" }),
          { status: 402, headers: { "Content-Type": "application/json" } }
        );
      }
    }
  }

  const readable = new ReadableStream({
    async start(controller) {
      try {
        if (provider === "openai") {
          await streamOpenAI(messages, resolvedModel, systemPrompt, controller, encoder);
        } else if (provider === "nvidia") {
          await streamOpenAI(messages, resolvedModel, systemPrompt, controller, encoder, NVIDIA_COMPAT);
        } else if (provider === "ollama") {
          await streamOllama(messages, resolvedModel, systemPrompt, controller, encoder);
        } else {
          const usage = await streamAnthropic(messages, resolvedModel, systemPrompt, controller, encoder);
          // Append usage sentinel for frontend token counter
          if (usage.inputTokens > 0 || usage.outputTokens > 0) {
            const usagePayload = JSON.stringify({ input: usage.inputTokens, output: usage.outputTokens, model: resolvedModel });
            controller.enqueue(encoder.encode(`\n[USAGE:${usagePayload}]`));
          }
          // Track real token usage (fire-and-forget, non-fatal)
          trackUsage({
            userId,
            service: "claude",
            endpoint: resolvedModel,
            inputUnits: usage.inputTokens,
            outputUnits: usage.outputTokens,
            unitType: "tokens",
          }).catch(() => {});
          if (usage.webSearchCalls > 0) {
            trackUsage({ userId, service: "web_search", units: usage.webSearchCalls, unitType: "calls" }).catch(() => {});
          }
          if (usage.webBrowseCalls > 0) {
            trackUsage({ userId, service: "web_browse", units: usage.webBrowseCalls, unitType: "calls" }).catch(() => {});
          }
          // Deduct credits (fire-and-forget)
          if (usage.inputTokens > 0) {
            deductCredits(userId, resolvedModel, usage.inputTokens, usage.outputTokens).catch(() => {});
          }
          // A6: Session write-back to vault daily note (fire-and-forget)
          if (process.env.VAULT_CONTEXT_ENABLED === "true" && usage.responseText) {
            const today = new Date().toISOString().split("T")[0];
            const lastMsg = [...messages].reverse().find((m) => m.role === "user");
            const userText = typeof lastMsg?.content === "string" ? lastMsg.content.slice(0, 200) : "";
            const toolNote = usage.toolsUsed.length > 0 ? `\nTools: ${usage.toolsUsed.join(", ")}` : "";
            const entry = `\n## ${new Date().toISOString()} — Chat\n**User:** ${userText}\n**Assistant:** ${usage.responseText.slice(0, 200)}...${toolNote}\n`;
            writeVaultNote(`daily/${today}.md`, entry, true).catch(() => {});
          }

          // Fire-and-forget: evaluate if this task could be done by a local LLM
          if (usage.inputTokens > 0 && usage.responseText && messages.length > 0) {
            const lastUserMsg = [...messages].reverse().find((m) => m.role === "user");
            if (lastUserMsg) {
              evaluateAndWriteProtocol({
                userId,
                userPrompt: lastUserMsg.content,
                assistantResponse: usage.responseText,
                toolsUsed: usage.toolsUsed,
                inputTokens: usage.inputTokens,
                outputTokens: usage.outputTokens,
              }).catch(() => {}); // intentionally non-blocking
            }
          }
        }
      } catch (err) {
        controller.enqueue(encoder.encode(`\n\nError: ${String(err)}`));
      } finally {
        controller.close();
      }
    },
  });

  return new Response(readable, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
