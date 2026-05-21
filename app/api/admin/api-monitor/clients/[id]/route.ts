export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiError } from "@/lib/api-error";
import { auth } from "@/auth";

type Params = { params: Promise<{ id: string }> };

async function requireAdmin() {
  const session = await auth();
  return session?.user?.role === "admin";
}

// PATCH /api/admin/api-monitor/clients/[id]
export async function PATCH(req: NextRequest, { params }: Params) {
  if (!await requireAdmin()) return apiError("Forbidden", 403);
  const { id } = await params;
  try {
    const body = await req.json();
    const client = await prisma.apiClient.update({
      where: { id },
      data: {
        ...(body.name !== undefined && { name: body.name }),
        ...(body.rateLimit !== undefined && { rateLimit: body.rateLimit }),
        ...(body.permissions !== undefined && { permissions: body.permissions }),
        ...(body.isActive !== undefined && { isActive: body.isActive }),
      },
    });
    const { apiKey: _, ...safe } = client;
    return NextResponse.json(safe);
  } catch (err) {
    return apiError(err);
  }
}

// DELETE /api/admin/api-monitor/clients/[id]
export async function DELETE(_req: NextRequest, { params }: Params) {
  if (!await requireAdmin()) return apiError("Forbidden", 403);
  const { id } = await params;
  try {
    await prisma.apiClient.delete({ where: { id } });
    return NextResponse.json({ deleted: true });
  } catch (err) {
    return apiError(err);
  }
}
