export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { apiError } from "@/lib/api-error";

type Params = { params: Promise<{ id: string }> };

// PATCH /api/users/:id — update user (role, plan, active, name, password)
export async function PATCH(req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const body = await req.json();

    const data: Record<string, unknown> = {};
    if (body.name        !== undefined) data.name         = body.name;
    if (body.role        !== undefined) data.role         = body.role;
    if (body.plan        !== undefined) data.plan         = body.plan;
    if (body.active      !== undefined) data.active       = body.active;
    if (body.planExpiresAt !== undefined) {
      data.planExpiresAt = body.planExpiresAt ? new Date(body.planExpiresAt) : null;
    }
    if (body.password) {
      if (body.password.length < 8) return apiError("Password must be at least 8 characters", 400);
      data.passwordHash = await bcrypt.hash(body.password, 12);
    }

    const user = await prisma.user.update({
      where: { id },
      data,
      select: {
        id: true, name: true, email: true,
        role: true, plan: true, planExpiresAt: true, active: true,
      },
    });
    return NextResponse.json(user);
  } catch (err) {
    return apiError(err);
  }
}

// DELETE /api/users/:id — delete a user
export async function DELETE(_req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    await prisma.user.delete({ where: { id } });
    return NextResponse.json({ deleted: true });
  } catch (err) {
    return apiError(err);
  }
}
