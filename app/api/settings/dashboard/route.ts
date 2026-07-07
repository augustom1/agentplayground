export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { apiError } from "@/lib/api-error";
import { OVERVIEW_WIDGETS, DEFAULT_OVERVIEW_WIDGETS, sanitizeIds } from "@/lib/widget-registry";

// GET /api/settings/dashboard — the user's Overview dashboard widget layout
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return apiError("Unauthorized", 401);
  try {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { dashboardLayout: true },
    });
    const widgets = sanitizeIds(user?.dashboardLayout, OVERVIEW_WIDGETS) ?? DEFAULT_OVERVIEW_WIDGETS;
    return NextResponse.json({ widgets });
  } catch (err) {
    return apiError(err);
  }
}

// PATCH /api/settings/dashboard — save widget layout { widgets: string[] }
export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return apiError("Unauthorized", 401);
  try {
    const body = await req.json();
    const widgets = sanitizeIds(body.widgets, OVERVIEW_WIDGETS);
    if (widgets === null) return apiError("widgets must be an array of widget ids", 400);
    await prisma.user.update({
      where: { id: session.user.id },
      data: { dashboardLayout: widgets },
    });
    return NextResponse.json({ widgets });
  } catch (err) {
    return apiError(err);
  }
}
