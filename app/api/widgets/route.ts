export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiError } from "@/lib/api-error";

// GET /api/widgets — list all dashboard widgets
export async function GET() {
  try {
    const widgets = await prisma.widget.findMany({
      orderBy: { position: "asc" },
      include: { team: { select: { name: true } } },
    });
    return NextResponse.json(widgets);
  } catch (err) {
    return apiError(err);
  }
}

// POST /api/widgets — create a widget
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body.type) return apiError("Missing required field: type", 400);
    if (!body.title) return apiError("Missing required field: title", 400);
    const widget = await prisma.widget.create({
      data: {
        type: body.type,
        title: body.title,
        icon: body.icon ?? "zap",
        size: body.size ?? "md",
        position: body.position ?? 0,
        config: body.config ?? null,
        teamId: body.teamId ?? null,
      },
    });
    return NextResponse.json(widget, { status: 201 });
  } catch (err) {
    return apiError(err);
  }
}

// DELETE /api/widgets — delete a widget (pass id as query param)
export async function DELETE(req: NextRequest) {
  try {
    const id = req.nextUrl.searchParams.get("id");
    if (!id) return apiError("Missing required query param: id", 400);
    await prisma.widget.delete({ where: { id } });
    return NextResponse.json({ deleted: true });
  } catch (err) {
    return apiError(err);
  }
}
