/**
 * POST /api/admin/seed
 *
 * Seeds default teams + agents + skills into the database.
 * Idempotent — safe to run multiple times.
 *
 * Auth: Authorization: Bearer <CRON_SECRET>  OR  admin session
 * Called by setup.sh after first deploy to populate the app on first login.
 */
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { seedDefaults } from "@/lib/seed-defaults";
import { seedTeams } from "@/lib/seed-teams";

export async function POST(req: NextRequest) {
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = req.headers.get("authorization");

  // Allow CRON_SECRET bearer (for setup.sh) or admin session
  if (cronSecret && authHeader === `Bearer ${cronSecret}`) {
    // Authorized via secret
  } else {
    const session = await auth();
    const role = (session?.user as { role?: string } | undefined)?.role;
    if (!session?.user || role !== "admin") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
  }

  try {
    await seedDefaults();
    await seedTeams();
    return NextResponse.json({ ok: true, message: "Seeded successfully" });
  } catch (err) {
    console.error("[seed] Error:", err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Seed failed" },
      { status: 500 }
    );
  }
}
