export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { apiError } from "@/lib/api-error";
import { seedDefaultPlaygrounds } from "@/lib/seed-playgrounds";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return apiError("Unauthorized", 401);
  try {
    let playgrounds = await prisma.playground.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "asc" },
    });
    if (playgrounds.length === 0) {
      await seedDefaultPlaygrounds(session.user.id).catch(() => {});
      playgrounds = await prisma.playground.findMany({
        where: { userId: session.user.id },
        orderBy: { createdAt: "asc" },
      });
    }
    return NextResponse.json(playgrounds);
  } catch (err) {
    return apiError(err);
  }
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return apiError("Unauthorized", 401);
  try {
    const body = await req.json();
    if (!body.name?.trim()) return apiError("Missing required field: name", 400);
    const playground = await prisma.playground.create({
      data: {
        name: body.name.trim(),
        icon: body.icon ?? null,
        color: body.color ?? null,
        teamIds: body.teamIds ?? [],
        brainTags: body.brainTags ?? [],
        userId: session.user.id,
      },
    });
    return NextResponse.json(playground, { status: 201 });
  } catch (err) {
    return apiError(err);
  }
}
