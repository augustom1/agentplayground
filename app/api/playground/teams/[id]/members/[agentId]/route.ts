export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiError } from "@/lib/api-error";
import { auth } from "@/auth";

type Params = { params: Promise<{ id: string; agentId: string }> };

// DELETE /api/playground/teams/[id]/members/[agentId]
export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const session = await auth();
    if (!session?.user?.id) return apiError("Unauthorized", 401);
    const { id, agentId } = await params;

    const team = await prisma.playgroundTeam.findUnique({ where: { id } });
    if (!team) return apiError("Not found", 404);
    if (team.userId !== session.user.id) return apiError("Forbidden", 403);

    await prisma.playgroundMember.deleteMany({ where: { teamId: id, agentId } });
    return NextResponse.json({ deleted: true });
  } catch (err) {
    return apiError(err);
  }
}
