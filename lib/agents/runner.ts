import Anthropic from "@anthropic-ai/sdk";
import { prisma } from "@/lib/prisma";
import { queryBrain, formatBrainContext } from "@/lib/brain/query";
import { executeTool, CHAT_TOOLS } from "@/lib/chat-tools";
import { getEffectiveApiKey } from "@/lib/api-keys";
import { runProviderToolLoop } from "./provider-loop";
import type { TaskResult } from "./events";

const MAX_TOOL_ITERATIONS = 10;

const TEAM_TOOL_SUBSETS: Record<string, string[]> = {
  dev:        ["vps_exec", "write_file", "read_file", "list_files", "vault_write", "vault_search", "web_search", "web_browse"],
  research:   ["web_search", "web_browse", "vault_write", "vault_search", "read_file", "list_files"],
  content:    ["write_file", "vault_write", "vault_search", "web_search", "web_browse"],
  ops:        ["schedule_task", "delegate_to_team", "vault_write", "web_search", "query_data"],
  default:    ["vault_search", "vault_write", "web_search", "web_browse", "write_file", "read_file"],
};

const COMMON_TOOLS = ["council_reason", "save_memory", "recall_memories", "create_plan"];

function getTeamTools(teamName: string): string[] {
  const name = teamName.toLowerCase();
  let subset = TEAM_TOOL_SUBSETS.default;
  if (name.includes("dev") || name.includes("code") || name.includes("engineer")) subset = TEAM_TOOL_SUBSETS.dev;
  else if (name.includes("research") || name.includes("intel")) subset = TEAM_TOOL_SUBSETS.research;
  else if (name.includes("content") || name.includes("market") || name.includes("social")) subset = TEAM_TOOL_SUBSETS.content;
  else if (name.includes("ops") || name.includes("operat")) subset = TEAM_TOOL_SUBSETS.ops;
  return [...new Set([...subset, ...COMMON_TOOLS])];
}

function buildSystemPrompt(teamName: string, capabilities: string[], brainContext: string): string {
  const base = `You are an AI agent on the ${teamName} team.
${capabilities.length ? `Capabilities: ${capabilities.join(", ")}.` : ""}

Complete the assigned task thoroughly. Use your available tools to:
1. Search the vault for relevant context first
2. Execute the required steps
3. Write your results to the vault when done

Return your output as structured markdown. If you cannot complete the task, explain exactly what is missing.`;

  return brainContext ? `${base}\n\n${brainContext}` : base;
}

function buildTaskPrompt(title: string, description: string, planTitle: string): string {
  return `## Task: ${title}

**Part of plan:** ${planTitle}

${description}

Complete this task now. Be thorough and specific. Use your tools to do the work — don't just describe what you would do.`;
}

/**
 * Archive a completed task result to the Brain for future agent context.
 * Fire-and-forget — never blocks task execution.
 */
function archiveTaskResult(
  taskId: string,
  taskTitle: string,
  planTitle: string,
  teamName: string,
  content: string,
  provider: string
): void {
  import("@/lib/brain/ingest").then(({ ingestToBrain }) =>
    ingestToBrain({
      content: `# Task: ${taskTitle}\nPlan: ${planTitle} | Team: ${teamName} | Provider: ${provider}\n\n${content}`,
      title: `Task Result: ${taskTitle}`,
      source: `plan-task:${taskId}`,
      sourceType: "task-result",
      metadata: { taskId, planTitle, teamName, provider, completedAt: new Date().toISOString() },
    })
  ).catch(() => {});
}

/**
 * Try to execute a task using a local Ollama model (zero API cost).
 * Returns null if Ollama is unavailable or the task fails — caller should fall back to API.
 */
async function tryLocalExecution(
  task: { id: string; title: string; description: string; team: { name: string; permissions: string[] | null }; plan: { title: string } },
  brainContext: string,
  model: string
): Promise<TaskResult | null> {
  const { runLocalTask } = await import("./local-runner");

  const systemPrompt = `${buildSystemPrompt(task.team.name, task.team.permissions ?? [], brainContext)}

[Running on local model — no tool access. Produce your complete output in this single response. Be concise and direct.]`;

  const userPrompt = buildTaskPrompt(task.title, task.description, task.plan.title);

  const result = await runLocalTask({
    taskId: task.id,
    systemPrompt,
    userPrompt,
    model,
  });

  if (!result.success || !result.content.trim()) return null;

  const content = result.content.trim();
  const summary = content.slice(0, 200).replace(/\n+/g, " ");

  archiveTaskResult(task.id, task.title, task.plan.title, task.team.name, content, `ollama/${model}`);

  return {
    taskId: task.id,
    content,
    summary,
    inputTokens: 0,
    outputTokens: 0,
    provider: "ollama",
    model,
  };
}

/**
 * Execute a task using the Anthropic API with a full tool loop.
 * Also evaluates the task for future protocol writing (fire-and-forget).
 */
