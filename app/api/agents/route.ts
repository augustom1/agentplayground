export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiError } from "@/lib/api-error";

// GET /api/agents — list all agents (optionally filter by teamId)
export async function GET(req: NextRequest) {
  try {
    const teamId = req.nextUrl.searchParams.get("teamId");
    const agents = await prisma.agent.findMany({
      where: teamId ? { teamId } : undefined,
      include: { team: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(agents);
  } catch (err) {
    return apiError(err);
  }
}

// POST /api/agents — create an agent
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body.name) return apiError("Missing required field: name", 400);
    if (!body.teamId) return apiError("Missing required field: teamId", 400);
    const agent = await prisma.agent.create({
      data: {
        name: body.name,
        description: body.description ?? null,
        model: body.model ?? "claude-sonnet-4-6",
        capabilities: body.capabilities ?? [],
        systemPrompt: body.systemPrompt ?? null,
        temperature: body.temperature ?? 0.7,
        maxTokens: body.maxTokens ?? 4096,
        teamId: body.teamId,
      },
    });
    return NextResponse.json(agent, { status: 201 });
  } catch (err) {
    return apiError(err);
  }
}
