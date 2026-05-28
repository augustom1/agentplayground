export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { apiError } from "@/lib/api-error";
import { prisma } from "@/lib/prisma";

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return apiError("Unauthorized", 401);

  const { id } = await params;
  const body = await req.json() as { status?: string };
  const status = body.status;

  if (!status || !["open", "snoozed", "done"].includes(status)) {
    return apiError("status must be open | snoozed | done", 400);
  }

  const action = await prisma.pendingAction.update({
    where: { id },
    data: { status },
    select: { id: true, status: true },
  });

  return NextResponse.json(action);
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user?.id) return apiError("Unauthorized", 401);

  const { id } = await params;
  await prisma.pendingAction.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