async function runWithApi(
  task: { id: string; title: string; description: string; team: { name: string; permissions: string[] | null }; plan: { title: string; id: string } },
  brainContext: string
): Promise<TaskResult> {
  const systemPrompt = buildSystemPrompt(task.team.name, task.team.permissions ?? [], brainContext);
  const userMessage = buildTaskPrompt(task.title, task.description, task.plan.title);

  const allowedToolNames = getTeamTools(task.team.name);
  const tools = CHAT_TOOLS
    .filter((t) => allowedToolNames.includes(t.name))
    .map((t) => ({ name: t.name, description: t.description, input_schema: t.input_schema }));

  const apiKey = await getEffectiveApiKey("ANTHROPIC_API_KEY");
  if (!apiKey) {
    // Free-tier path: NVIDIA / OpenAI / local Ollama via the provider abstraction
    const loop = await runProviderToolLoop({ systemPrompt, userMessage, tools, taskId: task.id });
    if (!loop.ok) return simpleFallback(task.id, task.team.name, userMessage);

    const content = loop.content || "Task completed.";
    const summary = content.slice(0, 200).replace(/\n+/g, " ");
    archiveTaskResult(task.id, task.title, task.plan.title, task.team.name, content, `${loop.provider}/${loop.model}`);
    import("@/lib/optimizer/protocol-writer").then(({ evaluateAndWriteProtocol }) =>
      evaluateAndWriteProtocol({
        userId: "system",
        userPrompt: userMessage,
        assistantResponse: content,
        toolsUsed: loop.toolsUsed,
        inputTokens: loop.inputTokens,
        outputTokens: loop.outputTokens,
      })
    ).catch(() => {});

    return {
      taskId: task.id,
      content,
      summary,
      inputTokens: loop.inputTokens,
      outputTokens: loop.outputTokens,
      provider: loop.provider,
      model: loop.model,
    };
  }

  const client = new Anthropic({ apiKey });
  let currentMessages: Anthropic.Messages.MessageParam[] = [
    { role: "user", content: userMessage },
  ];

  let fullText = "";
  let totalInput = 0;
  let totalOutput = 0;
  const toolsUsed: string[] = [];
  let iterations = 0;

  while (iterations < MAX_TOOL_ITERATIONS) {
    iterations++;
    const response = await client.messages.create({
      model: "claude-sonnet-4-6",
      max_tokens: 4096,
      system: systemPrompt,
      messages: currentMessages,
      tools: tools as Anthropic.Messages.Tool[],
    });

    totalInput += response.usage.input_tokens;
    totalOutput += response.usage.output_tokens;

    for (const block of response.content) {
      if (block.type === "text") fullText += block.text + "\n";
    }

    if (response.stop_reason === "end_turn" || response.stop_reason === "max_tokens") break;

    if (response.stop_reason === "tool_use") {
      const toolResults: Anthropic.Messages.ToolResultBlockParam[] = [];

      for (const block of response.content) {
        if (block.type === "tool_use") {
          toolsUsed.push(block.name);
          const result = await executeTool(block.name, block.input as Record<string, unknown>);
          toolResults.push({ type: "tool_result", tool_use_id: block.id, content: result });
        }
      }

      currentMessages = [
        ...currentMessages,
        { role: "assistant", content: response.content },
        { role: "user", content: toolResults },
      ];
      continue;
    }

    break;
  }

  const content = fullText.trim() || "Task completed.";
  const summary = content.slice(0, 200).replace(/\n+/g, " ");

  // Archive result to Brain
  archiveTaskResult(task.id, task.title, task.plan.title, task.team.name, content, "claude-sonnet-4-6");

  // Evaluate for future protocol (fire-and-forget via Ollama)
  import("@/lib/optimizer/protocol-writer").then(({ evaluateAndWriteProtocol }) =>
    evaluateAndWriteProtocol({
      userId: "system",
      userPrompt: userMessage,
      assistantResponse: content,
      toolsUsed,
      inputTokens: totalInput,
      outputTokens: totalOutput,
    })
  ).catch(() => {});

  return {
    taskId: task.id,
    content,
    summary,
    inputTokens: totalInput,
    outputTokens: totalOutput,
    provider: "anthropic",
    model: "claude-sonnet-4-6",
  };
}

/**
 * Execute a single PlanTask. Classifies the task first:
 * - Simple/routine → tries Ollama local LLM (zero cost), with Anthropic fallback
 * - Complex/tool-heavy → runs directly on Anthropic API
 */
export async function runAgentTask(taskId: string): Promise<TaskResult> {
  const task = await prisma.planTask.findUnique({
    where: { id: taskId },
    include: { team: true, plan: true },
  });

  if (!task) throw new Error(`Task ${taskId} not found`);

  const brainChunks = await queryBrain({
    query: task.description,
    topK: 6,
    filter: { planId: task.planId },
  });
  const brainContext = formatBrainContext(brainChunks, 3000);

  // Classify: can this task run on a local LLM?
  try {
    const { classifyTask } = await import("@/lib/optimizer/classifier");
    const cls = await classifyTask({ prompt: `${task.title}\n${task.description}` });

    if (cls.canUseLocal && cls.confidence >= 0.72) {
      console.log(`[runner] Task "${task.title}" → local (${cls.recommendedModel}, ${Math.round(cls.confidence * 100)}% confidence): ${cls.reason}`);
      const localResult = await tryLocalExecution(task, brainContext, cls.recommendedModel);
      if (localResult) return localResult;
      console.log(`[runner] Local execution failed — falling back to API`);
    }
  } catch {
    // Classifier failure is non-fatal — continue with API
  }

  return runWithApi(task, brainContext);
}

function simpleFallback(taskId: string, teamName: string, prompt: string): TaskResult {
  const content = `[${teamName}] Task acknowledged. No AI provider available — task recorded but not executed. Add an API key in Settings > API Keys (Anthropic, or NVIDIA's free key), or start Ollama.\n\nPrompt: ${prompt.slice(0, 200)}`;
  return { taskId, content, summary: content.slice(0, 200), inputTokens: 0, outputTokens: 0, provider: "none", model: "none" };
}
