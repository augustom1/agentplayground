import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { apiError } from "@/lib/api-error";

export const dynamic = "force-dynamic";

// Cheap key-validation ping used by the setup wizard. Public only while no
// users exist (first-run wizard runs before account creation); afterwards it
// requires a session, same as the rest of /api/setup.
const ENDPOINTS: Record<string, { url: string; headers: (key: string) => Record<string, string> }> = {
  anthropic: {
    url: "https://api.anthropic.com/v1/models",
    headers: (key) => ({ "x-api-key": key, "anthropic-version": "2023-06-01" }),
  },
  openai: {
    url: "https://api.openai.com/v1/models",
    headers: (key) => ({ Authorization: `Bearer ${key}` }),
  },
  nvidia: {
    url: "https://integrate.api.nvidia.com/v1/models",
    headers: (key) => ({ Authorization: `Bearer ${key}` }),
  },
};

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      const userCount = await prisma.user.count();
      if (userCount > 0) return apiError("Unauthorized", 401);
    }

    const body = await req.json() as { provider?: string; key?: string };
    const provider = body.provider ?? "";
    const key = body.key?.trim() ?? "";

    const endpoint = ENDPOINTS[provider];
    if (!endpoint) return apiError("Unknown provider", 400);
    if (!key) return NextResponse.json({ valid: false, error: "Empty key" });

    try {
      const res = await fetch(endpoint.url, {
        headers: endpoint.headers(key),
        signal: AbortSignal.timeout(8000),
      });
      // 401/403 = bad key (NVIDIA returns 403 for invalid keys). Other statuses
      // (rate limit, transient 5xx) don't prove anything — treat as valid.
      const valid = res.status !== 401 && res.status !== 403;
      return NextResponse.json({ valid });
    } catch {
      // Provider unreachable — never block setup on the ping
      return NextResponse.json({ valid: true, unverified: true });
    }
  } catch (err) {
    return apiError(err);
  }
}
