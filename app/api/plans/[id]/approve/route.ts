export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const body = (await req.json()) as {
    action: "approve" | "reject" | "request_changes";
    reason?: string;
  };

  const plan = await prisma.plan.findUnique({ where: { id } });
  if (!plan) return NextResponse.json({ error: "Not found" }, { status: 404 });

  if (body.action === "approve") {
    await prisma.plan.update({
      where: { id },
      data: { status: "APPROVED", approvedAt: new Date() },
    });
    // Fire-and-forget dispatch
    const { dispatchPlan } = await import("@/lib/planner/dispatch");
    void dispatchPlan(id).catch(console.error);
    return NextResponse.json({ success: true, status: "RUNNING" });
  }

  if (body.action === "reject") {
    await prisma.plan.update({
      where: { id },
      data: {
        status: "REJECTED",
        rejectedAt: new Date(),
        rejectionReason: body.reason ?? null,
      },
    });
    return NextResponse.json({ success: true, status: "REJECTED" });
  }

  if (body.action === "request_changes") {
    const existing = plan.councilNotes ?? "";
    await prisma.plan.update({
      where: { id },
      data: {
        councilNotes: body.reason
          ? `${existing}\n\n--- User feedback ---\n${body.reason}`
          : existing,
      },
    });
    return NextResponse.json({ success: true, status: "PENDING_APPROVAL" });
  }

  return NextResponse.json({ error: "Invalid action" }, { status: 400 });
}
