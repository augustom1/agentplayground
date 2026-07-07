export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { apiError } from "@/lib/api-error";
import { notifyPlanEvent } from "@/lib/notify/sse";
import { AnthropicProvider, OpenAIProvider, getProvider } from "@/lib/providers";
import type { LLMProvider } from "@/lib/providers";

// Coordinator task router (Session 34):
//   POST { description }                       → coordinator picks a team → { teamId, teamName, title, reasoning }
//   POST { description, title, teamId, dispatch: true } → creates the task and executes in background → { taskId }

type RouteBody = {
  description?: string;
  title?: string;
  teamId?: string;
  dispatch?: boolean;
};

type RouterPick = { teamId: string | null; title: string; reasoning: string };

async function getStoredKey(name: string): Promise<string | undefined> {
  const envVal = process.env[name];
  if (envVal) return envVal;
  const mem = await prisma.agentMemory.findFirst({
    where: { ownerType: "system", ownerId: name },
    select: { content: true },
  });
  return mem?.content ?? undefined;
}

// Anthropic (env/AgentMemory key) preferred; NVIDIA free API next (OpenAI-compatible);
// DB-configured keeper provider (incl. Ollama) as final fallback
async function pickProvider(): Promise<{ provider: LLMProvider; model: string } | null> {
  const key = await getStoredKey("ANTHROPIC_API_KEY");
  if (key) return { provider: new AnthropicProvider(key), model: "claude-haiku-4-5-20251001" };
  const nvidiaKey = await getStoredKey("NVIDIA_API_KEY");
  if (nvidiaKey) {
    return {
      provider: new OpenAIProvider({ apiKey: nvidiaKey, baseUrl: "https://integrate.api.nvidia.com/v1", id: "nvidia", name: "NVIDIA" }),
      model: "meta/llama-3.1-8b-instruct",
    };
  }
  try {
    const provider = await getProvider("keeper");
    const model = provider.type === "ollama" ? "qwen2.5:7b" : "claude-haiku-4-5-20251001";
    return { provider, model };
  } catch {
    return null;
  }
}

