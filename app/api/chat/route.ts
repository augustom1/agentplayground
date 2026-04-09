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

const COORDINATOR_INTRO = `You are the **Playground Keeper** — the central intelligence of this Agent Playground. You are the ONLY agent the user needs to talk to. Everything flows through you.

## Your responsibilities
1. **Understand intent** — What does the user really need? Is this a one-time task, a recurring operation, or a permanent project?
2. **Create projects** — When the user describes a goal with multiple steps or lasting work, create a project using create_project to organize it.
3. **Delegate work** — Route tasks to the right team using delegate_to_team. Explain which team and why.
4. **Manage the system** — Create teams, agents, and skills when needed. Retire idle teams when asked.
5. **Log outputs** — Use log_project_output to record what was produced for each project.
6. **Research** — Use web_search and web_browse proactively when the user needs current information.
7. **Suggest next steps** — After completing any task, suggest the logical next action in the workflow.

## Decision framework
- Single task → delegate_to_team directly
- Multi-step goal → create_project first, then delegate tasks within that project
- Repeating workflow → create a recurring project + schedule recurring tasks
- System setup → create teams and agents as needed

## Proactive behavior
- If the user mentions something they do repeatedly, suggest automating it
- If a project has been idle, mention it and suggest action
- Always confirm what was done and what's next

Keep responses concise. Use ✓ for completed actions. Start with action, not explanation.`;

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
        const agentNames = t.agents.map((a) => `${a.name} (${a.model})`).join(", ") || "no agents";
        const skillNames = t.skills.map((s) => s.name).join(", ") || "no skills";
        return `### ${t.name} [ID: ${t.id}]\n- Status: ${t.status} · ${t.agents.length} agents · ${t._count.tasks} tasks\n- Agents: ${agentNames}\n- Skills: ${skillNames}`;
      })
      .join("\n\n");
    sections.push(`## Agent Teams\n${teamList}`);
  }

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
      .map((f) => `- ${f.name}: \`${f.command}\`${f.dangerous ? " ⚠ dangerous" : ""}`)
      .join("\n") || "No CLI functions.";

  return `You are the AI coordinator for the **${team.name}** team (ID: ${team.id}).

## Team Overview
- Runtime: ${team.language} · Port: ${team.port} · Status: ${team.status}
- ${team.description || "No description"}

## Agents
${agentList}

## Skills
${skillList}

## CLI Functions
${cliFnList}

Help the user work with this team's agents and capabilities. Use the team ID above when calling tools that modify this team.`;
}

// ─── Provider streaming functions ─────────────────────────────────────────────

async function streamAnthropic(
  messages: Array<{ role: "user" | "assistant"; content: string }>,
  model: string,
  systemPrompt: string,
  controller: ReadableStreamDefaultController,
  encoder: TextEncoder
): Promise<{ inputTokens: number; outputTokens: number; webSearchCalls: number; webBrowseCalls: number; responseText: string; toolsUsed: string[] }> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    controller.enqueue(encoder.encode("ANTHROPIC_API_KEY is not set. Add it to .env.local."));
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
  const MAX_TOOL_ITERATIONS = 10;
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
      controller.enqueue(encoder.encode("\n\n⚠️ *Max tool iterations reached.*"));
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("credit_balance_too_low") || msg.includes("credit balance is too low")) {
      controller.enqueue(encoder.encode(
        "⚠️ **Insufficient Anthropic credits.**\n\nPlease add credits at [console.anthropic.com → Billing](https://console.anthropic.com/settings/billing).\n\nOr switch to **Ollama** in the model selector to run models locally for free."
      ));
    } else if (msg.includes("invalid_api_key") || msg.includes("authentication")) {
      controller.enqueue(encoder.encode("⚠️ Invalid API key. Check your `ANTHROPIC_API_KEY` in `.env.local`."));
    } else {
      controller.enqueue(encoder.encode(`❌ ${msg}`));
    }
  }

  return { inputTokens: totalInputTokens, outputTokens: totalOutputTokens, webSearchCalls: totalWebSearchCalls, webBrowseCalls: totalWebBrowseCalls, responseText: accumulatedText, toolsUsed: usedTools };
}

