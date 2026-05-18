export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { apiError } from "@/lib/api-error";

type RouteContext = { params: Promise<{ id: string }> };

// PATCH /api/meetings/[id]
export async function PATCH(req: NextRequest, context: RouteContext) {
  try {
    const session = await auth();
    if (!session?.user?.id) return new Response("Unauthorized", { status: 401 });

    const { id } = await context.params;
    const body = await req.json();

    const data: {
      title?: string;
      description?: string | null;
      scheduledFor?: Date;
      reminderMins?: number;
      participants?: unknown;
      status?: string;
    } = {};

    if (body.title) data.title = body.title;
    if ("description" in body) data.description = body.description;
    if (body.scheduledFor) data.scheduledFor = new Date(body.scheduledFor);
    if (body.reminderMins !== undefined) data.reminderMins = body.reminderMins;
    if (body.participants) data.participants = body.participants;
    if (body.status) data.status = body.status;

    const meeting = await prisma.meeting.update({ where: { id }, data });
    return NextResponse.json(meeting);
  } catch (err) {
    return apiError(err);
  }
}

// DELETE /api/meetings/[id]
export async function DELETE(_req: NextRequest, context: RouteContext) {
  try {
    const session = await auth();
    if (!session?.user?.id) return new Response("Unauthorized", { status: 401 });

    const { id } = await context.params;
    await prisma.meeting.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (err) {
    return apiError(err);
  }
}
