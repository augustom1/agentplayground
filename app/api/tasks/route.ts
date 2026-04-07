export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiError } from "@/lib/api-error";

// GET /api/tasks — list tasks (optionally filter by teamId, status)
export async function GET(req: NextRequest) {
  try {
    const teamId = req.nextUrl.searchParams.get("teamId");
    const status = req.nextUrl.searchParams.get("status");
    const tasks = await prisma.task.findMany({
      where: {
        ...(teamId ? { teamId } : {}),
        ...(status ? { status } : {}),
      },
      include: { team: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    return NextResponse.json(tasks);
  } catch (err) {
    return apiError(err);
  }
}

// POST /api/tasks — create a task
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body.title) return apiError("Missing required field: title", 400);
    if (!body.teamId) return apiError("Missing required field: teamId", 400);
    const task = await prisma.task.create({
      data: {
        title: body.title,
        description: body.description ?? null,
        prompt: body.prompt ?? null,
        status: body.status ?? "pending",
        priority: body.priority ?? "medium",
        teamId: body.teamId,
      },
    });
    return NextResponse.json(task, { status: 201 });
  } catch (err) {
    return apiError(err);
  }
}
