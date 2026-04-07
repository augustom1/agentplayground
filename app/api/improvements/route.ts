export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiError } from "@/lib/api-error";

// GET /api/improvements
export async function GET(req: NextRequest) {
  try {
    const category = req.nextUrl.searchParams.get("category");
    const improvements = await prisma.improvement.findMany({
      where: category ? { category } : undefined,
      orderBy: { createdAt: "desc" },
      take: 100,
    });
    return NextResponse.json(improvements);
  } catch (err) {
    return apiError(err);
  }
}

// POST /api/improvements
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body.title) return apiError("Missing required field: title", 400);
    if (!body.description) return apiError("Missing required field: description", 400);
    const improvement = await prisma.improvement.create({
      data: {
        title: body.title,
        description: body.description,
        category: body.category ?? "general",
        impact: body.impact ?? "medium",
        source: body.source ?? null,
        applied: body.applied ?? false,
      },
    });
    return NextResponse.json(improvement, { status: 201 });
  } catch (err) {
    return apiError(err);
  }
}
