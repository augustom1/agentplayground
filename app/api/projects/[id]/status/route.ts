export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return new NextResponse("Unauthorized", { status: 401 });

  const { id } = await params;
  const project = await prisma.project.findUnique({ where: { id } });
  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const projectTeams = await prisma.projectTeam.findMany({ where: { projectId: id } });
  const teamIds = projectTeams.map((pt) => pt.teamId);

  const [teams, recentTasks, outputs] = await Promise.all([
    teamIds.length > 0
      ? prisma.agentTeam.findMany({
          where: { id: { in: teamIds } },
          select: { id: true, name: true, status: true, lastActivity: true, tasksCompleted: true },
        })
      : Promise.resolve([]),
    teamIds.length > 0
      ? prisma.task.findMany({
          where: { teamId: { in: teamIds } },
          orderBy: { createdAt: "desc" },
          take: 30,
          select: { id: true, title: true, status: true, priority: true, teamId: true, createdAt: true },
        })
      : Promise.resolve([]),
    prisma.projectOutput.findMany({
      where: { projectId: id },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
  ]);

  const teamMap = new Map(teams.map((t) => [t.id, t]));

  const workstreams = projectTeams.map((pt) => {
    const team = teamMap.get(pt.teamId);
    const tasks = recentTasks.filter((t) => t.teamId === pt.teamId);
    return {
      teamId: pt.teamId,
      teamName: team?.name ?? "Unknown Team",
      role: pt.role ?? null,
      teamStatus: team?.status ?? "unknown",
      lastActivity: team?.lastActivity ?? "Never",
      tasks: {
        running: tasks.filter((t) => t.status === "running").length,
        completed: tasks.filter((t) => t.status === "completed").length,
        pending: tasks.filter((t) => t.status === "pending").length,
        failed: tasks.filter((t) => t.status === "failed").length,
        total: tasks.length,
        recent: tasks.slice(0, 5).map((t) => ({
          id: t.id,
          title: t.title,
          status: t.status,
          priority: t.priority,
        })),
      },
    };
  });

  return NextResponse.json({ project, workstreams, outputs });
}
