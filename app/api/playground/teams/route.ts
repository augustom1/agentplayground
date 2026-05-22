export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiError } from "@/lib/api-error";
import { auth } from "@/auth";

// GET /api/playground/teams — list teams for current user
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) return apiError("Unauthorized", 401);

    const teams = await prisma.playgroundTeam.findMany({
      where: { userId: session.user.id },
      include: {
        members: {
          include: { agent: { select: { id: true, name: true, model: true } } },
        },
        _count: { select: { threads: true } },
      },
      orderBy: { updatedAt: "desc" },
    });

    return NextResponse.json(teams);
  } catch (err) {
    return apiError(err);
  }
}

// POST /api/playground/teams — create a new team
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return apiError("Unauthorized", 401);

    const body = await req.json();
    if (!body.name) return apiError("Missing required field: name", 400);

    const agentIds: string[] = body.agentIds ?? [];

    const team = await prisma.playgroundTeam.create({
      data: {
        name: body.name,
        description: body.description ?? null,
        emoji: body.emoji ?? null,
        color: body.color ?? null,
        userId: session.user.id,
        config: body.config ?? {},
        members: agentIds.length
          ? {
              create: agentIds.map((agentId: string, i: number) => ({
                agentId,
                role: body.agentRoles?.[i] ?? null,
                group: body.agentGroups?.[i] ?? null,
              })),
            }
          : undefined,
      },
      include: {
        members: {
          include: { agent: { select: { id: true, name: true, model: true } } },
        },
      },
    });

    return NextResponse.json(team, { status: 201 });
  } catch (err) {
    return apiError(err);
  }
}
