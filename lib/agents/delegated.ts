import Anthropic from "@anthropic-ai/sdk";
import { prisma } from "@/lib/prisma";
import { executeTool, CHAT_TOOLS } from "@/lib/chat-tools";
import type { TaskResult } from "./events";

const MAX_TOOL_ITERATIONS = 10;

const TEAM_TOOL_SUBSETS: Record<string, string[]> = {
  dev:        ["vps_exec", "write_file", "read_file", "list_files", "vault_write", "vault_search", "web_search", "web_browse"],
  research:   ["web_search", "web_browse", "vault_write", "vault_search", "read_file", "list_files"],
  content:    ["write_file", "vault_write", "vault_search", "web_search", "web_browse"],
  ops:        ["schedule_task", "delegate_to_team", "vault_write", "web_search", "query_data"],
  default:    ["vault_search", "vault_write", "web_search", "web_browse", "write_file", "read_file"],
};
const COMMON_TOOLS = ["council_reason", "save_memory", "recall_memories"];

function getTeamTools(teamName: string): string[] {
  const n = teamName.toLowerCase();
  let subset = TEAM_TOOL_SUBSETS.default;
  if (n.includes("dev") || n.includes("code") || n.includes("engineer")) subset = TEAM_TOOL_SUBSETS.dev;
  else if (n.includes("research") || n.includes("intel")) subset = TEAM_TOOL_SUBSETS.research;
  else if (n.includes("content") || n.includes("market") || n.includes("social")) subset = TEAM_TOOL_SUBSETS.content;
  else if (n.includes("ops") || n.includes("operat")) subset = TEAM_TOOL_SUBSETS.ops;
  return [...new Set([...subset, ...COMMON_TOOLS])];
}

export interface DelegatedTaskInput {
  title: string;
  description: string;
  teamId: string;
}

/**
 * Run an ad-hoc delegated task (from delegate_to_team tool).
 * Uses a full Anthropic tool loop scoped to the team's allowed tools.
 */
export async function runDelegatedTask(
  taskId: string,
  task: DelegatedTaskInput
): Promise<TaskResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return { taskId, content: "No ANTHROPIC_API_KEY set.", summary: "No API key.", inputTokens: 0, outputTokens: 0, provider: "none", model: "none" };
  }

  const team = await prisma.agentTeam.findUnique({
    where: { id: task.teamId },
    select: { name: true, description: true, agents: { select: { name: true, systemPrompt: true } } },
  });

  const teamName = team?.name ?? "Agent Team";
  const allowedToolNames = getTeamTools(teamName);
  const tools = CHAT_TOOLS
    .filter((t) => allowedToolNames.includes(t.name))
    .map((t) => ({ name: t.name, description: t.description, input_schema: t.input_schema }));

  const agentContext = team?.agents.length
    ? `\nTeam agents: ${team.agents.map((a) => a.name).join(", ")}`
    : "";

  const systemPrompt = `You are an AI agent on the ${teamName} team.${agentContext}
${team?.description ? `Team description: ${team.description}` : ""}

Complete the assigned task using your available tools. Be thorough and specific.
Write results to the vault when done. Return a clear summary of what you accomplished.`;

  const userMessage = `## Task: ${task.title}\n\n${task.description}\n\nComplete this task now.`;

  const client = new Anthropic({ apiKey });
  let currentMessages: Anthropic.Messages.MessageParam[] = [
    { role: "user", content: userMessage },
  ];

  let fullText = "";
  let totalInput = 0;
  let totalOutput = 0;

  for (let i = 0; i < MAX_TOOL_ITERATIONS; i++) {
    const response = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
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

  return { taskId, content, summary, inputTokens: totalInput, outputTokens: totalOutput, provider: "anthropic", model: "claude-haiku-4-5-20251001" };
}
