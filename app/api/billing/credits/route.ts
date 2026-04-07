/**
 * POST /api/billing/credits — Add credits to a user's wallet (admin only).
 * Will be replaced by Stripe webhook in production.
 */
export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { apiError } from "@/lib/api-error";
import { addCredits } from "@/lib/usage-tracker";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (session.user.role !== "admin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json() as {
      userId: string;
      amount: number;
      source?: "purchase" | "monthly_reset" | "admin_grant";
    };

    if (!body.userId || !body.amount || body.amount <= 0) {
      return NextResponse.json(
        { error: "userId and amount (>0) are required" },
        { status: 400 }
      );
    }

    const newBalance = await addCredits(
      body.userId,
      body.amount,
      body.source ?? "admin_grant"
    );

    return NextResponse.json({ success: true, newBalance });
  } catch (err) {
    return apiError(err);
  }
}
