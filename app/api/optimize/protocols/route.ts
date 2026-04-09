export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { apiError } from "@/lib/api-error";

// GET /api/optimize/protocols — list protocols + recent scans
export async function GET() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const [protocols, scans] = await Promise.all([
      prisma.taskProtocol.findMany({
        orderBy: [{ successCount: "desc" }, { createdAt: "desc" }],
      }),
      prisma.optimizationScan.findMany({
        orderBy: { createdAt: "desc" },
        take: 8,
        select: {
          id: true,
          weekStart: true,
          weekEnd: true,
          apiCallsTotal: true,
          localCallsTotal: true,
          creditsSpent: true,
          creditsSaved: true,
          protocolsCreated: true,
          report: true,
          recommendations: true,
          createdAt: true,
        },
      }),
    ]);

    return NextResponse.json({ protocols, scans });
  } catch (err) {
    return apiError(err);
  }
}

// PATCH /api/optimize/protocols — toggle active state or update confidence
export async function PATCH(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = (await req.json()) as { id: string; active?: boolean; successCount?: number };
    const updated = await prisma.taskProtocol.update({
      where: { id: body.id },
      data: {
        ...(body.active !== undefined && { active: body.active }),
        ...(body.successCount !== undefined && { successCount: body.successCount }),
      },
    });
    return NextResponse.json(updated);
  } catch (err) {
    return apiError(err);
  }
}

// DELETE /api/optimize/protocols — remove a protocol
export async function DELETE(req: NextRequest) {
  const session = await auth();
  const role = (session?.user as { role?: string })?.role;
  if (role !== "admin") {
    return NextResponse.json({ error: "Admin only" }, { status: 403 });
  }

  try {
    const { id } = (await req.json()) as { id: string };
    await prisma.taskProtocol.delete({ where: { id } });
    return NextResponse.json({ deleted: true });
  } catch (err) {
    return apiError(err);
  }
}
