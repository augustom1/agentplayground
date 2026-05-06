import Anthropic from "@anthropic-ai/sdk";
import { prisma } from "@/lib/prisma";
import { searchVault, writeVaultNote, indexVaultNote } from "@/lib/brain";

const PLAN_SYSTEM = `You are a task planning specialist for an autonomous agent platform.
Given a task, you create a structured, executable plan that AI agents can follow step by step.
Your plans are stored in the knowledge base and read by agent teams when they start work.

Format your response ONLY as markdown with exactly this structure (no preamble, no explanation):

# Task: {title}

## Objective
One clear sentence describing what success looks like.

## Context
Key information needed to complete this task (2-4 bullet points).

## Execution Steps

### Step 1: [Short action title]
- [ ] Specific sub-action
- [ ] Specific sub-action

### Step 2: [Short action title]
- [ ] Specific sub-action
- [ ] Specific sub-action

(add as many steps as needed, typically 3-6)

## Expected Output
What the final deliverable looks like.

## Notes
Any warnings, dependencies, or edge cases to watch for.`;

export interface PlanResult {
  planPath: string;
  planContent: string;
  taskId: string;
}

export async function generateTaskPlan(taskId: string): Promise<PlanResult> {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    include: { team: { select: { name: true, description: true } } },
  });
  if (!task) throw new Error(`Task ${taskId} not found`);

  // Pull relevant vault context
  const vaultResults = await searchVault(
    `${task.title} ${task.description || ""}`.slice(0, 300),
    5
  );
  const vaultContext = vaultResults.length > 0
    ? "\n\n## Relevant Knowledge Base Context\n" +
      vaultResults.map((r) => `### ${r.title}\n${r.content.slice(0, 400)}`).join("\n\n---\n\n")
    : "";

  const userPrompt = `Create an execution plan for this task:

**Title:** ${task.title}
**Team:** ${task.team.name} — ${task.team.description}
**Priority:** ${task.priority}
**Description:** ${task.description || "No description provided"}
${task.prompt ? `**Prompt:** ${task.prompt}` : ""}
${vaultContext}`;

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY not configured");

  const client = new Anthropic({ apiKey });
  const response = await client.messages.create({
    model: "claude-haiku-4-5-20251001",
    max_tokens: 1500,
    system: PLAN_SYSTEM,
    messages: [{ role: "user", content: userPrompt }],
  });

  const planBody = response.content
    .filter((b) => b.type === "text")
    .map((b) => b.text)
    .join("");

  const now = new Date();
  const frontmatter = `---\ntask_id: ${task.id}\ntitle: "${task.title}"\nteam_id: ${task.teamId}\nteam: "${task.team.name}"\npriority: ${task.priority}\nstatus: planned\ncreated: ${now.toISOString()}\n---\n\n`;

  const planContent = frontmatter + planBody +
    `\n\n---\n*Plan generated ${now.toISOString()} · Task ID: ${task.id}*`;

  const planPath = `plans/${task.id}.md`;

  await writeVaultNote(planPath, planContent);
  await indexVaultNote({
    path: planPath,
    title: `Plan: ${task.title}`,
    content: planBody,
    tags: ["plan", "task", task.team.name.toLowerCase().replace(/\s+/g, "-")],
  });

  return { planPath, planContent, taskId };
}

export interface TaskQueueItem {
  id: string;
  title: string;
  description: string | null;
  status: string;
  priority: string;
  teamId: string;
  teamName: string;
  hasPlan: boolean;
  planPath: string;
  createdAt: Date;
}

export async function getExecutorQueue(): Promise<TaskQueueItem[]> {
  const tasks = await prisma.task.findMany({
    where: { status: { in: ["pending", "running"] } },
    orderBy: [{ priority: "desc" }, { createdAt: "asc" }],
    take: 50,
    include: { team: { select: { name: true } } },
  });

  const results: TaskQueueItem[] = [];
  for (const t of tasks) {
    const planPath = `plans/${t.id}.md`;
    const note = await prisma.vaultNote.findFirst({ where: { path: planPath }, select: { path: true } });
    results.push({
      id: t.id,
      title: t.title,
      description: t.description,
      status: t.status,
      priority: t.priority,
      teamId: t.teamId,
      teamName: t.team.name,
      hasPlan: !!note,
      planPath,
      createdAt: t.createdAt,
    });
  }
  return results;
}
