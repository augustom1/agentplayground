export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { apiError } from "@/lib/api-error";
import { prisma } from "@/lib/prisma";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ noteId: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return apiError("Unauthorized", 401);

  const { noteId } = await params;
  const note = await prisma.userNote.findFirst({ where: { id: noteId, userId: session.user.id } });
  if (!note) return apiError("Not found", 404);

  await prisma.userNote.delete({ where: { id: noteId } });
  return NextResponse.json({ ok: true });
}
