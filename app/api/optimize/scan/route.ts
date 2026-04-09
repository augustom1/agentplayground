export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { runWeeklyOptimizationScan } from "@/lib/optimizer/scanner";
import { auth } from "@/auth";
import { apiError } from "@/lib/api-error";

// POST /api/optimize/scan
// Triggers the weekly optimization scan.
// Accessible via CRON_SECRET bearer token OR admin session.
export async function POST(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = req.headers.get("authorization");

  const isFromCron = cronSecret && authHeader === `Bearer ${cronSecret}`;

  if (!isFromCron) {
    const session = await auth();
    const role = (session?.user as { role?: string })?.role;
    if (role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  try {
    const result = await runWeeklyOptimizationScan();
    return NextResponse.json({
      success: true,
      weekStart: result.weekStart,
      weekEnd: result.weekEnd,
      apiCallsTotal: result.apiCallsTotal,
      localCallsTotal: result.localCallsTotal,
      creditsSpent: result.creditsSpent,
      creditsSaved: result.creditsSaved,
      protocolsCreated: result.protocolsCreated,
      recommendations: result.recommendations.length,
    });
  } catch (err) {
    return apiError(err);
  }
}
