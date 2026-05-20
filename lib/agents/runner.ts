import { prisma } from "@/lib/prisma";
import { getProvider } from "@/lib/providers";
import { queryBrain, formatBrainContext } from "@/lib/brain/query";
import type { TaskResult } from "./events";

/**
 * Execute a single PlanTask.
 * 1. Checks TaskProtocol for a local Ollama match first (cost savings).
 * 2. Falls back to the configured agent provider (default: Anthropic).
 * 3. Injects relevant brain context into the system prompt.
 */
export async function runAgentTask(taskId: string): Promise<TaskResult> {
  const task = await prisma.planTask.findUnique({
    where: { id: taskId },
    include: { team: true, plan: true },
  });

  if (!task) throw new Error(`Task ${taskId} not found`);

  // 1. Pull relevant brain context
  const brainChunks = await queryBrain({
    query: task.description,
    topK: 6,
    filter: { planId: task.planId },
  });
  const brainContext = formatBrainContext(brainChunks, 3000);

  // 2. Try to match a local TaskProtocol (free, fast)
  const protocol = await findMatchingProtocol(task.description);

  let providerKey: "agent" | "keeper" = "agent";
  let modelOverride: string | undefined;

  if (protocol) {
    // Use local Ollama protocol
    modelOverride = protocol.localModel;
    providerKey = "agent";
    // Update protocol stats
    prisma.taskProtocol.update({
      where: { id: protocol.id },
      data: { successCount: { increment: 1 } },
    }).catch(() => {});
  }

  const provider = protocol
    ? await import("@/lib/providers").then((m) => new m.OllamaProvider())
    : await getProvider(providerKey);

  const model = modelOverride || "claude-sonnet-4-6";

  // 3. Build system prompt
  const systemPrompt = buildSystemPrompt(
    task.team.name,
    task.team.permissions ?? [],
    brainContext,
    protocol?.systemPrompt
  );

  // 4. Run completion
  const result = await provider.complete({
    model,
    system: systemPrompt,
    messages: [
      {
        role: "user",
        content: buildTaskPrompt(task.title, task.description, task.plan.title),
      },
    ],
    maxTokens: 4096,
    temperature: 0.3,
  });

  // 5. Extract a summary (first 200 chars of output)
  const summary = result.content.slice(0, 200).replace(/\n+/g, " ");

  return {
    taskId,
    content: result.content,
    summary,
    inputTokens: result.inputTokens,
    outputTokens: result.outputTokens,
    provider: provider.type,
    model,
  };
}

function buildSystemPrompt(
  teamName: string,
  capabilities: string[],
  brainContext: string,
  protocolPrompt?: string
): string {
  const base = protocolPrompt
    ? protocolPrompt
    : `You are an AI agent on the ${teamName} team.
Your capabilities: ${capabilities.join(", ")}.

Complete the assigned task thoroughly and concisely.
Return your output as plain text — structured if helpful (markdown lists, code blocks).
If you cannot complete the task, explain exactly what is missing.`;

  return brainContext ? `${base}\n\n${brainContext}` : base;
}

function buildTaskPrompt(title: string, description: string, planTitle: string): string {
  return `## Task: ${title}

**Part of plan:** ${planTitle}

${description}

Complete this task now. Be thorough and specific.`;
}

async function findMatchingProtocol(description: string) {
  try {
    const protocols = await prisma.taskProtocol.findMany({
      where: { active: true, confidence: { gte: 0.7 } },
      orderBy: { confidence: "desc" },
      take: 20,
    });

    for (const p of protocols) {
      try {
        const pattern = new RegExp(p.taskPattern, "i");
        if (pattern.test(description)) return p;
      } catch {
        // Invalid regex — skip
      }
    }
  } catch {
    // TaskProtocol table might not be populated yet
  }
  return null;
}
