export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiError } from "@/lib/api-error";

// PATCH /api/improvements/[id] — toggle applied or update fields
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json() as {
      applied?: boolean;
      title?: string;
      description?: string;
      category?: string;
      impact?: string;
    };

    const improvement = await prisma.improvement.update({
      where: { id },
      data: {
        ...(body.applied !== undefined && { applied: body.applied }),
        ...(body.title && { title: body.title }),
        ...(body.description && { description: body.description }),
        ...(body.category && { category: body.category }),
        ...(body.impact && { impact: body.impact }),
      },
    });

    return NextResponse.json(improvement);
  } catch (err) {
    return apiError(err);
  }
}

// DELETE /api/improvements/[id]
export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    await prisma.improvement.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (err) {
    return apiError(err);
  }
}
