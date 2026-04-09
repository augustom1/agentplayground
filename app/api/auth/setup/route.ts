/**
 * POST /api/auth/setup — create the first admin account.
 * Only works when 0 users exist in the database.
 * Disabled automatically once any user is created.
 */
export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { apiError } from "@/lib/api-error";

// GET — check if setup is still needed
export async function GET() {
  try {
    const count = await prisma.user.count();
    return NextResponse.json({ needsSetup: count === 0 });
  } catch (err) {
    return apiError(err);
  }
}

// POST — create first admin
export async function POST(req: NextRequest) {
  try {
    // Guard: only allowed when no users exist
    const count = await prisma.user.count();
    if (count > 0) {
      return apiError("Setup already complete. Use the admin panel to create users.", 403);
    }

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
        role:         "admin",
        plan:         "pro",   // first user gets full access
      },
      select: { id: true, email: true, name: true, role: true, plan: true },
    });

    // Seed initial pro plan credits (5,000) so billing page isn't empty
    await prisma.userCredits.create({
      data: {
        userId: user.id,
        balance: 5000,
        lifetimePurchased: 0,
        lifetimeUsed: 0,
      },
    });

    return NextResponse.json({ success: true, user }, { status: 201 });
  } catch (err) {
    return apiError(err);
  }
}
