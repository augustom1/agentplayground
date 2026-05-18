export const dynamic = "force-dynamic";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { apiError } from "@/lib/api-error";

type Params = { params: Promise<{ id: string }> };

// PATCH /api/agents/:id — update agent fields
export async function PATCH(req: NextRequest, { params }: Params) {
  const { id } = await params;
  try {
    const body = await req.json();
    const agent = await prisma.agent.update({
      where: { id },
      data: {
        ...(body.name !== undefined && { name: body.name }),
        ...(body.description !== undefined && { description: body.description ?? null }),
        ...(body.model !== undefined && { model: body.model }),
        ...(body.systemPrompt !== undefined && { systemPrompt: body.systemPrompt ?? null }),
        ...(body.capabilities !== undefined && { capabilities: body.capabilities }),
        ...(body.temperature !== undefined && { temperature: body.temperature }),
        ...(body.maxTokens !== undefined && { maxTokens: body.maxTokens }),
      },
    });
    return NextResponse.json(agent);
  } catch (err) {
    return apiError(err);
  }
}

// DELETE /api/agents/:id — remove an agent
export async function DELETE(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  try {
    await prisma.agent.delete({ where: { id } });
    return NextResponse.json({ deleted: true });
  } catch (err) {
    return apiError(err);
  }
}
