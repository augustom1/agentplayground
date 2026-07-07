export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /r/<code> — public. Looks up the redirect link, bumps its click count,
// and 307s the visitor to the destination URL. Powers the Redirect app so a
// playground can hand out short codes that jump to a Meet, call, video, or page.
export async function GET(_req: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;

  const link = await prisma.redirectLink.findUnique({
    where: { code },
    select: { id: true, url: true, active: true },
  });

  if (!link || !link.active) {
    return new NextResponse("This link does not exist or has been disabled.", {
      status: 404,
      headers: { "content-type": "text/plain; charset=utf-8" },
    });
  }

  // Fire-and-forget click count — never block the redirect on it.
  prisma.redirectLink.update({ where: { id: link.id }, data: { clicks: { increment: 1 } } }).catch(() => {});

  return NextResponse.redirect(link.url, 307);
}
