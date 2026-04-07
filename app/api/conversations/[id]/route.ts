export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiError } from "@/lib/api-error";

type Params = { params: Promise<{ id: string }> };

// GET /api/conversations/:id — get conversation with messages
export async function GET(_req: NextRequest, { params }: Params) {
  try {
    const { id } = await params;
    const conversation = await prisma.chatConversation.findUnique({
      where: { id },
      include: { messages: { orderBy: { createdAt: "asc" } } },
    });
    if (!conversation) {
      return apiError("Conversation not found", 404);
    }
    return NextResponse.json(conversation);
  } catch (err) {
    return apiError(err);
  }
}
