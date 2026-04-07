import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET() {
  const start = Date.now();

  // DB liveness check
  let dbStatus: "ok" | "error" = "ok";
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch {
    dbStatus = "error";
  }

  return NextResponse.json(
    {
      status: dbStatus === "ok" ? "ok" : "degraded",
      db: dbStatus,
      uptime: process.uptime(),
      latencyMs: Date.now() - start,
      timestamp: new Date().toISOString(),
    },
    { status: dbStatus === "ok" ? 200 : 503 }
  );
}
