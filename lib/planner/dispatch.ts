import { prisma } from "@/lib/prisma";
import { ingestPlanToBrain, ingestToBrain } from "@/lib/brain/ingest";
import { notifyPlanEvent } from "@/lib/notify/sse";
import fs from "fs";
import path from "path";

/**
 * Topological sort of PlanTasks by their dependency graph.
 * Returns batches: tasks in the same batch can run in parallel.
 */
function topologicalBatches(
  tasks: { id: string; dependencies: string[] }[]
): string[][] {
  const remaining = new Map(tasks.map((t) => [t.id, new Set(t.dependencies)]));
  const batches: string[][] = [];

  while (remaining.size > 0) {
    // Find tasks with no unresolved dependencies
    const ready = [...remaining.entries()]
      .filter(([, deps]) => deps.size === 0)
      .map(([id]) => id);

    if (ready.length === 0) {
      // Circular dependency — add all remaining as a final batch
      batches.push([...remaining.keys()]);
      break;
    }

    batches.push(ready);
    for (const id of ready) {
      remaining.delete(id);
      // Remove this task from other tasks' dependencies
      for (const deps of remaining.values()) {
        deps.delete(id);
      }
    }
  }

  return batches;
}

/**
 * Dispatch all tasks for an approved plan.
 * Runs in the background — returns immediately after starting.
 */
export async function dispatchPlan(planId: string): Promise<void> {
  const plan = await prisma.plan.findUnique({
    where: { id: planId },
    include: { tasks: { include: { team: true } } },
  });

  if (!plan) throw new Error(`Plan ${planId} not found`);

  // Ingest plan into brain so agents have context
  await ingestPlanToBrain(planId, JSON.stringify({
    id: plan.id,
    title: plan.title,
    description: plan.description,
    tasks: plan.tasks.map((t) => ({
      id: t.id,
      title: t.title,
      description: t.description,
      team: t.team.name,
    })),
  }));

  // Update plan status to RUNNING
  await prisma.plan.update({
    where: { id: planId },
    data: { status: "RUNNING" },
  });

  const batches = topologicalBatches(
    plan.tasks.map((t) => ({ id: t.id, dependencies: t.dependencies }))
  );

  // Execute batches sequentially, tasks within a batch in parallel
  for (const batch of batches) {
    const batchTasks = plan.tasks.filter((t) => batch.includes(t.id));

    await Promise.allSettled(
      batchTasks.map((task) => executeTask(task.id, planId))
    );
  }

  // Check if all tasks completed successfully
  const finalTasks = await prisma.planTask.findMany({
    where: { planId },
    select: { status: true },
  });

  const allDone = finalTasks.every((t) => t.status === "DONE");
  const anyFailed = finalTasks.some((t) => t.status === "FAILED");
  const anyBlocked = finalTasks.some((t) => t.status === "BLOCKED");

  const finalStatus = allDone ? "DONE" : anyBlocked ? "BLOCKED" : anyFailed ? "BLOCKED" : "DONE";

  await prisma.plan.update({
    where: { id: planId },
    data: { status: finalStatus },
  });

  notifyPlanEvent({
    type: finalStatus === "DONE" ? "PLAN_DONE" : "PLAN_BLOCKED",
    planId,
    message: finalStatus === "DONE"
      ? `Plan "${plan.title}" completed successfully.`
      : `Plan "${plan.title}" is blocked — check task details.`,
  });

  // Generate plan execution report via local Ollama (fire-and-forget)
  generatePlanReport(planId, plan.title).catch(() => {});
}

/**
 * Generate a structured plan execution report using local Ollama.
 * Writes to docs/reports/plans/ and indexes to Brain — zero API cost.
 */
async function generatePlanReport(planId: string, planTitle: string): Promise<void> {
  const ollamaUrl = process.env.OLLAMA_BASE_URL || "http://ollama:11434";
  const model = process.env.OLLAMA_OVERNIGHT_MODEL || "qwen2.5:7b";

  // Fetch completed tasks with results
  const tasks = await prisma.planTask.findMany({
    where: { planId },
    select: { title: true, status: true, result: true, team: { select: { name: true } } },
    orderBy: { createdAt: "asc" },
  });

  if (tasks.length === 0) return;

  const taskSummary = tasks
    .map((t) => `### ${t.title} [${t.status}] — Team: ${t.team.name}\n${(t.result ?? "No result recorded").slice(0, 600)}`)
    .join("\n\n---\n\n");

  const prompt = `You are documenting the execution of an AI agent plan for a knowledge base.

Write a concise execution report in markdown. Include:
1. What the plan accomplished (2-3 sentences)
2. What each team delivered (bullet points)
3. Key outcomes and deliverables
4. Any notable issues or blockers
5. Next logical steps (if any)

Keep the report factual, under 400 words.

## Plan: ${planTitle}

## Task Results:
${taskSummary}`;

  try {
    const res = await fetch(`${ollamaUrl}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model,
        stream: false,
        messages: [
          { role: "system", content: "You are a technical documentation writer. Write clear, structured markdown reports." },
          { role: "user", content: prompt },
        ],
        options: { temperature: 0.2 },
      }),
      signal: AbortSignal.timeout(120_000),
    });

    if (!res.ok) return;

    type OllamaResp = { message?: { content?: string } };
    const data = await res.json() as OllamaResp;
    const content = data.message?.content?.trim();
    if (!content) return;

    const date = new Date().toISOString().split("T")[0];
    const slug = planTitle.toLowerCase().replace(/[^a-z0-9]+/g, "-").slice(0, 40);
    const reportPath = `docs/reports/plans/${date}-${slug}.md`;
    const fullReport = `# Plan Report: ${planTitle}\n> Generated ${date} via ${model}\n\n${content}`;

    // Write to filesystem
    const dir = path.join(process.cwd(), "docs/reports/plans");
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(process.cwd(), reportPath), fullReport, "utf-8");

    // Index to Brain
    await ingestToBrain({
      content: fullReport,
      title: `Plan Report: ${planTitle}`,
      source: `plan-report:${planId}`,
      sourceType: "session-report",
      metadata: { planId, date, model },
    });

    console.log(`[dispatch] Plan report written: ${reportPath}`);
  } catch (err) {
    console.error("[dispatch] Plan report generation failed:", err);
  }
}

async function executeTask(taskId: string, planId: string): Promise<void> {
  const { runAgentTask } = await import("@/lib/agents/runner");

  try {
    await prisma.planTask.update({ where: { id: taskId }, data: { status: "RUNNING" } });
    const result = await runAgentTask(taskId);

    await prisma.planTask.update({
      where: { id: taskId },
      data: { status: "DONE", result: result.content },
    });

    notifyPlanEvent({
      type: "TASK_DONE",
      planId,
      taskId,
      message: `Task completed: ${result.summary}`,
    });
  } catch (err) {
    const msg = String(err);
    await prisma.planTask.update({
      where: { id: taskId },
      data: { status: "FAILED", blockedBy: msg },
    });

    notifyPlanEvent({
      type: "ERROR",
      planId,
      taskId,
      message: `Task failed: ${msg.slice(0, 200)}`,
    });
  }
}
