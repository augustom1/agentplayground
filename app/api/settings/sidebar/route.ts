export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { apiError } from "@/lib/api-error";
import { resolveSidebarLayout } from "@/lib/sidebar-registry";

// GET /api/settings/sidebar — the user's Chat-tab sidebar layout (merged with defaults)
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return apiError("Unauthorized", 401);
  try {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { sidebarLayout: true },
    });
    return NextResponse.json(resolveSidebarLayout(user?.sidebarLayout));
  } catch (err) {
    return apiError(err);
  }
}

// PATCH /api/settings/sidebar — save the layout. Body is a full/partial layout;
// it is sanitized against the registry (unknown ids dropped) before persisting.
export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return apiError("Unauthorized", 401);
  try {
    const body = await req.json();
    const layout = resolveSidebarLayout(body);
    await prisma.user.update({
      where: { id: session.user.id },
      data: { sidebarLayout: layout },
    });
    return NextResponse.json(layout);
  } catch (err) {
    return apiError(err);
  }
}
