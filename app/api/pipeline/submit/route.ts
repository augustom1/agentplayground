export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { apiError } from "@/lib/api-error";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user) return apiError("Unauthorized", 401);

    const body = await req.json();
    const { title, content, instructions, teamId, delivery } = body;

    if (!title?.trim()) return apiError("title is required", 400);
    if (!content?.trim()) return apiError("content is required", 400);
    if (!teamId) return apiError("teamId is required", 400);

    const team = await prisma.agentTeam.findUnique({ where: { id: teamId } });
    if (!team) return apiError("Team not found", 404);

    const meta = JSON.stringify({
      __pipeline: true,
      instructions: instructions ?? "",
      delivery: Array.isArray(delivery) ? delivery : ["knowledge"],
    });

    const task = await prisma.task.create({
      data: {
        title: title.trim(),
        description: content.trim(),
        prompt: meta,
        status: "pending",
        priority: "medium",
        teamId,
      },
    });

    return NextResponse.json({ id: task.id, title: task.title, status: task.status });
  } catch (err) {
    return apiError(err);
  }
}
