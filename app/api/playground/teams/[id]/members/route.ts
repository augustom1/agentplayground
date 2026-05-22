export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiError } from "@/lib/api-error";
import { auth } from "@/auth";

type Params = { params: Promise<{ id: string }> };

// POST /api/playground/teams/[id]/members — add agent to team
export async function POST(req: NextRequest, { params }: Params) {
  try {
    const session = await auth();
    if (!session?.user?.id) return apiError("Unauthorized", 401);
    const { id } = await params;

    const team = await prisma.playgroundTeam.findUnique({ where: { id } });
    if (!team) return apiError("Not found", 404);
    if (team.userId !== session.user.id) return apiError("Forbidden", 403);

    const body = await req.json();
    if (!body.agentId) return apiError("Missing agentId", 400);

    const member = await prisma.playgroundMember.create({
      data: { teamId: id, agentId: body.agentId, role: body.role ?? null, group: body.group ?? null },
      include: { agent: { select: { id: true, name: true, model: true } } },
    });

    return NextResponse.json(member, { status: 201 });
  } catch (err) {
    return apiError(err);
  }
}
