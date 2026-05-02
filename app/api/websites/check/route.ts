/**
 * GET /api/websites/check?url=https://example.com
 * Pings a URL and returns { ok, status, latencyMs, checkedAt }
 */
export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = req.nextUrl.searchParams.get("url");
  if (!url) return NextResponse.json({ error: "url required" }, { status: 400 });

  // Basic URL validation
  let parsed: URL;
  try {
    parsed = new URL(url);
    if (!["http:", "https:"].includes(parsed.protocol)) {
      return NextResponse.json({ error: "Only http/https allowed" }, { status: 400 });
    }
  } catch {
    return NextResponse.json({ error: "Invalid URL" }, { status: 400 });
  }

  const start = Date.now();
  try {
    const res = await fetch(parsed.toString(), {
      method: "HEAD",
      signal: AbortSignal.timeout(8000),
      redirect: "follow",
    });
    const latencyMs = Date.now() - start;
    return NextResponse.json({
      ok: res.ok || res.status < 400,
      status: res.status,
      latencyMs,
      checkedAt: new Date().toISOString(),
    });
  } catch (err) {
    const latencyMs = Date.now() - start;
    return NextResponse.json({
      ok: false,
      status: null,
      latencyMs,
      checkedAt: new Date().toISOString(),
      error: err instanceof Error ? err.message : "Request failed",
    });
  }
}
