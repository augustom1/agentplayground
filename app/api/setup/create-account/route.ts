import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { apiError } from "@/lib/api-error";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  try {
    // Security: reject if any user already exists
    const count = await prisma.user.count();
    if (count > 0) {
      return apiError("Setup already complete", 403);
    }

    const body = await req.json() as { name?: string; email?: string; password?: string };
    const { name, email, password } = body;

    if (!email)    return apiError("Email is required", 400);
    if (!password) return apiError("Password is required", 400);
    if (password.length < 8) return apiError("Password must be at least 8 characters", 400);

    const passwordHash = await bcrypt.hash(password, 12);

    const user = await prisma.user.create({
      data: {
        email:        email.toLowerCase().trim(),
        name:         name?.trim() || null,
        passwordHash,
        role:         "admin",
        plan:         "pro",
      },
      select: { id: true, email: true, name: true, role: true },
    });

    await prisma.userCredits.create({
      data: { userId: user.id, balance: 5000, lifetimePurchased: 0, lifetimeUsed: 0 },
    });

    return NextResponse.json({ success: true, user }, { status: 201 });
  } catch (err) {
    return apiError(err);
  }
}
