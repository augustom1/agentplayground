/**
 * POST /api/auth/register
 *
 * Self-registration endpoint. Creates a new user with plan: "free".
 * Seeded with 500 credits (free tier).
 *
 * Controlled by:
 *   REQUIRE_INVITE_CODE=true  → invite code required (default: on)
 *   REQUIRE_INVITE_CODE=false → open registration
 *
 * The invite code is just the CRON_SECRET — share it with clients you want to let in.
 */
import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { apiError } from "@/lib/api-error";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as {
      email?: string;
      password?: string;
      name?: string;
      inviteCode?: string;
    };

    const { email, password, name, inviteCode } = body;
    if (!email)    return apiError("Email is required", 400);
    if (!password) return apiError("Password is required", 400);
    if (password.length < 8) return apiError("Password must be at least 8 characters", 400);

    // Invite code check
    const requireInvite = process.env.REQUIRE_INVITE_CODE !== "false";
    if (requireInvite) {
      const validCode = process.env.CRON_SECRET;
      if (!inviteCode || inviteCode !== validCode) {
        return apiError("Invalid or missing invite code", 403);
      }
    }

    const existing = await prisma.user.findUnique({ where: { email: email.toLowerCase().trim() } });
    if (existing) return apiError("An account with this email already exists", 409);

    const passwordHash = await bcrypt.hash(password, 12);
    const user = await prisma.user.create({
      data: {
        email: email.toLowerCase().trim(),
        name: name ?? null,
        passwordHash,
        role: "user",
        plan: "free",
      },
      select: { id: true, email: true, name: true, role: true, plan: true },
    });

    // Seed 500 free credits
    await prisma.userCredits.create({
      data: { userId: user.id, balance: 500, lifetimePurchased: 0, lifetimeUsed: 0 },
    });

    return NextResponse.json({ success: true, user }, { status: 201 });
  } catch (err) {
    return apiError(err);
  }
}
