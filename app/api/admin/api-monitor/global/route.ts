export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiError } from "@/lib/api-error";
import { auth } from "@/auth";

// GET /api/admin/api-monitor/global?from=&to=
export async function GET(req: NextRequest) {
  const session = await auth();
  if (session?.user?.role !== "admin") return apiError("Forbidden", 403);

  const url = req.nextUrl;
  const from = url.searchParams.get("from")
    ? new Date(url.searchParams.get("from")!)
    : new Date(Date.now() - 24 * 3600_000);
  const to = url.searchParams.get("to") ? new Date(url.searchParams.get("to")!) : new Date();

  try {
    const [requests, activeClients] = await Promise.all([
      prisma.apiRequest.findMany({
        where: { createdAt: { gte: from, lte: to } },
        select: { statusCode: true, durationMs: true },
      }),
      prisma.apiClient.count({ where: { isActive: true } }),
    ]);

    const total = requests.length;
    const errors = requests.filter((r) => r.statusCode >= 400).length;
    const errorRate = total > 0 ? Math.round((errors / total) * 100) : 0;
    const avgLatency = total > 0
      ? Math.round(requests.reduce((s, r) => s + r.durationMs, 0) / total)
      : 0;

    return NextResponse.json({ total, errorRate, avgLatency, activeClients });
  } catch (err) {
    return apiError(err);
  }
}
