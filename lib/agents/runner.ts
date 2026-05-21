import Anthropic from "@anthropic-ai/sdk";
import { prisma } from "@/lib/prisma";
import { queryBrain, formatBrainContext } from "@/lib/brain/query";
import { executeTool, CHAT_TOOLS } from "@/lib/chat-tools";
import type { TaskResult } from "./events";

const MAX_TOOL_ITERATIONS = 10;

// Tool subsets per team category
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

/**
 * Execute a single PlanTask with a full Anthropic tool loop.
 * Agents can now call tools just like the coordinator chat does.
 */
export async function runAgentTask(taskId: string): Promise<TaskResult> {
  const task = await prisma.planTask.findUnique({
    where: { id: taskId },
    include: { team: true, plan: true },
  });

  if (!task) throw new Error(`Task ${taskId} not found`);

  // Pull relevant brain context
  const brainChunks = await queryBrain({
    query: task.description,
    topK: 6,
    filter: { planId: task.planId },
  });
  const brainContext = formatBrainContext(brainChunks, 3000);

  const systemPrompt = buildSystemPrompt(task.team.name, task.team.permissions ?? [], brainContext);
  const userMessage = buildTaskPrompt(task.title, task.description, task.plan.title);

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    // Fallback to simple completion if no API key
    return simpleFallback(taskId, task.team.name, userMessage);
  }

  const allowedToolNames = getTeamTools(task.team.name);
  const tools = CHAT_TOOLS
    .filter((t) => allowedToolNames.includes(t.name))
    .map((t) => ({ name: t.name, description: t.description, input_schema: t.input_schema }));

  const client = new Anthropic({ apiKey });
  let currentMessages: Anthropic.Messages.MessageParam[] = [
    { role: "user", content: userMessage },
  ];

  let fullText = "";
  let totalInput = 0;
  let totalOutput = 0;
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

    // Collect text from this iteration
    for (const block of response.content) {
      if (block.type === "text") fullText += block.text + "\n";
    }

    if (response.stop_reason === "end_turn" || response.stop_reason === "max_tokens") break;

    if (response.stop_reason === "tool_use") {
      // Execute all tool calls and collect results
      const toolResults: Anthropic.Messages.ToolResultBlockParam[] = [];

      for (const block of response.content) {
        if (block.type === "tool_use") {
          const result = await executeTool(block.name, block.input as Record<string, unknown>);
          toolResults.push({
            type: "tool_result",
            tool_use_id: block.id,
            content: result,
          });
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

  return { taskId, content, summary, inputTokens: totalInput, outputTokens: totalOutput, provider: "anthropic", model: "claude-sonnet-4-6" };
}

// Simple fallback when no Anthropic API key
async function simpleFallback(taskId: string, teamName: string, prompt: string): Promise<TaskResult> {
  const content = `[${teamName}] Task acknowledged. No API key configured — task recorded but not executed.\n\nPrompt: ${prompt.slice(0, 200)}`;
  return { taskId, content, summary: content.slice(0, 200), inputTokens: 0, outputTokens: 0, provider: "none", model: "none" };
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
