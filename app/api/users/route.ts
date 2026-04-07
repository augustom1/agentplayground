/**
 * /api/users — admin-only user management
 * Middleware already enforces admin role before requests reach here.
 */
export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { apiError } from "@/lib/api-error";

// GET /api/users — list all users
export async function GET() {
  try {
    const users = await prisma.user.findMany({
      select: {
        id: true, name: true, email: true,
        role: true, plan: true, planExpiresAt: true,
        active: true, createdAt: true,
      },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(users);
  } catch (err) {
    return apiError(err);
  }
}

// POST /api/users — create a new user
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body.email)    return apiError("Missing required field: email", 400);
    if (!body.password) return apiError("Missing required field: password", 400);
    if (body.password.length < 8) {
      return apiError("Password must be at least 8 characters", 400);
    }

    const passwordHash = await bcrypt.hash(body.password, 12);

    const user = await prisma.user.create({
      data: {
        email:        body.email.toLowerCase().trim(),
        name:         body.name ?? null,
        passwordHash,
        role:         body.role   ?? "user",
        plan:         body.plan   ?? "free",
        planExpiresAt: body.planExpiresAt ? new Date(body.planExpiresAt) : null,
        active:       body.active ?? true,
      },
      select: {
        id: true, name: true, email: true,
        role: true, plan: true, planExpiresAt: true, active: true, createdAt: true,
      },
    });

    return NextResponse.json(user, { status: 201 });
  } catch (err) {
    // Unique constraint = duplicate email
    const msg = err instanceof Error ? err.message : "";
    if (msg.includes("Unique constraint")) {
      return apiError("A user with that email already exists", 409);
    }
    return apiError(err);
  }
}
