export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { apiError } from "@/lib/api-error";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return apiError("Unauthorized", 401);
  const { id } = await params;
  try {
    const playground = await prisma.playground.findFirst({
      where: { id, userId: session.user.id },
    });
    if (!playground) return apiError("Not found", 404);
    return NextResponse.json(playground);
  } catch (err) {
    return apiError(err);
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return apiError("Unauthorized", 401);
  const { id } = await params;
  try {
    const body = await req.json();
    const result = await prisma.playground.updateMany({
      where: { id, userId: session.user.id },
      data: {
        ...(body.name !== undefined ? { name: body.name.trim() } : {}),
        ...(body.icon !== undefined ? { icon: body.icon } : {}),
        ...(body.color !== undefined ? { color: body.color } : {}),
        ...(body.teamIds !== undefined ? { teamIds: body.teamIds } : {}),
        ...(body.brainTags !== undefined ? { brainTags: body.brainTags } : {}),
      },
    });
    if (result.count === 0) return apiError("Not found", 404);
    const updated = await prisma.playground.findFirst({ where: { id } });
    return NextResponse.json(updated);
  } catch (err) {
    return apiError(err);
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return apiError("Unauthorized", 401);
  const { id } = await params;
  try {
    const result = await prisma.playground.deleteMany({
      where: { id, userId: session.user.id },
    });
    if (result.count === 0) return apiError("Not found", 404);
    return NextResponse.json({ ok: true });
  } catch (err) {
    return apiError(err);
  }
}
