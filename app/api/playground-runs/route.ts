export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiError } from "@/lib/api-error";

// GET /api/playground-runs — last 20 runs
export async function GET() {
  try {
    const runs = await prisma.playgroundRun.findMany({
      orderBy: { createdAt: "desc" },
      take: 20,
    });
    return NextResponse.json(runs);
  } catch (err) {
    return apiError(err);
  }
}

// POST /api/playground-runs — create a run record
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    if (!body.target || !body.prompt || body.result === undefined) {
      return apiError("Missing required fields: target, prompt, result", 400);
    }
    const run = await prisma.playgroundRun.create({
      data: {
        target: body.target,
        prompt: body.prompt,
        result: body.result,
      },
    });
    return NextResponse.json(run, { status: 201 });
  } catch (err) {
    return apiError(err);
  }
}
