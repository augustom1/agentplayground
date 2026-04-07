export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiError } from "@/lib/api-error";

// GET /api/cron — execute due recurring tasks
// Protected by Authorization: Bearer <CRON_SECRET>
export async function GET(req: NextRequest) {
  try {
    // Auth guard
    const secret = process.env.CRON_SECRET;
    if (secret) {
      const auth = req.headers.get("authorization");
      if (auth !== `Bearer ${secret}`) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      }
    }

    const now = new Date();

    // Find enabled recurring tasks that are due
    const dueTasks = await prisma.recurringTask.findMany({
      where: {
        enabled: true,
        OR: [{ nextRunAt: { lte: now } }, { nextRunAt: null }],
      },
      include: { team: { select: { name: true } } },
    });

    if (dueTasks.length === 0) {
      return NextResponse.json({ dispatched: 0, message: "No tasks due" });
    }

    const dispatched: string[] = [];
    const baseUrl =
      process.env.NEXT_PUBLIC_APP_URL ||
      `http://localhost:${process.env.PORT ?? 3000}`;

    for (const task of dueTasks) {
      try {
        // Fire-and-forget dispatch to /api/task
        fetch(`${baseUrl}/api/task`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            target: task.team.name,
            prompt: task.prompt ?? task.title,
          }),
        }).catch(() => {}); // intentionally non-blocking

        // Compute next run (simple: add 1 day/week/month based on cron heuristic,
        // or use 1h intervals if cron-parser unavailable)
        const nextRunAt = computeNextRun(task.cron, task.timezone, now);

        await prisma.recurringTask.update({
          where: { id: task.id },
          data: { lastRunAt: now, nextRunAt },
        });

        await prisma.activityLog.create({
          data: {
            action: `Recurring task "${task.title}" dispatched`,
            type: "task",
            teamName: task.team.name,
            teamId: task.teamId,
            details: `Cron: ${task.cron}`,
          },
        });

        dispatched.push(task.title);
      } catch (taskErr) {
        console.error(`Failed to dispatch task ${task.id}:`, taskErr);
      }
    }

    return NextResponse.json({ dispatched: dispatched.length, tasks: dispatched });
  } catch (err) {
    return apiError(err);
  }
}

/** Best-effort next-run calculator. Falls back to +1h if cron-parser unavailable. */
function computeNextRun(cron: string, _timezone: string, from: Date): Date {
  try {
    // Try to use cron-parser if installed
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const { parseExpression } = require("cron-parser") as {
      parseExpression: (c: string, opts?: { currentDate: Date }) => { next: () => { toDate: () => Date } };
    };
    return parseExpression(cron, { currentDate: from }).next().toDate();
  } catch {
    // Fallback: add 1 hour
    return new Date(from.getTime() + 60 * 60 * 1000);
  }
}
