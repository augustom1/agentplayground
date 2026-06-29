import NextAuth from "next-auth";
import { authConfig } from "@/auth.config";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Node.js runtime — required for Prisma (used in the first-run setup check)
export const runtime = "nodejs";

const { auth } = NextAuth(authConfig);

export default auth(async (req) => {
  const { pathname } = req.nextUrl;
  const isLoggedIn = !!req.auth;

  // Always allow: auth callbacks, setup routes, static assets
  const isPublic =
    pathname.startsWith("/api/auth") ||
    pathname.startsWith("/api/health") ||
    pathname.startsWith("/api/cron") ||
    pathname.startsWith("/api/mercadopago") ||
    pathname.startsWith("/api/telegram") ||
    pathname.startsWith("/api/channels") ||
    pathname.startsWith("/api/brain/index") ||  // n8n indexer — secret-header auth
    pathname.startsWith("/api/mcp") ||          // MCP endpoint — API key auth
    pathname.startsWith("/api/brain/push") ||   // Brain push — API key auth (external AIs)
    pathname.startsWith("/api/blog/public") ||  // Public blog feed — no auth
    pathname.startsWith("/api/admin/seed") ||   // Seed endpoint — CRON_SECRET or admin session
    pathname.startsWith("/api/setup") ||        // First-run setup endpoints — self-secured
    pathname.startsWith("/login") ||
    pathname.startsWith("/setup") ||
    pathname.startsWith("/register") ||
    pathname.startsWith("/api/auth/register") ||
    pathname.startsWith("/api/version") ||  // public version endpoint for download page
    pathname.startsWith("/api/public/") ||  // public endpoints (AR chatbot, etc.)
    pathname.startsWith("/_next") ||
    pathname === "/" ||               // marketing homepage — public
    pathname === "/download" ||       // marketing download page — public
    pathname === "/llms.txt" ||
    pathname === "/robots.txt" ||
    pathname === "/sitemap.xml" ||
    pathname === "/favicon.ico";

  if (isPublic) return NextResponse.next();

  // First-run detection: if no setup_complete cookie, count users.
  // Only runs for page routes (not API) — cookie caches the result after first check.
  const setupDone = req.cookies.has("setup_complete");
  if (!setupDone && !pathname.startsWith("/api/")) {
    const count = await prisma.user.count();
    if (count === 0) {
      return NextResponse.redirect(new URL("/setup", req.url));
    }
    // Users exist — fall through and stamp the cookie on the response below
  }

  // Not logged in — API routes return 401, pages redirect to /login
  let res: NextResponse;
  if (!isLoggedIn) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("callbackUrl", req.nextUrl.pathname);
    res = NextResponse.redirect(loginUrl);
  } else if (pathname === "/login") {
    // Logged-in users visiting /login → redirect to dashboard
    res = NextResponse.redirect(new URL("/dashboard", req.url));
  } else if (pathname.startsWith("/users") || pathname.startsWith("/api/users")) {
    // Role gate: /users and /api/users → admin only
    const role = (req.auth as { user?: { role?: string } })?.user?.role;
    if (role !== "admin") {
      if (pathname.startsWith("/api/")) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      res = NextResponse.redirect(new URL("/dashboard", req.url));
    } else {
      res = NextResponse.next();
    }
  } else {
    res = NextResponse.next();
  }

  // Stamp setup_complete cookie so future requests skip the DB count
  if (!setupDone) {
    res.cookies.set("setup_complete", "1", { path: "/", maxAge: 31536000, httpOnly: true, sameSite: "lax" });
  }

  return res;
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
