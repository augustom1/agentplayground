export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { apiError } from "@/lib/api-error";

// PATCH /api/redirect-links/<id> — toggle active or edit url/label
export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return apiError("Unauthorized", 401);
  try {
    const { id } = await params;
    const owned = await prisma.redirectLink.findFirst({ where: { id, userId: session.user.id }, select: { id: true } });
    if (!owned) return apiError("Not found", 404);

    const body = await req.json();
    const data: { active?: boolean; url?: string; label?: string } = {};
    if (typeof body.active === "boolean") data.active = body.active;
    if (typeof body.url === "string" && /^(https?:\/\/|mailto:|tel:)/i.test(body.url.trim())) data.url = body.url.trim();
    if (typeof body.label === "string") data.label = body.label.trim().slice(0, 80);

    const link = await prisma.redirectLink.update({
      where: { id },
      data,
      select: { id: true, code: true, url: true, label: true, clicks: true, active: true, createdAt: true },
    });
    return NextResponse.json(link);
  } catch (err) {
    return apiError(err);
  }
}

// DELETE /api/redirect-links/<id>
export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const session = await auth();
  if (!session?.user?.id) return apiError("Unauthorized", 401);
  try {
    const { id } = await params;
    const owned = await prisma.redirectLink.findFirst({ where: { id, userId: session.user.id }, select: { id: true } });
    if (!owned) return apiError("Not found", 404);
    await prisma.redirectLink.delete({ where: { id } });
    return NextResponse.json({ ok: true });
  } catch (err) {
    return apiError(err);
  }
}
