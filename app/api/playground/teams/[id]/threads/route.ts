export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiError } from "@/lib/api-error";
import { auth } from "@/auth";

type Params = { params: Promise<{ id: string }> };

// GET /api/playground/teams/[id]/threads
export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const session = await auth();
    if (!session?.user?.id) return apiError("Unauthorized", 401);
    const { id } = await params;

    const team = await prisma.playgroundTeam.findUnique({ where: { id } });
    if (!team) return apiError("Not found", 404);
    if (team.userId !== session.user.id) return apiError("Forbidden", 403);

    const threads = await prisma.playgroundThread.findMany({
      where: { teamId: id },
      orderBy: { updatedAt: "desc" },
      select: { id: true, title: true, createdAt: true, updatedAt: true },
    });

    return NextResponse.json(threads);
  } catch (err) {
    return apiError(err);
  }
}

// POST /api/playground/teams/[id]/threads — create new thread
export async function POST(req: NextRequest, { params }: Params) {
  try {
    const session = await auth();
    if (!session?.user?.id) return apiError("Unauthorized", 401);
    const { id } = await params;

    const team = await prisma.playgroundTeam.findUnique({ where: { id } });
    if (!team) return apiError("Not found", 404);
    if (team.userId !== session.user.id) return apiError("Forbidden", 403);

    const body = await req.json().catch(() => ({}));

    const thread = await prisma.playgroundThread.create({
      data: { teamId: id, userId: session.user.id, title: body.title ?? null, messages: [] },
    });

    return NextResponse.json(thread, { status: 201 });
  } catch (err) {
    return apiError(err);
  }
}
