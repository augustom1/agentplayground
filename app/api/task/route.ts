/**
 * POST /api/task — Execute a task using Claude with full tool-use.
 *
 * Called by:
 *   - /api/cron (recurring task dispatch) via Bearer CRON_SECRET
 *   - Direct POST from UI (manual "Run" button) via session auth
 *
 * Body: { taskId?: string, target?: string, prompt?: string }
 *   - taskId:  run an existing Task record from the DB
 *   - target:  team name to route to (optional context)
 *   - prompt:  override prompt (required if no taskId)
 */
export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import Anthropic from "@anthropic-ai/sdk";
import { prisma } from "@/lib/prisma";
import { CHAT_TOOLS, executeTool } from "@/lib/chat-tools";
import { apiError } from "@/lib/api-error";
import { auth } from "@/auth";
import { notifyTaskComplete } from "@/lib/notify";

const MAX_ITERATIONS = 10;

export async function POST(req: NextRequest) {
  try {
    // Auth: accept cron secret OR valid user session
    const cronSecret = process.env.CRON_SECRET;
    const authHeader = req.headers.get("authorization");
    const isCronAuth = !!(cronSecret && authHeader === `Bearer ${cronSecret}`);

    if (!isCronAuth) {
      const session = await auth();
      if (!session?.user) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    }

    const body = await req.json() as {
      taskId?: string;
      target?: string;
      prompt?: string;
    };
    const { taskId, target, prompt } = body;

    if (!prompt && !taskId) {
      return NextResponse.json(
        { error: "Provide 'prompt' or 'taskId'" },
        { status: 400 }
      );
    }

    // Load task record if taskId given
    let resolvedPrompt = prompt ?? "";
    let teamId: string | undefined;

    if (taskId) {
      const task = await prisma.task.findUnique({ where: { id: taskId } });
      if (!task) {
        return NextResponse.json({ error: "Task not found" }, { status: 404 });
      }
      resolvedPrompt = task.prompt ?? task.title;
      teamId = task.teamId;

      // Mark running
      await prisma.task.update({
        where: { id: taskId },
        data: { status: "running", startedAt: new Date() },
      });
    }

    // Resolve team for context
    let team = null;
    if (teamId) {
      team = await prisma.agentTeam.findUnique({
        where: { id: teamId },
        include: { skills: { select: { name: true, description: true } } },
      });
    } else if (target) {
      team = await prisma.agentTeam.findFirst({
        where: { name: target },
        include: { skills: { select: { name: true, description: true } } },
      });
    }

    const apiKey = process.env.ANTHROPIC_API_KEY;
    if (!apiKey) {
      const errMsg = "No ANTHROPIC_API_KEY configured";
      if (taskId) {
        await prisma.task.update({
          where: { id: taskId },
          data: { status: "failed", result: errMsg },
        });
      }
      return NextResponse.json({ error: errMsg }, { status: 500 });
    }

    const client = new Anthropic({ apiKey });
    const tools = CHAT_TOOLS.map((t) => ({
      name: t.name,
      description: t.description,
      input_schema: t.input_schema,
    }));

    const skillsContext = team?.skills?.length
      ? `\n\n## Team Skills\n${team.skills.map((s) => `- ${s.name}: ${s.description}`).join("\n")}`
      : "";

    const systemPrompt = `You are an autonomous task execution agent${team ? ` for the **${team.name}** team` : ""}.

Execute the task completely using the available tools. When done, provide a clear summary.
- Use tools as needed to accomplish the task
- Be concise in status updates, thorough in execution
- End with ✓ summary of what was done, or ✗ with reason if failed${skillsContext}`;

    const messages: Anthropic.MessageParam[] = [
      { role: "user", content: resolvedPrompt },
    ];

    let resultText = "";
    let iterations = 0;
    let continueLoop = true;
    const toolsUsed: string[] = [];

    while (continueLoop && iterations < MAX_ITERATIONS) {
      iterations++;
      continueLoop = false;

      const response = await client.messages.create({
        model: "claude-sonnet-4-6",
        max_tokens: 4096,
        system: systemPrompt,
        messages,
        tools: tools as Anthropic.Messages.Tool[],
      });

      for (const block of response.content) {
        if (block.type === "text") {
          resultText += block.text;
        } else if (block.type === "tool_use") {
          toolsUsed.push(block.name);
          const toolResult = await executeTool(
            block.name,
            block.input as Record<string, unknown>
          );
          messages.push({ role: "assistant", content: response.content });
          messages.push({
            role: "user",
            content: [
              { type: "tool_result", tool_use_id: block.id, content: toolResult },
            ],
          });
          continueLoop = true;
        }
      }

      if (response.stop_reason === "end_turn") continueLoop = false;
    }

    if (iterations >= MAX_ITERATIONS) {
      resultText += "\n\n⚠️ Reached max iterations — task may be incomplete.";
    }

    const finalStatus = resultText.includes("✗") ? "failed" : "completed";

    // Update task record
    if (taskId) {
      await prisma.task.update({
        where: { id: taskId },
        data: { status: finalStatus, result: resultText, completedAt: new Date() },
      });
    }

    // Fire-and-forget email notification
    notifyTaskComplete({
      taskTitle: resolvedPrompt.slice(0, 80),
      taskId: taskId ?? "adhoc",
      result: resultText,
      teamName: team?.name ?? target,
      status: finalStatus,
    }).catch(() => {});

    // Log activity
    await prisma.activityLog.create({
      data: {
        action: `Task ${finalStatus}: ${resolvedPrompt.slice(0, 80)}`,
        type: "task",
        teamName: team?.name ?? target ?? "Unknown",
        teamId: team?.id ?? null,
        details: `Tools used: ${toolsUsed.join(", ") || "none"} | Iterations: ${iterations}`,
      },
    });

    // Increment team counter
    if (team?.id && finalStatus === "completed") {
      await prisma.agentTeam.update({
        where: { id: team.id },
        data: {
          tasksCompleted: { increment: 1 },
          lastActivity: new Date().toISOString(),
        },
      });
    }

    return NextResponse.json({
      success: finalStatus === "completed",
      status: finalStatus,
      result: resultText,
      iterations,
      toolsUsed,
    });
  } catch (err) {
    return apiError(err);
  }
}
