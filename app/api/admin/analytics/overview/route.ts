export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiError } from "@/lib/api-error";
import { auth } from "@/auth";

async function requireAdmin() {
  const session = await auth();
  if (!session?.user || session.user.role !== "admin") return false;
  return true;
}

// GET /api/admin/analytics/overview?from=&to=
export async function GET(req: NextRequest) {
  if (!await requireAdmin()) return apiError("Forbidden", 403);

  const url = req.nextUrl;
  const from = url.searchParams.get("from")
    ? new Date(url.searchParams.get("from")!)
    : new Date(Date.now() - 7 * 86400_000);
  const to = url.searchParams.get("to")
    ? new Date(url.searchParams.get("to")!)
    : new Date();

  try {
    const [pageViews, events] = await Promise.all([
      prisma.pageView.findMany({
        where: { createdAt: { gte: from, lte: to } },
        select: {
          path: true, referrer: true, sessionId: true, userId: true,
          deviceType: true, browser: true, os: true, country: true,
          durationMs: true, createdAt: true,
        },
      }),
      prisma.analyticsEvent.findMany({
        where: { createdAt: { gte: from, lte: to }, type: "pageview" },
        select: { sessionId: true },
      }),
    ]);

    const totalViews = pageViews.length;
    const uniqueSessions = new Set(pageViews.map((v) => v.sessionId)).size;
    const uniqueUsers = new Set(pageViews.filter((v) => v.userId).map((v) => v.userId)).size;

    // Avg session duration
    const durRows = pageViews.filter((v) => v.durationMs != null);
    const avgDuration = durRows.length
      ? Math.round(durRows.reduce((s, v) => s + v.durationMs!, 0) / durRows.length)
      : 0;

    // Bounce rate — sessions with only 1 pageview
    const sessionViewCount = new Map<string, number>();
    for (const v of pageViews) sessionViewCount.set(v.sessionId, (sessionViewCount.get(v.sessionId) ?? 0) + 1);
    const bounceSessions = [...sessionViewCount.values()].filter((c) => c === 1).length;
    const bounceRate = uniqueSessions > 0 ? Math.round((bounceSessions / uniqueSessions) * 100) : 0;

    // Top pages
    const pageCounts = new Map<string, number>();
    for (const v of pageViews) pageCounts.set(v.path, (pageCounts.get(v.path) ?? 0) + 1);
    const topPages = [...pageCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([path, views]) => ({ path, views }));

    // Referrers
    const refCounts = new Map<string, number>();
    for (const v of pageViews) {
      if (v.referrer) refCounts.set(v.referrer, (refCounts.get(v.referrer) ?? 0) + 1);
    }
    const topReferrers = [...refCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([referrer, views]) => ({ referrer, views }));

    // Device breakdown
    const deviceCounts = { desktop: 0, mobile: 0, tablet: 0 };
    for (const v of pageViews) {
      const dt = v.deviceType as keyof typeof deviceCounts;
      if (dt in deviceCounts) deviceCounts[dt]++;
    }

    // Browser breakdown
    const browserCounts = new Map<string, number>();
    for (const v of pageViews) {
      const b = v.browser ?? "Unknown";
      browserCounts.set(b, (browserCounts.get(b) ?? 0) + 1);
    }
    const browsers = [...browserCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([browser, count]) => ({ browser, count }));

    // Country breakdown
    const countryCounts = new Map<string, number>();
    for (const v of pageViews) {
      const c = v.country ?? "Unknown";
      countryCounts.set(c, (countryCounts.get(c) ?? 0) + 1);
    }
    const countries = [...countryCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([country, count]) => ({ country, count }));

    // Timeseries — group by day
    const dayBuckets = new Map<string, number>();
    for (const v of pageViews) {
      const day = v.createdAt.toISOString().slice(0, 10);
      dayBuckets.set(day, (dayBuckets.get(day) ?? 0) + 1);
    }
    const timeseries = [...dayBuckets.entries()]
      .sort()
      .map(([date, views]) => ({ date, views }));

    return NextResponse.json({
      totalViews, uniqueSessions, uniqueUsers, avgDuration, bounceRate,
      topPages, topReferrers, deviceCounts, browsers, countries, timeseries,
    });
  } catch (err) {
    return apiError(err);
  }
}
