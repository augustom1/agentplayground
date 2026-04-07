export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/cli-functions
export async function GET(req: NextRequest) {
  const teamId = req.nextUrl.searchParams.get("teamId");
  const fns = await prisma.cliFunction.findMany({
    where: teamId ? { teamId } : undefined,
    include: { team: { select: { name: true } } },
    orderBy: { name: "asc" },
  });
  return NextResponse.json(fns);
}

// POST /api/cli-functions
export async function POST(req: NextRequest) {
  const body = await req.json();
  const fn = await prisma.cliFunction.create({
    data: {
      name: body.name,
      command: body.command,
      description: body.description ?? null,
      args: body.args ?? null,
      dangerous: body.dangerous ?? false,
      teamId: body.teamId,
    },
  });
  return NextResponse.json(fn, { status: 201 });
}
