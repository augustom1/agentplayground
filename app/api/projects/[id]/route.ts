export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { apiError } from "@/lib/api-error";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return new NextResponse("Unauthorized", { status: 401 });

  const { id } = await params;
  const project = await prisma.project.findUnique({ where: { id } });
  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json(project);
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) return new NextResponse("Unauthorized", { status: 401 });

    const { id } = await params;
    const body = await req.json();
    const { name, description, status, type, deliveryChannel } = body;

    const existing = await prisma.project.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

    const project = await prisma.project.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(description !== undefined && { description }),
        ...(status !== undefined && { status }),
        ...(type !== undefined && { type }),
        ...(deliveryChannel !== undefined && { deliveryChannel }),
      },
    });

    return NextResponse.json(project);
  } catch (err) {
    return apiError(err);
  }
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await auth();
    if (!session?.user?.id) return new NextResponse("Unauthorized", { status: 401 });

    const { id } = await params;
    const existing = await prisma.project.findUnique({ where: { id } });
    if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

    await prisma.project.delete({ where: { id } });
    return new NextResponse(null, { status: 204 });
  } catch (err) {
    return apiError(err);
  }
}
