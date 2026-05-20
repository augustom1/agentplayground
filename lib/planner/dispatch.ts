import { prisma } from "@/lib/prisma";
import { ingestPlanToBrain } from "@/lib/brain/ingest";
import { notifyPlanEvent } from "@/lib/notify/sse";

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
