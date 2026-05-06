import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const limit = Math.min(parseInt(req.nextUrl.searchParams.get("limit") || "50"), 200);
  const offset = parseInt(req.nextUrl.searchParams.get("offset") || "0");
  const tag = req.nextUrl.searchParams.get("tag") || undefined;
  const folder = req.nextUrl.searchParams.get("folder") || undefined;

  const where = {
    ...(tag ? { tags: { has: tag } } : {}),
    ...(folder ? { path: { startsWith: folder.replace(/\/$/, "") + "/" } } : {}),
  };

  const [notes, total] = await Promise.all([
    prisma.vaultNote.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      take: limit,
      skip: offset,
      select: { path: true, title: true, tags: true, updatedAt: true, content: true },
    }),
    prisma.vaultNote.count({ where }),
  ]);

  return NextResponse.json({ notes, total, limit, offset });
}
