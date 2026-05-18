export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { apiError } from "@/lib/api-error";

// GET /api/meetings
// ?upcoming=true  — only future meetings
// ?reminder=true  — only meetings within their reminder window
export async function GET(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return new Response("Unauthorized", { status: 401 });

    const upcoming = req.nextUrl.searchParams.get("upcoming") === "true";
    const now = new Date();

    const meetings = await prisma.meeting.findMany({
      where: upcoming
        ? { scheduledFor: { gte: now }, status: { not: "cancelled" } }
        : { status: { not: "cancelled" } },
      orderBy: { scheduledFor: "asc" },
      take: 100,
    });

    return NextResponse.json(meetings);
  } catch (err) {
    return apiError(err);
  }
}

// POST /api/meetings
export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) return new Response("Unauthorized", { status: 401 });

    const body = await req.json();
    if (!body.title) return apiError("title is required", 400);
    if (!body.scheduledFor) return apiError("scheduledFor is required", 400);

    const meeting = await prisma.meeting.create({
      data: {
        title: body.title,
        description: body.description ?? null,
        scheduledFor: new Date(body.scheduledFor),
        reminderMins: body.reminderMins ?? 15,
        participants: body.participants ?? [],
        createdBy: session.user.id,
      },
    });

    return NextResponse.json(meeting, { status: 201 });
  } catch (err) {
    return apiError(err);
  }
}
