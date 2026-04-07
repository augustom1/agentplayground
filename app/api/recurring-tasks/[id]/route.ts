export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiError } from "@/lib/api-error";

type RouteContext = { params: Promise<{ id: string }> };

// PATCH /api/recurring-tasks/[id]
export async function PATCH(req: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    const body = await req.json();

    const data: {
      enabled?: boolean;
      title?: string;
      description?: string;
      prompt?: string;
      cron?: string;
      timezone?: string;
    } = {};

    if (typeof body.enabled === "boolean") data.enabled = body.enabled;
    if (typeof body.title === "string") data.title = body.title;
    if (typeof body.description === "string") data.description = body.description;
    if (typeof body.prompt === "string") data.prompt = body.prompt;
    if (typeof body.cron === "string") data.cron = body.cron;
    if (typeof body.timezone === "string") data.timezone = body.timezone;

    const task = await prisma.recurringTask.update({
      where: { id },
      data,
      include: { team: { select: { name: true } } },
    });
    return NextResponse.json(task);
  } catch (err) {
    return apiError(err);
  }
}

// DELETE /api/recurring-tasks/[id]
export async function DELETE(_req: NextRequest, context: RouteContext) {
  try {
    const { id } = await context.params;
    await prisma.recurringTask.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (err) {
    return apiError(err);
  }
}
