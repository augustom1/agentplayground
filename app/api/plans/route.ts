export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { buildPlan } from "@/lib/planner/builder";

export async function GET() {
  const plans = await prisma.plan.findMany({
    orderBy: { createdAt: "desc" },
    include: {
      tasks: {
        select: { id: true, title: true, status: true, teamId: true },
      },
    },
    take: 50,
  });
  return NextResponse.json(plans);
}

export async function POST(req: NextRequest) {
  const body = (await req.json()) as { goal?: string; title?: string };

  if (!body.goal && !body.title) {
    return NextResponse.json({ error: "goal or title is required" }, { status: 400 });
  }

  try {
    const planId = await buildPlan(body.goal || body.title!);
    return NextResponse.json({ planId, status: "PENDING_APPROVAL" });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