async function streamOpenAI(
  messages: Array<{ role: "user" | "assistant"; content: string }>,
  model: string,
  systemPrompt: string,
  controller: ReadableStreamDefaultController,
  encoder: TextEncoder
) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    controller.enqueue(
      encoder.encode(
        "OPENAI_API_KEY is not set. Add it to .env.local.\n\nSwitch to Anthropic or configure your OpenAI key to use GPT models."
      )
    );
    return;
  }

  const client = new OpenAI({ apiKey });

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
      controller.enqueue(encoder.encode("\n\n⚠️ *Max tool iterations reached.*"));
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    if (msg.includes("invalid_api_key") || msg.includes("Incorrect API key")) {
      controller.enqueue(encoder.encode("⚠️ Invalid OpenAI API key. Check your `OPENAI_API_KEY` in `.env.local`."));
    } else if (msg.includes("rate_limit_exceeded") || msg.includes("Rate limit")) {
      controller.enqueue(encoder.encode("⚠️ OpenAI rate limit exceeded. Please wait a moment and try again."));
    } else if (msg.includes("model_not_found") || msg.includes("does not exist")) {
      controller.enqueue(encoder.encode(`⚠️ Model "${model}" not found. Check your OpenAI model name.`));
    } else {
      controller.enqueue(encoder.encode(`❌ OpenAI error: ${msg}`));
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

  try {
    const res = await fetch(`${baseUrl}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        messages: [{ role: "system", content: systemPrompt }, ...messages],
        stream: true,
      }),
      signal: AbortSignal.timeout(60000),
    });

    if (!res.ok) {
      controller.enqueue(
        encoder.encode(
          `Ollama error (${res.status}). Make sure Ollama is running at ${baseUrl} and the model "${model}" is pulled.`
        )
      );
      return;
    }

    const reader = res.body!.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      const chunk = decoder.decode(value);
      for (const line of chunk.split("\n")) {
        if (!line.trim()) continue;
        try {
          const parsed = JSON.parse(line);
          if (parsed.message?.content) {
            controller.enqueue(encoder.encode(parsed.message.content));
          }
        } catch {}
      }
    }
  } catch (err) {
    controller.enqueue(
      encoder.encode(
        `Cannot reach Ollama at ${baseUrl}. Make sure the service is running.\n\nError: ${String(err)}`
      )
    );
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

  let messages: Array<{ role: "user" | "assistant"; content: string }>;
  let systemContext: string | undefined;
  let provider: string;
  let model: string | undefined;
  let teamId: string | undefined;

  try {
    const body = await req.json();
    messages = body.messages ?? [];
    systemContext = body.systemContext;
    provider = body.provider ?? "anthropic";
    model = body.model;
    teamId = body.teamId;
  } catch {
    return new Response("Invalid JSON body", { status: 400 });
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

  const encoder = new TextEncoder();

  // Default models per provider
  const defaultModels: Record<string, string> = {
    anthropic: "claude-sonnet-4-6",
    openai: "gpt-4o",
    ollama: "qwen2.5:7b",
  };
  const resolvedModel = model || defaultModels[provider] || "claude-sonnet-4-6";

  const readable = new ReadableStream({
    async start(controller) {
      try {
        if (provider === "openai") {
          await streamOpenAI(messages, resolvedModel, systemPrompt, controller, encoder);
        } else if (provider === "ollama") {
          await streamOllama(messages, resolvedModel, systemPrompt, controller, encoder);
        } else {
          const usage = await streamAnthropic(messages, resolvedModel, systemPrompt, controller, encoder);
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
        controller.enqueue(encoder.encode(`\n\n❌ Error: ${String(err)}`));
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
