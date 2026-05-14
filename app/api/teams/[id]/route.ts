export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { saveTeamConfig } from "@/lib/brain";

type Params = { params: Promise<{ id: string }> };

// GET /api/teams/:id
export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  const team = await prisma.agentTeam.findUnique({
    where: { id },
    include: {
      agents: true,
      skills: true,
      cliFunctions: true,
      _count: { select: { tasks: true, scheduledJobs: true } },
    },
  });
  if (!team) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(team);
}

// PATCH /api/teams/:id
export async function PATCH(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const body = await req.json();
  const team = await prisma.agentTeam.update({
    where: { id },
    data: body,
  });
  saveTeamConfig(team.id).catch(() => {});
  return NextResponse.json(team);
}

// DELETE /api/teams/:id
export async function DELETE(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  await prisma.agentTeam.delete({ where: { id } });
  return NextResponse.json({ deleted: true });
}
