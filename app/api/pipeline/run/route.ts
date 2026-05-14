export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { apiError } from "@/lib/api-error";
import Anthropic from "@anthropic-ai/sdk";
import { ingestToVault } from "@/lib/brain";

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY ?? "" });

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return apiError("Unauthorized", 401);

    const { taskId } = await req.json();
    if (!taskId) return apiError("taskId is required", 400);

    const task = await prisma.task.findUnique({
      where: { id: taskId },
      include: { team: { select: { name: true, description: true } } },
    });
    if (!task) return apiError("Task not found", 404);
    if (task.status !== "pending") return apiError("Task is not pending", 400);

    let meta: { instructions?: string; delivery?: string[] } = {};
    try { meta = JSON.parse(task.prompt ?? "{}"); } catch {}
    const instructions = meta.instructions ?? "Process the following content and provide a thorough response.";
    const delivery = meta.delivery ?? ["knowledge"];
    const content = task.description ?? "";

    // Mark running
    await prisma.task.update({ where: { id: taskId }, data: { status: "running", startedAt: new Date() } });

    try {
      const systemPrompt = `You are an expert agent on the "${task.team.name}" team. ${task.team.description ?? ""}
Process the user's content according to their instructions and produce a thorough, well-structured response.
Format your output clearly with sections where appropriate.`;

      const userPrompt = `CONTENT:\n${content}\n\nINSTRUCTIONS:\n${instructions}`;

      const msg = await anthropic.messages.create({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 4096,
        system: systemPrompt,
        messages: [{ role: "user", content: userPrompt }],
      });

      const result = msg.content
        .filter((b): b is Anthropic.TextBlock => b.type === "text")
        .map((b) => b.text)
        .join("\n");

      // Save result
      await prisma.task.update({
        where: { id: taskId },
        data: { status: "completed", result, completedAt: new Date() },
      });

      // Handle delivery
      if (delivery.includes("knowledge")) {
        await ingestToVault(
          result,
          `Pipeline: ${task.title}`,
          ["pipeline", "agent-output", task.team.name.toLowerCase().replace(/\s+/g, "-")]
        ).catch(() => {});
      }

      return NextResponse.json({ success: true, result });
    } catch (runErr) {
      await prisma.task.update({ where: { id: taskId }, data: { status: "failed" } });
      throw runErr;
    }
  } catch (err) {
    return apiError(err);
  }
}
