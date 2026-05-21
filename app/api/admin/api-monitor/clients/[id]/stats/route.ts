export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiError } from "@/lib/api-error";
import { auth } from "@/auth";

type Params = { params: Promise<{ id: string }> };

// GET /api/admin/api-monitor/clients/[id]/stats?from=&to=
export async function GET(req: NextRequest, { params }: Params) {
  const session = await auth();
  if (session?.user?.role !== "admin") return apiError("Forbidden", 403);
  const { id } = await params;

  const url = req.nextUrl;
  const from = url.searchParams.get("from")
    ? new Date(url.searchParams.get("from")!)
    : new Date(Date.now() - 24 * 3600_000);
  const to = url.searchParams.get("to") ? new Date(url.searchParams.get("to")!) : new Date();

  try {
    const requests = await prisma.apiRequest.findMany({
      where: { clientId: id, createdAt: { gte: from, lte: to } },
      orderBy: { createdAt: "asc" },
    });

    const total = requests.length;
    const errors = requests.filter((r) => r.statusCode >= 400);
    const errorRate = total > 0 ? Math.round((errors.length / total) * 100) : 0;
    const avgLatency = total > 0
      ? Math.round(requests.reduce((s, r) => s + r.durationMs, 0) / total)
      : 0;

    // Status breakdown
    const statusBreakdown = { "2xx": 0, "4xx": 0, "5xx": 0 };
    for (const r of requests) {
      if (r.statusCode < 400) statusBreakdown["2xx"]++;
      else if (r.statusCode < 500) statusBreakdown["4xx"]++;
      else statusBreakdown["5xx"]++;
    }

    // Top endpoints
    const endpointStats = new Map<string, { count: number; totalMs: number; errors: number }>();
    for (const r of requests) {
      const key = `${r.method} ${r.path}`;
      const e = endpointStats.get(key) ?? { count: 0, totalMs: 0, errors: 0 };
      e.count++;
      e.totalMs += r.durationMs;
      if (r.statusCode >= 400) e.errors++;
      endpointStats.set(key, e);
    }
    const topEndpoints = [...endpointStats.entries()]
      .sort((a, b) => b[1].count - a[1].count)
      .slice(0, 10)
      .map(([endpoint, s]) => ({
        endpoint,
        count: s.count,
        avgMs: Math.round(s.totalMs / s.count),
        errors: s.errors,
      }));

    // Recent errors
    const recentErrors = errors
      .slice(-20)
      .reverse()
      .map((r) => ({
        path: r.path,
        statusCode: r.statusCode,
        errorMessage: r.errorMessage,
        createdAt: r.createdAt,
      }));

    // Timeseries — bucket by hour
    const hourBuckets = new Map<string, number>();
    for (const r of requests) {
      const h = r.createdAt.toISOString().slice(0, 13);
      hourBuckets.set(h, (hourBuckets.get(h) ?? 0) + 1);
    }
    const timeseries = [...hourBuckets.entries()]
      .sort()
      .map(([hour, count]) => ({ hour, count }));

    return NextResponse.json({
      total, errorRate, avgLatency, statusBreakdown, topEndpoints, recentErrors, timeseries,
    });
  } catch (err) {
    return apiError(err);
  }
}
