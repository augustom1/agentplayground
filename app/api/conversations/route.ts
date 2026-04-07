export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiError } from "@/lib/api-error";

// GET /api/conversations — list recent conversations
export async function GET() {
  try {
    const conversations = await prisma.chatConversation.findMany({
      orderBy: { updatedAt: "desc" },
      take: 20,
      include: { _count: { select: { messages: true } } },
    });
    return NextResponse.json(conversations);
  } catch (err) {
    return apiError(err);
  }
}

// POST /api/conversations — create a new conversation
export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const conversation = await prisma.chatConversation.create({
      data: { title: body.title ?? null },
    });
    return NextResponse.json(conversation, { status: 201 });
  } catch (err) {
    return apiError(err);
  }
}
