export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { apiError } from "@/lib/api-error";

export async function GET() {
  try {
    const session = await auth();
    if (!session?.user) return apiError("Unauthorized", 401);

    const tasks = await prisma.task.findMany({
      where: { prompt: { contains: '"__pipeline":true' } },
      include: { team: { select: { name: true } } },
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    const jobs = tasks.map((t) => {
      let meta: { instructions?: string; delivery?: string[] } = {};
      try { meta = JSON.parse(t.prompt ?? "{}"); } catch {}
      return {
        id: t.id,
        title: t.title,
        status: t.status,
        priority: t.priority,
        teamName: t.team.name,
        createdAt: t.createdAt.toISOString(),
        result: t.result,
        instructions: meta.instructions ?? "",
        delivery: meta.delivery ?? ["knowledge"],
      };
    });

    return NextResponse.json({ jobs });
  } catch (err) {
    return apiError(err);
  }
}
