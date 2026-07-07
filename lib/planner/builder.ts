import { getProvider, defaultModelFor } from "@/lib/providers";
import { queryBrain, formatBrainContext } from "@/lib/brain/query";
import { runCouncil } from "@/lib/council";
import { prisma } from "@/lib/prisma";

const KEEPER_SYSTEM = `You are the Playground Keeper — an AI operations coordinator.
Your job: turn a user's goal into a concrete, executable Plan with discrete tasks assigned to specialist teams.

Available teams:
- content: writing, editing, social media, blog posts
- research: web search, data gathering, synthesis, analysis
- ops: automation, scheduling, integrations, workflows (n8n, email, calendar)
- dev: code, tests, deployments, GitHub

Rules:
1. Each task must have exactly ONE owning team.
2. List dependencies accurately — only block a task on tasks it truly needs.
3. Be concrete: tasks should be completable by an AI agent without human input (unless flagged as requiring_input).
4. Output ONLY valid JSON matching the PlanDraft schema — no extra text.

PlanDraft schema:
{
  "title": "string",
  "description": "string",
  "tasks": [
    {
      "title": "string",
      "description": "string",
      "team": "content|research|ops|dev",
      "dependencies": ["other task title"],
      "estimatedDuration": "string (optional)",
      "requiredInputs": ["string (optional)"]
    }
  ],
  "riskFlags": ["string"]
}`;

export interface PlanTaskDraft {
  title: string;
  description: string;
  team: string;
  dependencies: string[];
  estimatedDuration?: string;
  requiredInputs?: string[];
}

export interface PlanDraft {
  title: string;
  description: string;
  tasks: PlanTaskDraft[];
  councilNotes?: string;
  riskFlags?: string[];
}

export async function buildPlan(goal: string, userId?: string): Promise<string> {
  // 1. Pull brain context
  const brainChunks = await queryBrain({ query: goal, topK: 6 });
  const brainContext = formatBrainContext(brainChunks, 3000);

  // 2. Keeper drafts the plan
  const keeper = await getProvider("keeper");
  const draftResult = await keeper.complete({
    model: defaultModelFor(keeper),
    system: KEEPER_SYSTEM,
    messages: [
      {
        role: "user",
        content: brainContext
          ? `GOAL: ${goal}\n\n${brainContext}`
          : `GOAL: ${goal}`,
      },
    ],
    maxTokens: 2000,
    temperature: 0.3,
  });

  let draft: PlanDraft;
  try {
    const raw = draftResult.content.match(/\{[\s\S]*\}/)?.[0] ?? "{}";
    draft = JSON.parse(raw) as PlanDraft;
  } catch {
    draft = {
      title: goal.slice(0, 80),
      description: goal,
      tasks: [],
      riskFlags: ["Plan generation failed — manual review required"],
    };
  }

  // 3. Save DRAFT plan
  const plan = await prisma.plan.create({
    data: {
      title: draft.title || goal.slice(0, 80),
      description: draft.description || goal,
      status: "COUNCIL_REVIEW",
      riskFlags: draft.riskFlags ?? [],
      userId: userId ?? null,
    },
  });

  // 4. Get available teams to resolve team name → ID
  const allTeams = await prisma.agentTeam.findMany({
    select: { id: true, name: true },
  });
  const teamByName = new Map(allTeams.map((t) => [t.name.toLowerCase(), t.id]));

  // Find default fallback team IDs
  const defaultTeams = ["content", "research", "ops", "dev"];
  const defaultTeamMap: Record<string, string> = {};
  for (const role of defaultTeams) {
    const found = allTeams.find((t) => t.name.toLowerCase().includes(role));
    if (found) defaultTeamMap[role] = found.id;
  }
  // Fallback: first available team
  const fallbackTeamId = allTeams[0]?.id ?? "";

  // Build taskTitle → PlanTask map (for dependency resolution)
  const createdTasks: Map<string, string> = new Map(); // title → id

  for (const taskDraft of draft.tasks ?? []) {
    const teamId =
      teamByName.get(taskDraft.team?.toLowerCase()) ??
      defaultTeamMap[taskDraft.team?.toLowerCase()] ??
      fallbackTeamId;

    if (!teamId) continue;

    const task = await prisma.planTask.create({
      data: {
        planId: plan.id,
        title: taskDraft.title,
        description: taskDraft.description,
        teamId,
        dependencies: [], // filled in below after all tasks are created
        estimatedDuration: taskDraft.estimatedDuration ?? null,
      },
    });
    createdTasks.set(taskDraft.title, task.id);
  }

  // Resolve dependencies by title → ID
  for (const taskDraft of draft.tasks ?? []) {
    const taskId = createdTasks.get(taskDraft.title);
    if (!taskId || !taskDraft.dependencies?.length) continue;

    const depIds = taskDraft.dependencies
      .map((depTitle) => createdTasks.get(depTitle))
      .filter((id): id is string => !!id);

    if (depIds.length > 0) {
      await prisma.planTask.update({
        where: { id: taskId },
        data: { dependencies: depIds },
      });
    }
  }

  // 5. Run Council review
  const participantTeams = await prisma.agentTeam.findMany({
    where: { id: { in: [...createdTasks.values()].filter(Boolean) } },
    select: { id: true },
  });

  const councilOutput = await runCouncil({
    context: JSON.stringify(draft, null, 2),
    topic: "review plan",
    participants: participantTeams.map((t) => t.id).slice(0, 4),
    planId: plan.id,
  });

  // 6. Fold in risk flags from council
  const combinedRiskFlags = [
    ...(draft.riskFlags ?? []),
    ...councilOutput.riskFlags,
  ].filter((v, i, a) => a.indexOf(v) === i);

  // 7. Update plan to PENDING_APPROVAL
  await prisma.plan.update({
    where: { id: plan.id },
    data: {
      status: "PENDING_APPROVAL",
      councilNotes: councilOutput.transcript.slice(0, 10000),
      riskFlags: combinedRiskFlags,
    },
  });

  return plan.id;
}
