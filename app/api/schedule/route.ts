export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiError } from "@/lib/api-error";

// GET /api/schedule — list scheduled jobs (optionally filter by month/year)
export async function GET(req: NextRequest) {
  try {
    const year = req.nextUrl.searchParams.get("year");
    const month = req.nextUrl.searchParams.get("month");

    let where = {};
    if (year && month) {
      const start = new Date(parseInt(year), parseInt(month), 1);
      const end = new Date(parseInt(year), parseInt(month) + 1, 0, 23, 59, 59);
      where = { scheduledFor: { gte: start, lte: end } };
    }

    const jobs = await prisma.scheduledJob.findMany({
      where,
      orderBy: { scheduledFor: "asc" },
    });
    return NextResponse.json(jobs);
  } catch (err) {
    return apiError(err);
  }
}

// POST /api/schedule — create a scheduled job
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body.title) return apiError("Missing required field: title", 400);
    if (!body.scheduledFor) return apiError("Missing required field: scheduledFor", 400);
    if (!body.teamId) return apiError("Missing required field: teamId", 400);
    if (!body.teamName) return apiError("Missing required field: teamName", 400);
    const job = await prisma.scheduledJob.create({
      data: {
        title: body.title,
        description: body.description ?? null,
        scheduledFor: new Date(body.scheduledFor),
        recurring: body.recurring ?? "none",
        status: body.status ?? "pending",
        isOffHours: body.isOffHours ?? false,
        teamId: body.teamId,
        teamName: body.teamName,
      },
    });
    return NextResponse.json(job, { status: 201 });
  } catch (err) {
    return apiError(err);
  }
}
