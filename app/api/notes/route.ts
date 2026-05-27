export const dynamic = "force-dynamic";
import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { apiError } from "@/lib/api-error";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const session = await auth();
  if (!session?.user?.id) return apiError("Unauthorized", 401);

  const notes = await prisma.userNote.findMany({
    where: { userId: session.user.id },
    select: { id: true, title: true, content: true, category: true, inBrain: true, createdAt: true },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json(notes);
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user?.id) return apiError("Unauthorized", 401);

  const body = await req.json() as { title?: string; content?: string; category?: string };
  const { title, content, category = "personal" } = body;

  if (!title?.trim() || !content?.trim()) return apiError("title and content required", 400);

  const note = await prisma.userNote.create({
    data: { userId: session.user.id, title: title.trim(), content: content.trim(), category },
    select: { id: true, title: true, content: true, category: true, inBrain: true, createdAt: true },
  });

  return NextResponse.json(note, { status: 201 });
}
