export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiError } from "@/lib/api-error";

// GET /api/recurring-tasks
export async function GET(req: NextRequest) {
  try {
    const teamId = req.nextUrl.searchParams.get("teamId");
    const tasks = await prisma.recurringTask.findMany({
      where: teamId ? { teamId } : undefined,
      include: { team: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(tasks);
  } catch (err) {
    return apiError(err);
  }
}

// POST /api/recurring-tasks
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body.title) return apiError("Missing required field: title", 400);
    if (!body.cron) return apiError("Missing required field: cron", 400);
    if (!body.teamId) return apiError("Missing required field: teamId", 400);
    const task = await prisma.recurringTask.create({
      data: {
        title: body.title,
        description: body.description ?? null,
        prompt: body.prompt ?? null,
        cron: body.cron,
        timezone: body.timezone ?? "UTC",
        enabled: body.enabled ?? true,
        teamId: body.teamId,
      },
    });
    return NextResponse.json(task, { status: 201 });
  } catch (err) {
    return apiError(err);
  }
}
