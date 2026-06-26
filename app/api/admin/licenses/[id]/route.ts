import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { apiError } from "@/lib/api-error";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user || (session.user as { role?: string }).role !== "admin") {
    return apiError("Forbidden", 403);
  }

  const { id } = await params;
  await prisma.license.delete({ where: { id } });
  return new NextResponse(null, { status: 204 });
}
