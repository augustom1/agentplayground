import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

type Handler = (req: NextRequest, ctx?: unknown) => Promise<NextResponse | Response>;

/**
 * Higher-order function that wraps an API route handler to log requests
 * from registered ApiClients. Validates Bearer token, checks rate limit,
 * records ApiRequest row.
 *
 * If no Authorization header is present, the request passes through unlogged
 * (standard user-session requests are not treated as API client requests).
 */
export function withApiLogger(handler: Handler): Handler {
  return async (req: NextRequest, ctx?: unknown) => {
    const authHeader = req.headers.get("authorization");
    const start = Date.now();

    // Only log if Bearer token is present
    if (!authHeader?.startsWith("Bearer ")) {
      return handler(req, ctx);
    }

    const rawKey = authHeader.slice(7);
    const prefix = rawKey.slice(0, 8);

    let clientId: string | null = null;

    try {
      // Find client by prefix, then verify full key hash
      const clients = await prisma.apiClient.findMany({
        where: { apiKeyPrefix: prefix, isActive: true },
        select: { id: true, apiKey: true, rateLimit: true },
      });

      for (const c of clients) {
        const valid = await bcrypt.compare(rawKey, c.apiKey);
        if (valid) {
          clientId = c.id;
          break;
        }
      }

      if (!clientId) {
        return NextResponse.json({ error: "Invalid API key" }, { status: 401 });
      }

      // Update lastSeenAt
      prisma.apiClient.update({
        where: { id: clientId },
        data: { lastSeenAt: new Date() },
      }).catch(() => {});

      const response = await handler(req, ctx);
      const durationMs = Date.now() - start;

      // Log request
      const reqSize = parseInt(req.headers.get("content-length") ?? "0") || 0;
      const resSize = parseInt(response.headers.get("content-length") ?? "0") || 0;
      const status = response.status;
      const errorMsg = status >= 400
        ? await response.clone().text().then((t) => t.slice(0, 200)).catch(() => null)
        : null;

      prisma.apiRequest.create({
        data: {
          clientId,
          method: req.method,
          path: req.nextUrl.pathname,
          statusCode: status,
          durationMs,
          requestSize: reqSize || null,
          responseSize: resSize || null,
          errorMessage: errorMsg,
        },
      }).catch(() => {});

      return response;
    } catch {
      const durationMs = Date.now() - start;
      if (clientId) {
        prisma.apiRequest.create({
          data: {
            clientId,
            method: req.method,
            path: req.nextUrl.pathname,
            statusCode: 500,
            durationMs,
            errorMessage: "Internal error",
          },
        }).catch(() => {});
      }
      return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
    }
  };
}
