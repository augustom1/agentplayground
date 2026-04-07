export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// GET /api/skills
export async function GET(req: NextRequest) {
  const teamId = req.nextUrl.searchParams.get("teamId");
  const skills = await prisma.skill.findMany({
    where: teamId ? { teamId } : undefined,
    include: { team: { select: { name: true } } },
    orderBy: { name: "asc" },
  });
  return NextResponse.json(skills);
}

// POST /api/skills
export async function POST(req: NextRequest) {
  const body = await req.json();
  const skill = await prisma.skill.create({
    data: {
      name: body.name,
      description: body.description,
      category: body.category ?? "general",
      instructions: body.instructions ?? null,
      examples: body.examples ?? null,
      teamId: body.teamId,
    },
  });
  return NextResponse.json(skill, { status: 201 });
}
