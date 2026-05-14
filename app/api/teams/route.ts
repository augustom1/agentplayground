export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiError } from "@/lib/api-error";
import { initTeamBrain, saveTeamConfig } from "@/lib/brain";

// GET /api/teams — list all teams
export async function GET() {
  try {
    const teams = await prisma.agentTeam.findMany({
      include: { _count: { select: { agents: true, tasks: true, skills: true } } },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(teams);
  } catch (err) {
    return apiError(err);
  }
}

// POST /api/teams — create a new team
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body.name) return apiError("Missing required field: name", 400);
    const team = await prisma.agentTeam.create({
      data: {
        name: body.name,
        description: body.description ?? "",
        port: body.port ?? 8000,
        language: body.language ?? "Python / FastAPI",
        config: body.config ?? null,
        isImported: body.isImported ?? false,
        sourceUrl: body.sourceUrl ?? null,
      },
    });
    // Auto-create brain folder and config snapshot
    initTeamBrain(team.id, team.name, team.description).catch(() => {});
    saveTeamConfig(team.id).catch(() => {});

    return NextResponse.json(team, { status: 201 });
  } catch (err) {
    return apiError(err);
  }
}