async function routeToTeam(description: string): Promise<{ pick: RouterPick | null; teams: { id: string; name: string }[] }> {
  const teams = await prisma.agentTeam.findMany({
    where: { isSystemTeam: false },
    select: { id: true, name: true, description: true, _count: { select: { agents: true, skills: true } } },
    orderBy: { createdAt: "asc" },
  });
  if (teams.length === 0) return { pick: null, teams: [] };

  const chosen = await pickProvider();
  if (!chosen) return { pick: null, teams };

  try {
    const result = await chosen.provider.complete({
      model: chosen.model,
      maxTokens: 512,
      system: `You are the Playground Keeper routing a task to the best agent team. Return ONLY valid JSON matching exactly:
{"teamId": "id of the best-fit team from the list, or null", "title": "short imperative task title (max 60 chars)", "reasoning": "1-2 sentences: why this team fits this task"}
Rules:
- Pick a team ONLY if its name or description clearly covers the task's subject matter.
- If no team is a genuine fit for the task, set "teamId" to null. Never force a pick just to return one — a wrong team is worse than no team.`,
      messages: [{
        role: "user",
        content: `Task: "${description}"\n\nAvailable teams:\n${JSON.stringify(
          teams.map(t => ({ id: t.id, name: t.name, description: t.description, agents: t._count.agents, skills: t._count.skills })),
          null, 2
        )}\n\nReturn JSON:`,
      }],
    });

    const cleaned = result.content.trim().replace(/^```json\n?/, "").replace(/^```\n?/, "").replace(/\n?```$/, "");
    const parsed = JSON.parse(cleaned) as { teamId?: string; title?: string; reasoning?: string };
    const valid = teams.some(t => t.id === parsed.teamId);
    return {
      pick: {
        teamId: valid ? (parsed.teamId as string) : null,
        title: (parsed.title || description.slice(0, 60)).slice(0, 60),
        reasoning: parsed.reasoning || "",
      },
      teams,
    };
  } catch {
    return { pick: null, teams };
  }
}

// Same lifecycle as toolDelegateToTeam (lib/chat-tools.ts) but detached — the router
// returns immediately and the SSE activity strip carries progress.
function executeInBackground(taskId: string, title: string, description: string, teamId: string, teamName: string) {
  void (async () => {
    try {
      const { runDelegatedTask } = await import("@/lib/agents/delegated");
      const result = await runDelegatedTask(taskId, { title, description, teamId });

      if (result.content.startsWith("NEEDS_HUMAN_INPUT:")) {
        const question = result.content.replace("NEEDS_HUMAN_INPUT:", "").trim();
        await prisma.task.update({ where: { id: taskId }, data: { status: "blocked" } });
        import("@/lib/integrations/telegram/bot")
          .then(({ sendOwnerAlert }) =>
            sendOwnerAlert(`*Input needed:* ${question}\nTask: _${title}_ (${teamName})`)
          )
          .catch(() => {});
        return;
      }

      await prisma.task.update({
        where: { id: taskId },
        data: { status: "completed", result: result.content, completedAt: new Date() },
      });

      notifyPlanEvent({
        type: "TASK_DONE",
        taskId,
        message: `${teamName} completed: ${title}`,
        data: { teamName, taskTitle: title },
      });

      if (result.content.length > 50) {
        import("@/lib/brain/ingest").then(({ ingestToBrain }) =>
          ingestToBrain({
            content: `# Task: ${title}\nTeam: ${teamName}\n\n${result.content}`,
            title: `Task Result: ${title}`,
            source: `task-result:${taskId}`,
            sourceType: "task-result",
            metadata: { taskId, teamName, completedAt: new Date().toISOString() },
          })
        ).catch(() => {});
      }

      import("@/lib/integrations/telegram/bot")
        .then(({ sendGroupNotification }) =>
          sendGroupNotification(`Task done: *${title}*\nTeam: ${teamName}`)
        )
        .catch(() => {});
    } catch (err) {
      await prisma.task.update({ where: { id: taskId }, data: { status: "failed" } }).catch(() => {});
      notifyPlanEvent({
        type: "ERROR",
        taskId,
        message: `${teamName}: ${title} failed`,
        data: { teamName, taskTitle: title, error: String(err) },
      });
    }
  })();
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return apiError("Unauthorized", 401);

  const body = await req.json() as RouteBody;
  const description = body.description?.trim();
  if (!description) return apiError("Missing required field: description", 400);

  // ── Dispatch mode ────────────────────────────────────
  if (body.dispatch) {
    if (!body.teamId) return apiError("Missing required field: teamId", 400);
    const team = await prisma.agentTeam.findUnique({
      where: { id: body.teamId },
      select: { id: true, name: true },
    });
    if (!team) return apiError("Team not found", 404);

    const title = (body.title?.trim() || description.slice(0, 60)).slice(0, 60);

    const task = await prisma.task.create({
      data: { title, description, priority: "medium", status: "running", teamId: team.id },
    });

    await prisma.activityLog.create({
      data: {
        action: `Task router dispatched "${title}" to ${team.name}`,
        type: "task",
        teamName: team.name,
        teamId: team.id,
      },
    });

    notifyPlanEvent({
      type: "TASK_STARTED",
      taskId: task.id,
      message: `${team.name}: ${title}`,
      data: { teamName: team.name, taskTitle: title },
    });

    executeInBackground(task.id, title, description, team.id, team.name);

    return NextResponse.json({ taskId: task.id, teamId: team.id, teamName: team.name });
  }

  // ── Route mode ───────────────────────────────────────
  const { pick, teams } = await routeToTeam(description);
  if (teams.length === 0) return apiError("No teams available — create a team first", 409);

  if (!pick || !pick.teamId) {
    // LLM unavailable or unusable answer — the UI falls back to the manual picker
    return NextResponse.json({
      teamId: null,
      title: description.slice(0, 60),
      reasoning: "Could not pick a team automatically. Choose one manually.",
    });
  }

  const team = teams.find(t => t.id === pick.teamId);
  return NextResponse.json({
    teamId: pick.teamId,
    teamName: team?.name ?? "",
    title: pick.title,
    reasoning: pick.reasoning,
  });
}
