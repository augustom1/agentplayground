export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ teamId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return new NextResponse("Unauthorized", { status: 401 });

  const { teamId } = await params;
  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type");

  // Resolve AgentTeam IDs for members of this playground
  const members = await prisma.playgroundMember.findMany({
    where: { teamId },
    include: { agent: { select: { teamId: true } } },
  });
  const agentTeamIds = [...new Set(members.map((m) => m.agent.teamId))];

  if (type === "task_queue") {
    const tasks = agentTeamIds.length > 0
      ? await prisma.task.findMany({
          where: {
            teamId: { in: agentTeamIds },
            status: { in: ["running", "pending"] },
          },
          orderBy: [{ status: "asc" }, { createdAt: "desc" }],
          take: 20,
          select: {
            id: true,
            title: true,
            status: true,
            priority: true,
            teamId: true,
            createdAt: true,
          },
        })
      : [];

    const agentTeams = agentTeamIds.length > 0
      ? await prisma.agentTeam.findMany({
          where: { id: { in: agentTeamIds } },
          select: { id: true, name: true },
        })
      : [];
    const nameMap = new Map(agentTeams.map((t) => [t.id, t.name]));

    return NextResponse.json({
      tasks: tasks.map((t) => ({ ...t, teamName: nameMap.get(t.teamId) ?? "Unknown" })),
    });
  }

  if (type === "project_pipeline") {
    const projectTeams = agentTeamIds.length > 0
      ? await prisma.projectTeam.findMany({ where: { teamId: { in: agentTeamIds } } })
      : [];
    const projectIds = [...new Set(projectTeams.map((pt) => pt.projectId))];
    const projects = projectIds.length > 0
      ? await prisma.project.findMany({
          where: { id: { in: projectIds }, status: { not: "archived" } },
          orderBy: { updatedAt: "desc" },
          take: 10,
          select: { id: true, name: true, status: true, type: true, deliveryChannel: true, createdAt: true },
        })
      : [];
    return NextResponse.json({ projects });
  }

  return NextResponse.json({ error: "Unknown widget type" }, { status: 400 });
}
