export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiError } from "@/lib/api-error";
import { auth } from "@/auth";

type Params = { params: Promise<{ id: string; threadId: string }> };

// GET /api/playground/teams/[id]/threads/[threadId]
export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const session = await auth();
    if (!session?.user?.id) return apiError("Unauthorized", 401);
    const { id, threadId } = await params;

    const team = await prisma.playgroundTeam.findUnique({ where: { id } });
    if (!team) return apiError("Not found", 404);
    if (team.userId !== session.user.id) return apiError("Forbidden", 403);

    const thread = await prisma.playgroundThread.findUnique({ where: { id: threadId } });
    if (!thread || thread.teamId !== id) return apiError("Not found", 404);

    return NextResponse.json(thread);
  } catch (err) {
    return apiError(err);
  }
}

// PATCH /api/playground/teams/[id]/threads/[threadId] — update title
export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const session = await auth();
    if (!session?.user?.id) return apiError("Unauthorized", 401);
    const { id, threadId } = await params;

    const team = await prisma.playgroundTeam.findUnique({ where: { id } });
    if (!team) return apiError("Not found", 404);
    if (team.userId !== session.user.id) return apiError("Forbidden", 403);

    const body = await req.json();
    const thread = await prisma.playgroundThread.update({
      where: { id: threadId },
      data: { title: body.title },
    });

    return NextResponse.json(thread);
  } catch (err) {
    return apiError(err);
  }
}

// DELETE /api/playground/teams/[id]/threads/[threadId]
export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const session = await auth();
    if (!session?.user?.id) return apiError("Unauthorized", 401);
    const { id, threadId } = await params;

    const team = await prisma.playgroundTeam.findUnique({ where: { id } });
    if (!team) return apiError("Not found", 404);
    if (team.userId !== session.user.id) return apiError("Forbidden", 403);

    await prisma.playgroundThread.delete({ where: { id: threadId } });
    return NextResponse.json({ deleted: true });
  } catch (err) {
    return apiError(err);
  }
}
