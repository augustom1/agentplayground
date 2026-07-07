export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { apiError } from "@/lib/api-error";

const CODE_RE = /^[a-zA-Z0-9-_]{2,40}$/;
const URL_RE = /^(https?:\/\/|mailto:|tel:)/i;

function randomCode(): string {
  return Math.random().toString(36).slice(2, 8);
}

// GET /api/redirect-links — the current user's redirect links
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return apiError("Unauthorized", 401);
  try {
    const links = await prisma.redirectLink.findMany({
      where: { userId: session.user.id },
      select: { id: true, code: true, url: true, label: true, clicks: true, active: true, createdAt: true },
      orderBy: { createdAt: "desc" },
    });
    return NextResponse.json(links);
  } catch (err) {
    return apiError(err);
  }
}

// POST /api/redirect-links — create a link { code?, url, label? }
export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return apiError("Unauthorized", 401);
  try {
    const body = await req.json();
    const url = typeof body.url === "string" ? body.url.trim() : "";
    const label = typeof body.label === "string" ? body.label.trim().slice(0, 80) : null;
    let code = typeof body.code === "string" && body.code.trim() ? body.code.trim() : randomCode();

    if (!URL_RE.test(url)) return apiError("URL must start with http://, https://, mailto:, or tel:", 400);
    if (!CODE_RE.test(code)) return apiError("Code must be 2-40 letters, numbers, - or _", 400);

    // Ensure code uniqueness — auto-suffix on collision (up to a few tries).
    for (let i = 0; i < 5; i++) {
      const existing = await prisma.redirectLink.findUnique({ where: { code }, select: { id: true } });
      if (!existing) break;
      if (body.code) return apiError("That code is already taken", 409);
      code = `${randomCode()}`;
    }

    const link = await prisma.redirectLink.create({
      data: { code, url, label, userId: session.user.id },
      select: { id: true, code: true, url: true, label: true, clicks: true, active: true, createdAt: true },
    });
    return NextResponse.json(link);
  } catch (err) {
    return apiError(err);
  }
}
