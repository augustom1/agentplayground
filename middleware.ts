import NextAuth from "next-auth";
import { authConfig } from "@/auth.config";
import { NextResponse } from "next/server";

const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const { pathname } = req.nextUrl;
  const isLoggedIn = !!req.auth;

  // Always allow: auth callbacks, setup, static assets
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
    pathname.startsWith("/login") ||
    pathname.startsWith("/setup") ||
    pathname.startsWith("/register") ||
    pathname.startsWith("/api/auth/register") ||
    pathname.startsWith("/_next") ||
    pathname === "/favicon.ico";

  if (isPublic) return NextResponse.next();

  // Not logged in — API routes return 401, pages redirect to /login
  if (!isLoggedIn) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("callbackUrl", req.nextUrl.pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Logged in users visiting /login → redirect to dashboard
  if (pathname === "/login") {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  // Role gate: /users and /api/users → admin only
  if (pathname.startsWith("/users") || pathname.startsWith("/api/users")) {
    const role = (req.auth as { user?: { role?: string } })?.user?.role;
    if (role !== "admin") {
      if (pathname.startsWith("/api/")) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
