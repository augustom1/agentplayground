export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiError } from "@/lib/api-error";

type Params = { params: Promise<{ id: string }> };

// POST /api/conversations/:id/messages — append a message
export async function POST(req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const body = await req.json();
    if (!body.role || !body.content) {
      return apiError("Missing required fields: role, content", 400);
    }
    const message = await prisma.chatMessage.create({
      data: {
        role: body.role,
        content: body.content,
        conversationId: id,
      },
    });
    await prisma.chatConversation.update({
      where: { id },
      data: { updatedAt: new Date() },
    });
    return NextResponse.json(message, { status: 201 });
  } catch (err) {
    return apiError(err);
  }
}
