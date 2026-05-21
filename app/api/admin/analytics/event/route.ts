export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { parseUA, anonymizeIp, getCountry } from "@/lib/analytics";

// Rate limiting — Redis when available, in-memory fallback
const ipCounts = new Map<string, { count: number; reset: number }>();
const RATE_LIMIT = 100;
const WINDOW_MS = 60_000;

function checkRateLimit(ip: string): boolean {
  const now = Date.now();
  const entry = ipCounts.get(ip);
  if (!entry || now > entry.reset) {
    ipCounts.set(ip, { count: 1, reset: now + WINDOW_MS });
    return true;
  }
  if (entry.count >= RATE_LIMIT) return false;
  entry.count++;
  return true;
}

// POST /api/admin/analytics/event — public beacon receiver
export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";

    if (!checkRateLimit(ip)) {
      return NextResponse.json({ error: "Rate limited" }, { status: 429 });
    }

    const body = await req.json().catch(() => null);
    if (!body?.type || !body?.path || !body?.sessionId) {
      return NextResponse.json({ ok: false }, { status: 400 });
    }

    const ua = req.headers.get("user-agent") ?? "";
    const { deviceType, browser, os } = parseUA(ua);
    const country = getCountry(req);
    const anonIp = anonymizeIp(ip);

    if (body.type === "pageview") {
      await prisma.pageView.create({
        data: {
          path: body.path,
          referrer: body.referrer ?? null,
          userAgent: ua,
          ip: anonIp,
          country,
          deviceType,
          browser,
          os,
          sessionId: body.sessionId,
          userId: body.userId ?? null,
        },
      });
    } else {
      await prisma.analyticsEvent.create({
        data: {
          sessionId: body.sessionId,
          userId: body.userId ?? null,
          type: body.type,
          path: body.path,
          properties: body.properties ?? {},
        },
      });

      // Update durationMs on existing PageView if this is a duration event
      if (body.type === "duration" && body.durationMs) {
        await prisma.pageView.updateMany({
          where: { sessionId: body.sessionId, durationMs: null },
          data: { durationMs: Math.round(body.durationMs) },
        });
      }
    }

    return NextResponse.json({ ok: true });
  } catch {
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
