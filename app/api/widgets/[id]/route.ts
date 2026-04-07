export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiError } from "@/lib/api-error";

// PATCH /api/widgets/[id] — update position or other fields
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json() as {
      position?: number;
      title?: string;
      size?: string;
    };

    const widget = await prisma.widget.update({
      where: { id },
      data: {
        ...(body.position !== undefined && { position: body.position }),
        ...(body.title && { title: body.title }),
        ...(body.size && { size: body.size }),
      },
    });

    return NextResponse.json(widget);
  } catch (err) {
    return apiError(err);
  }
}

// DELETE /api/widgets/[id]
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await prisma.widget.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (err) {
    return apiError(err);
  }
}
