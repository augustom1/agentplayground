export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiError } from "@/lib/api-error";
import { auth } from "@/auth";

type Params = { params: Promise<{ id: string }> };

async function ownerCheck(id: string, userId: string) {
  const team = await prisma.playgroundTeam.findUnique({ where: { id } });
  if (!team) return null;
  if (team.userId !== userId) return false;
  return team;
}

// GET /api/playground/teams/[id]
export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const session = await auth();
    if (!session?.user?.id) return apiError("Unauthorized", 401);
    const { id } = await params;

    const team = await prisma.playgroundTeam.findUnique({
      where: { id },
      include: {
        members: {
          include: {
            agent: {
              select: { id: true, name: true, model: true, description: true, capabilities: true },
            },
          },
        },
        threads: {
          orderBy: { updatedAt: "desc" },
          take: 20,
          select: { id: true, title: true, createdAt: true, updatedAt: true },
        },
      },
    });

    if (!team) return apiError("Not found", 404);
    if (team.userId !== session.user.id) return apiError("Forbidden", 403);

    return NextResponse.json(team);
  } catch (err) {
    return apiError(err);
  }
}

// PATCH /api/playground/teams/[id]
export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const session = await auth();
    if (!session?.user?.id) return apiError("Unauthorized", 401);
    const { id } = await params;

    const check = await ownerCheck(id, session.user.id);
    if (check === null) return apiError("Not found", 404);
    if (check === false) return apiError("Forbidden", 403);

    const body = await req.json();
    const { name, description, emoji, color, config } = body;

    const team = await prisma.playgroundTeam.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(description !== undefined && { description }),
        ...(emoji !== undefined && { emoji }),
        ...(color !== undefined && { color }),
        ...(config !== undefined && { config }),
      },
    });

    return NextResponse.json(team);
  } catch (err) {
    return apiError(err);
  }
}

// DELETE /api/playground/teams/[id]
export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const session = await auth();
    if (!session?.user?.id) return apiError("Unauthorized", 401);
    const { id } = await params;

    const check = await ownerCheck(id, session.user.id);
    if (check === null) return apiError("Not found", 404);
    if (check === false) return apiError("Forbidden", 403);

    await prisma.playgroundTeam.delete({ where: { id } });
    return NextResponse.json({ deleted: true });
  } catch (err) {
    return apiError(err);
  }
}
